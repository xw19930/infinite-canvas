import { describe, expect, test } from "bun:test";

import { appendVideoAspectRatioField, appendVideoResolutionFields, buildDolaVideoRequestBody, buildPublicUrlVideoRequestBody, publicReferenceImageUrls } from "@/lib/video-request";
import { VIDEO_TASK_TIMEOUT_MS } from "@/lib/video-generation";

describe("OpenAI-compatible video fields", () => {
    test("sends both resolution names for providers with either spelling", () => {
        const form = new FormData();
        appendVideoResolutionFields(form, "720p");
        expect(form.get("resolution")).toBe("720p");
        expect(form.get("resolution_name")).toBe("720p");
    });

    test("sends aspect ratio for providers that require it", () => {
        const form = new FormData();
        appendVideoAspectRatioField(form, "16:9");
        expect(form.get("aspect_ratio")).toBe("16:9");
    });

    test("builds the Dola URL request with duration, resolution, vertical size, and explicit reference tags", () => {
        expect(buildDolaVideoRequestBody({
            model: "dola-seedance-2.5",
            prompt: "camera push in",
            duration: "6",
            size: "720x1280",
            resolution: "720p",
            imageUrls: ["https://cdn.example.com/ref-a.png", "https://cdn.example.com/ref-b.png"],
        })).toEqual({
            model: "dola-seedance-2.5",
            prompt: "camera push in\n\u8bf7\u6309\u987a\u5e8f\u53c2\u8003\u56fe\u7247\uff1a@\u56fe1\u3001@\u56fe2\u3002",
            duration: 6,
            size: "720x1280",
            resolution: "720p",
            images: ["https://cdn.example.com/ref-a.png", "https://cdn.example.com/ref-b.png"],
        });
    });

    test("does not duplicate Dola reference tags already present in the storyboard prompt", () => {
        expect(buildDolaVideoRequestBody({
            model: "dola-seedance-2.5",
            prompt: "\u955c\u5934\u8ddf\u968f @\u56fe1",
            duration: "6",
            size: "720x1280",
            resolution: "720p",
            imageUrls: ["https://cdn.example.com/ref-a.png", "https://cdn.example.com/ref-b.png"],
        }).prompt).toBe("\u955c\u5934\u8ddf\u968f @\u56fe1\n\u8bf7\u6309\u987a\u5e8f\u53c2\u8003\u56fe\u7247\uff1a@\u56fe2\u3002");
    });

    test("builds a public URL JSON request for URL-only video providers", () => {
        expect(buildPublicUrlVideoRequestBody({
            model: "dola-seedance-2.5",
            prompt: "camera push in",
            seconds: "6",
            size: "1280x720",
            resolution: "720p",
            aspectRatio: "16:9",
            generateAudio: true,
            watermark: false,
            mode: "reference",
            imageUrls: ["https://cdn.example.com/ref.png"],
        })).toEqual({
            model: "dola-seedance-2.5",
            prompt: "camera push in",
            seconds: "6",
            size: "1280x720",
            resolution: "720p",
            aspect_ratio: "16:9",
            generate_audio: true,
            watermark: false,
            mode: "reference",
            images: ["https://cdn.example.com/ref.png"],
        });
    });
});

test("recognizes Dola models before custom scripts can override their URL-only contract", async () => {
    const { isDolaVideoModel } = await import("@/lib/video-request");
    expect(isDolaVideoModel("dola-seedance-2.5")).toBe(true);
    expect(isDolaVideoModel("dola::dola-seedance-2.5")).toBe(true);
    expect(isDolaVideoModel("other-video-model")).toBe(false);
});


test("extracts public reference URLs without reading the image bytes", () => {
    expect(publicReferenceImageUrls([
        { publicUrl: "https://cdn.example.com/a.jpg", url: "blob:http://local/a" },
        { url: "https://cdn.example.com/b.jpg" },
    ])).toEqual(["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"]);
    expect(publicReferenceImageUrls([{ dataUrl: "data:image/png;base64,abc" }])).toBeNull();
});

test("keeps video tasks alive for 120 minutes", () => {
    expect(VIDEO_TASK_TIMEOUT_MS).toBe(120 * 60 * 1000);
});
