// Memoized Intl.DateTimeFormat instances per timezone to avoid re-instantiation per tick.
const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timezone: string): Intl.DateTimeFormat {
	let formatter = formatters.get(timezone);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		});
		formatters.set(timezone, formatter);
	}
	return formatter;
}

/**
 * Returns ISO wall-time (e.g. '2026-08-20T14:30') in the location timezone,
 * using memoized Intl.DateTimeFormat.
 */
export function getWallNow(timezone: string, ms: number = Date.now()): string {
	try {
		const formatter = getFormatter(timezone);
		const parts = formatter.formatToParts(new Date(ms));
		const val = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
		let hour = val('hour');
		if (hour === '24') hour = '00';
		return `${val('year')}-${val('month')}-${val('day')}T${hour}:${val('minute')}`;
	} catch {
		return new Date(ms).toISOString().slice(0, 16);
	}
}

/**
 * Returns the index of the current hour in the `times` array.
 * If `nowIso` is past the last hour block in `times`, returns `-1` (expired payload).
 * If `nowIso` is before the first hour in `times`, returns `0`.
 */
export function getHourStartIdx(times: string[], nowIso: string): number {
	if (!times || times.length === 0) return -1;
	const lastTime = times[times.length - 1];
	const nowHour = nowIso.slice(0, 13);
	const lastHour = lastTime.slice(0, 13);
	if (nowHour > lastHour) {
		return -1;
	}
	let idx = times.length - 1;
	while (idx > 0 && times[idx].slice(0, 13) > nowHour) {
		idx--;
	}
	return idx;
}

/**
 * Returns true if the forecast payload is completely expired relative to `nowIso`.
 */
export function isPayloadExpired(times: string[], nowIso: string): boolean {
	return getHourStartIdx(times, nowIso) === -1;
}

/**
 * Wall-time components interpreted as UTC epoch ms (carrier trick).
 */
export function wallEpoch(iso: string): number {
	return Date.UTC(
		+iso.slice(0, 4),
		+iso.slice(5, 7) - 1,
		+iso.slice(8, 10),
		+iso.slice(11, 13),
		+iso.slice(14, 16)
	);
}

/**
 * Difference in minutes between two wall-time ISO strings.
 */
export function wallMinutesBetween(from: string, to: string): number {
	return Math.round((wallEpoch(to) - wallEpoch(from)) / 60_000);
}

/**
 * Formats duration in minutes with Russian declension or hour approximation.
 */
export function spanWord(minutes: number): string {
	const m = Math.max(1, minutes);
	if (m < 60) {
		const m10 = m % 10;
		const m100 = m % 100;
		if (m10 === 1 && m100 !== 11) return `${m} минуту`;
		if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${m} минуты`;
		return `${m} минут`;
	}
	const h = Math.round((m / 60) * 2) / 2;
	if (h <= 1) return '1 час';
	if (h <= 1.5) return '1,5 часа';
	return '2 часа';
}

/**
 * Russian phrase helper using shortLabelRu ("Дождь идёт", "Морось начнётся примерно через 40 минут",
 * "Дождь закончится через 15 минут", etc.).
 */
export function formatPrecipitationPhrase(
	shortLabelRu: string,
	minutesRemaining: number | null,
	isCurrentlyRaining: boolean
): string {
	if (isCurrentlyRaining) {
		if (minutesRemaining !== null && minutesRemaining > 0) {
			return `${shortLabelRu} закончится через ${spanWord(minutesRemaining)}`;
		}
		return `${shortLabelRu} идёт`;
	}

	if (minutesRemaining !== null && minutesRemaining > 0) {
		return `${shortLabelRu} начнётся примерно через ${spanWord(minutesRemaining)}`;
	}

	return 'Без осадков';
}
