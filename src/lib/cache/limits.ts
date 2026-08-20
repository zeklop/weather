export const MAX_CACHED_CITIES = 8; // max entries in persistent cache
export const CACHE_BUDGET_BYTES = 1024 * 1024; // 1 MB persistent budget
export const RUNTIME_CACHE_CAP = 32; // max entries in runtime Map
export const FRESH_MS = 15 * 60 * 1000; // <15 min = fresh
export const STALE_MS = 6 * 60 * 60 * 1000; // <6 h = stale but usable
