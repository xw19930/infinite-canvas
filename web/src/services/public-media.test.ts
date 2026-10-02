import { describe, expect, test } from "bun:test";

import { parsePublicImageUrls, uploadImageToWorker, validatePublicImageUrl } from "./public-media";

describe("public media helpers", () => {
    test("accepts normalized HTTP image URLs", () => {
        expect(validatePublicImageUrl(" https://cdn.example.com/image.png ")).toBe("https://cdn.example.com/image.png");
        expect(validatePublicImageUrl("http://cdn.example.com/image.png")).toBe("http://cdn.example.com/image.png");
    });

    test("rejects unsafe and malformed URL protocols", () => {
        for (const value of ["javascript:alert(1)", "data:image/png;base64,abc", "blob:https://example.com/id", "file:///image.png", "/image.png", "not a URL"]) {
            expect(() => validatePublicImageUrl(value)).toThrow();
        }
    });

    test("uploads binary image content and returns the worker result", async () => {
        let requestBody: BodyInit | null | undefined;
        let requestType = "";
        const response = await uploadImageToWorker(new Blob([new Uint8Array([1, 2])], { type: "image/png" }), "ref.png", "https://worker.example.com/", async (input, init) => {
            expect(input).toBe("https://worker.example.com/upload");
            requestBody = init?.body;
            requestType = new Headers(init?.headers).get("content-type") || "";
            return Response.json({ key: "images/test.png", publicUrl: "https://media.example.com/media/images/test.png" }, { status: 201 });
        });

        expect(requestType).toBe("image/png");
        expect(requestBody).toBeInstanceOf(Blob);
        expect(response.key).toBe("images/test.png");
        expect(response.publicUrl).toBe("https://media.example.com/media/images/test.png");
    });

    test("rejects incomplete or non-public worker responses", async () => {
        await expect(uploadImageToWorker(new Blob(["x"], { type: "image/png" }), "ref.png", "https://worker.example.com", async () => Response.json({ key: "images/x.png" }))).rejects.toThrow();
        await expect(uploadImageToWorker(new Blob(["x"], { type: "image/png" }), "ref.png", "https://worker.example.com", async () => Response.json({ key: "images/x.png", publicUrl: "javascript:alert(1)" }))).rejects.toThrow();
    });
});

    test("parses one public image URL per line and caps the batch", () => {
        const result = parsePublicImageUrls([
            " https://cdn.example.com/one.png ",
            "",
            "https://cdn.example.com/two.jpg",
            "javascript:alert(1)",
            ...Array.from({ length: 30 }, (_, index) => `https://cdn.example.com/extra-${index}.png`),
        ].join("\n"), 30);

        expect(result.urls).toHaveLength(30);
        expect(result.urls[0]).toBe("https://cdn.example.com/one.png");
        expect(result.invalid).toEqual(["javascript:alert(1)"]);
        expect(result.truncated).toBe(true);
    });
