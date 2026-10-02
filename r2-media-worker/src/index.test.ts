import { describe, expect, test } from "bun:test";

import { fetch } from "./index";

class MemoryBucket {
    private objects = new Map<string, { bytes: ArrayBuffer; contentType: string }>();

    async put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }) {
        this.objects.set(key, { bytes: value, contentType: options?.httpMetadata?.contentType || "application/octet-stream" });
    }

    async get(key: string) {
        const value = this.objects.get(key);
        if (!value) return null;
        return { body: new Response(value.bytes).body, httpMetadata: { contentType: value.contentType }, etag: "etag-test" };
    }
}

function env(bucket = new MemoryBucket()) {
    return { MEDIA_BUCKET: bucket, PUBLIC_BASE_URL: "https://media.example.com" };
}

describe("R2 media worker", () => {
    test("handles CORS preflight", async () => {
        const response = await fetch(new Request("https://worker.example.com/upload", { method: "OPTIONS" }), env());

        expect(response.status).toBe(204);
        expect(response.headers.get("access-control-allow-methods")).toContain("POST");
    });

    test("uploads an image and returns a public URL", async () => {
        const response = await fetch(new Request("https://worker.example.com/upload", { method: "POST", headers: { "Content-Type": "image/png" }, body: new Uint8Array([1, 2, 3]) }), env());
        const payload = await response.json();

        expect(response.status).toBe(201);
        expect(payload.key).toMatch(/^images\/\d{4}\/\d{2}\/.+\.png$/);
        expect(payload.publicUrl).toMatch(/^https:\/\/media\.example\.com\/media\//);
    });

    test("rejects non-image uploads", async () => {
        const response = await fetch(new Request("https://worker.example.com/upload", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "hello" }), env());

        expect(response.status).toBe(415);
    });

    test("serves an uploaded image from the public media path", async () => {
        const bucket = new MemoryBucket();
        const upload = await fetch(new Request("https://worker.example.com/upload", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: new Uint8Array([9, 8]) }), env(bucket));
        const { key } = await upload.json();
        const response = await fetch(new Request(`https://worker.example.com/media/${key}`), env(bucket));

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("image/jpeg");
        expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([9, 8]));
    });

    test("returns 404 for a missing object", async () => {
        const response = await fetch(new Request("https://worker.example.com/media/images/missing.png"), env());

        expect(response.status).toBe(404);
    });
});
