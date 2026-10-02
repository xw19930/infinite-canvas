export const VIDEO_POLL_INTERVAL_MS = 2500;
export const VIDEO_TASK_TIMEOUT_MS = 120 * 60 * 1000;

export function normalizeVideoCount(value: string | undefined) {
    return Math.max(1, Math.min(10, Math.floor(Number(value) || 1)));
}
