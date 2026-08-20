/** In-memory Storage-like fake: no jsdom, works in plain vitest node env. */
export function makeMemoryStorage(initial?: Record<string, string>): Storage {
	const data = new Map<string, string>(Object.entries(initial ?? {}));
	return {
		get length() {
			return data.size;
		},
		clear() {
			data.clear();
		},
		getItem(key: string) {
			return data.has(key) ? data.get(key)! : null;
		},
		key(index: number) {
			return Array.from(data.keys())[index] ?? null;
		},
		removeItem(key: string) {
			data.delete(key);
		},
		setItem(key: string, value: string) {
			data.set(key, value);
		}
	};
}
