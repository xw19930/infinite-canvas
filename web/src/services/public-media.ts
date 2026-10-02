import { MEDIA_UPLOAD_URL } from "@/constant/runtime-config";

export type PublicImageUpload = { key: string; publicUrl: string };

export function validatePublicImageUrl(value: string) {
    const normalized = value.trim();
    let url: URL;
    try {
        url = new URL(normalized);
    } catch {
        throw new Error("Invalid image URL");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP(S) image URLs are supported");
    return url.toString();
}

export function parsePublicImageUrls(value: string, maxCount = 30) {
    const urls: string[] = [];
    const invalid: string[] = [];
    const limit = Math.max(0, Math.floor(maxCount));
    let truncated = false;

    for (const line of value.split(/\r?\n/)) {
        const candidate = line.trim();
        if (!candidate) continue;
        if (urls.length >= limit) {
            truncated = true;
            break;
        }
        try {
            urls.push(validatePublicImageUrl(candidate));
        } catch {
            invalid.push(candidate);
        }
    }

    return { urls, invalid, truncated };
}

export async function uploadImageToWorker(blob: Blob, fileName = "reference-image", uploadUrl: string = MEDIA_UPLOAD_URL, fetchImpl: typeof fetch = fetch): Promise<PublicImageUpload> {
    const baseUrl = uploadUrl.trim().replace(/\/+$/, "");
    if (!baseUrl) throw new Error("Public media upload is not configured");
    const response = await fetchImpl(`${baseUrl}/upload`, {
        method: "POST",
        headers: {
            "Content-Type": blob.type || "application/octet-stream",
            "X-File-Name": fileName,
            "X-File-Type": blob.type || "application/octet-stream",
        },
        body: blob,
    });
    if (!response.ok) throw new Error(`Public media upload failed (${response.status})`);
    const payload = (await response.json()) as Partial<PublicImageUpload>;
    if (!payload.key || !payload.publicUrl) throw new Error("Public media upload returned an invalid response");
    return { key: payload.key, publicUrl: validatePublicImageUrl(payload.publicUrl) };
}
