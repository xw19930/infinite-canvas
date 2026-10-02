export function appendVideoResolutionFields(form: FormData, resolution: string) {
    form.append("resolution", resolution);
    form.append("resolution_name", resolution);
}

export function appendVideoAspectRatioField(form: FormData, aspectRatio: string) {
    form.append("aspect_ratio", aspectRatio);
}

export function isDolaVideoModel(model: string) {
    const normalized = model.trim().toLowerCase().split("::").pop() || "";
    return normalized === "dola-seedance-2.5";
}

export function publicReferenceImageUrls(references: Array<{ publicUrl?: string; url?: string; dataUrl?: string }>) {
    const urls = references.map((image) => image.publicUrl || image.url || "");
    return urls.every((url) => /^https?:\/\//i.test(url)) ? urls : null;
}

type DolaVideoRequest = {
    model: string;
    prompt: string;
    duration: string;
    size: string;
    resolution: string;
    imageUrls: string[];
};

/** Dola requires each public reference URL to be cited as @\u56feN in the prompt. */
export function buildDolaVideoRequestBody(input: DolaVideoRequest) {
    const body: {
        model: string;
        prompt: string;
        duration: number;
        size: string;
        resolution: string;
        images?: string[];
    } = {
        model: input.model,
        prompt: appendDolaReferenceTags(input.prompt, input.imageUrls.length),
        duration: Number(input.duration),
        size: input.size,
        resolution: input.resolution,
    };
    if (input.imageUrls.length) body.images = input.imageUrls;
    return body;
}

export function appendDolaReferenceTags(prompt: string, imageCount: number) {
    const text = prompt.trim();
    if (imageCount <= 0) return text;
    const tags = Array.from({ length: imageCount }, (_, index) => `@\u56fe${index + 1}`);
    const missing = tags.filter((tag) => !new RegExp(`${tag}(?!\\d)`).test(text));
    if (!missing.length) return text;
    return `${text}\n\u8bf7\u6309\u987a\u5e8f\u53c2\u8003\u56fe\u7247\uff1a${missing.join("\u3001")}\u3002`;
}

type PublicUrlVideoRequest = {
    model: string;
    prompt: string;
    seconds: string;
    size: string;
    resolution: string;
    aspectRatio: string;
    generateAudio: boolean;
    watermark: boolean;
    mode: string;
    imageUrls: string[];
};

export function buildPublicUrlVideoRequestBody(input: PublicUrlVideoRequest) {
    return {
        model: input.model,
        prompt: input.prompt,
        seconds: input.seconds,
        size: input.size,
        resolution: input.resolution,
        aspect_ratio: input.aspectRatio,
        generate_audio: input.generateAudio,
        watermark: input.watermark,
        mode: input.mode,
        images: input.imageUrls,
    };
}
