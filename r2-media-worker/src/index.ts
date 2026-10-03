export type R2BucketLike = {
    put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<void>;
    get(key: string): Promise<{ body: ReadableStream | null; httpMetadata?: { contentType?: string }; etag?: string } | null>;
};

export type MediaWorkerEnv = {
    MEDIA_BUCKET: R2BucketLike;
    PUBLIC_BASE_URL?: string;
    MAX_UPLOAD_BYTES?: string;
};

const DEFAULT_MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

export async function fetch(request: Request, env: MediaWorkerEnv): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });

    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/upload") return upload(request, env);
    if (request.method === "GET" && url.pathname.startsWith("/media/")) return readMedia(url.pathname.slice("/media/".length), env);
    return json({ error: "Not found" }, 404);
}

async function upload(request: Request, env: MediaWorkerEnv) {
    const contentType = request.headers.get("x-file-type") || request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) return json({ error: "Only image uploads are supported" }, 415);

    const bytes = await request.arrayBuffer();
    const maxBytes = Number(env.MAX_UPLOAD_BYTES) || DEFAULT_MAX_UPLOAD_BYTES;
    if (!bytes.byteLength) return json({ error: "Empty upload" }, 400);
    if (bytes.byteLength > maxBytes) return json({ error: "Image is too large" }, 413);

    const extension = extensionFor(contentType);
    const now = new Date();
    const key = `images/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${extension}`;
    await env.MEDIA_BUCKET.put(key, bytes, { httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" } });

    const baseUrl = (env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/+$/, "");
    return json({ key, publicUrl: `${baseUrl}/media/${key.split("/").map(encodeURIComponent).join("/")}` }, 201);
}

async function readMedia(rawKey: string, env: MediaWorkerEnv) {
    const key = rawKey
        .split("/")
        .map((segment) => decodeURIComponent(segment))
        .join("/");
    if (!key || key.includes("..")) return json({ error: "Not found" }, 404);

    const object = await env.MEDIA_BUCKET.get(key);
    if (!object?.body) return json({ error: "Not found" }, 404);

    const headers = corsHeaders({
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
    });
    if (object.etag) headers.set("ETag", object.etag);
    return new Response(object.body, { status: 200, headers });
}

function extensionFor(contentType: string) {
    const subtype = contentType.split("/", 2)[1]?.split(";", 1)[0]?.toLowerCase() || "png";
    return ({ jpeg: "jpg", jpg: "jpg", png: "png", webp: "webp", gif: "gif", avif: "avif", "svg+xml": "svg" } as Record<string, string>)[subtype] || "img";
}

function corsHeaders(extra: Record<string, string> = {}) {
    return new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-File-Name, X-File-Type",
        ...extra,
    });
}

function json(value: unknown, status = 200) {
    return new Response(JSON.stringify(value), { status, headers: corsHeaders({ "Content-Type": "application/json; charset=utf-8" }) });
}

export default { fetch };

