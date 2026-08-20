// All Open-Meteo timestamps are wall-time ISO strings in the location's
// timezone (e.g. '2026-08-20T11:00'). They are displayed WITHOUT conversion to
// the phone's timezone: never `new Date(...)`-parse wall-time strings and never
// format them with a location-timezone Intl. HH:MM is a pure string slice;
// calendar labels go through the Date.UTC trick + timeZone:'UTC', which
// reproduces the location wall-time calendar exactly.
const HOUR_RE = /T(\d{2}:\d{2})/;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

// ISO wall-time components interpreted as UTC: the resulting Date is a pure
// calendar carrier, formatted back in UTC, so output equals the location
// wall-time calendar with no timezone shift.
function wallDate(isoDate: string): Date {
	const match = DATE_RE.exec(isoDate);
	if (!match) return new Date();
	const [, y, m, d] = match;
	return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

export function formatHour(isoTime: string): string {
	const match = HOUR_RE.exec(isoTime);
	return match ? match[1] : '00:00';
}

export function formatTimeShort(isoDateTime: string): string {
	return formatHour(isoDateTime);
}

const DAY_SHORT = new Intl.DateTimeFormat('ru-RU', {
	weekday: 'short',
	day: 'numeric',
	timeZone: 'UTC'
});

const DAY_FULL = new Intl.DateTimeFormat('ru-RU', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	timeZone: 'UTC'
});

export function formatDayShort(isoDate: string): string {
	return DAY_SHORT.format(wallDate(isoDate));
}

export function formatDayFull(isoDate: string): string {
	const s = DAY_FULL.format(wallDate(isoDate));
	return s.charAt(0).toUpperCase() + s.slice(1);
}

const DATE_SHORT = new Intl.DateTimeFormat('ru-RU', {
	day: 'numeric',
	month: 'short',
	timeZone: 'UTC'
});

const DATE_MONTH_FULL = new Intl.DateTimeFormat('ru-RU', {
	day: 'numeric',
	month: 'long',
	timeZone: 'UTC'
});

const DAY_AND_DATE = new Intl.DateTimeFormat('ru-RU', {
	weekday: 'short',
	day: 'numeric',
	month: 'short',
	timeZone: 'UTC'
});

export function formatDateShort(isoDate: string): string {
	return DATE_SHORT.format(wallDate(isoDate)).replace(/\.$/, '');
}

export function formatDayAndDate(isoDate: string): string {
	return DAY_AND_DATE.format(wallDate(isoDate)).replace(/\.$/, '');
}

export function formatDayHeader(isoDate: string, nowWallTime: string | null): string {
	if (!nowWallTime) return formatDayFull(isoDate);
	const nowDay = nowWallTime.slice(0, 10);
	const nowWall = wallDate(nowDay);
	const targetWall = wallDate(isoDate);
	const diffDays = Math.round((targetWall.getTime() - nowWall.getTime()) / (24 * 3600 * 1000));
	const dateMonth = DATE_MONTH_FULL.format(targetWall);
	if (diffDays === 0) return `Сегодня, ${dateMonth}`;
	if (diffDays === 1) return `Завтра, ${dateMonth}`;
	return formatDayFull(isoDate);
}

export function formatStaleTime(isoDateTime: string, nowWallTime: string | null): string {
	const timeStr = formatHour(isoDateTime);
	if (nowWallTime && isToday(isoDateTime.slice(0, 10), nowWallTime)) {
		return timeStr;
	}
	return `${formatDateShort(isoDateTime.slice(0, 10))}, ${timeStr}`;
}

export function formatRailDateBadge(isoDate: string, nowWallTime: string | null): string {
	if (!nowWallTime) return formatDayShort(isoDate);
	const nowDay = nowWallTime.slice(0, 10);
	if (isoDate === nowDay) return 'Сегодня';
	const nowWall = wallDate(nowDay);
	const targetWall = wallDate(isoDate);
	const diffDays = Math.round((targetWall.getTime() - nowWall.getTime()) / (24 * 3600 * 1000));
	if (diffDays === 1) return 'Завтра';
	return formatDayShort(isoDate);
}

export function isToday(isoDate: string, nowWallTime: string): boolean {
	return isoDate === nowWallTime.slice(0, 10);
}