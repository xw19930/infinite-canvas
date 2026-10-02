import { describe, expect, test } from "bun:test";

import { normalizeVideoCount } from "./video-generation";

describe("video generation count", () => {
    test("clamps invalid values to the supported 1-10 range", () => {
        expect(normalizeVideoCount(undefined)).toBe(1);
        expect(normalizeVideoCount("0")).toBe(1);
        expect(normalizeVideoCount("4.9")).toBe(4);
        expect(normalizeVideoCount("12")).toBe(10);
        expect(normalizeVideoCount("-3")).toBe(1);
    });
});
