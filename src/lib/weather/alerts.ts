import type { ForecastPayload } from '$lib/types';
import type { Language } from '$lib/i18n/translations';
import { getWallNow, getHourStartIdx, wallMinutesBetween, spanWord } from './now';
import { getWeatherVisual } from './wmo';
import { t } from '$lib/i18n';
import { formatTemp } from './units';

export type AlertType = 'precipitation' | 'severe' | 'freeze';
export type AlertSeverity = 'info' | 'warning' | 'severe';

export type WeatherAlert = {
	id: string;
	type: AlertType;
	severity: AlertSeverity;
	title: string;
	message: string;
	icon?: string;
	timestamp: number;
	critical?: boolean;
};

export type AlertOptions = {
	lang?: Language;
	nowMs?: number;
	quietHours?: boolean;
	enabledTypes?: Partial<Record<AlertType, boolean>>;
	lastSentTimestamps?: Partial<Record<AlertType, number>>;
	rateLimitMs?: number;
};

const SEVERE_WMO_CODES = new Set([75, 86, 95, 96, 99]);

export function isQuietTime(timezone: string, nowMs: number = Date.now()): boolean {
	try {
		const nowIso = getWallNow(timezone, nowMs);
		const hour = parseInt(nowIso.slice(11, 13), 10);
		return hour >= 23 || hour < 7;
	} catch {
		return false;
	}
}

export function evaluateWeatherAlerts(
	payload: ForecastPayload,
	previousPayload?: ForecastPayload,
	options: AlertOptions = {}
): WeatherAlert[] {
	if (!payload) return [];

	const lang: Language = options.lang ?? 'en';
	const nowMs = options.nowMs ?? Date.now();
	const quietHoursEnabled = options.quietHours ?? true;
	const rateLimitMs = options.rateLimitMs ?? 3 * 60 * 60 * 1000;
	const enabledTypes = options.enabledTypes ?? {};
	const lastSentTimestamps = options.lastSentTimestamps ?? {};

	const nowIso = getWallNow(payload.timezone, nowMs);
	const hourStartIdx = getHourStartIdx(
		payload.hourly.map((h) => h.time),
		nowIso
	);

	if (hourStartIdx === -1) {
		return [];
	}

	const inQuietHours = quietHoursEnabled && isQuietTime(payload.timezone, nowMs);
	const alerts: WeatherAlert[] = [];

	// 1. Precipitation Trigger
	if (enabledTypes.precipitation !== false) {
		const isCurrentlyDry =
			payload.current.precipitation <= 0.1 && payload.current.weatherCode < 51;

		if (isCurrentlyDry) {
			const upcomingHours = payload.hourly.slice(hourStartIdx + 1, hourStartIdx + 3);
			const precipHour = upcomingHours.find(
				(h) =>
					(h.precipitationProbability != null && h.precipitationProbability >= 60) ||
					h.precipitation > 0.2 ||
					(h.weatherCode >= 51 && (h.precipitationProbability == null || h.precipitationProbability >= 50))
			);

			if (precipHour) {
				const visual = getWeatherVisual(precipHour.weatherCode, lang);
				const minutes = Math.max(1, wallMinutesBetween(nowIso, precipHour.time));
				const title = t('alerts.precipitationTitle', lang);

				let message: string;
				if (lang === 'ru') {
					message =
						minutes > 0
							? `Через ~${spanWord(minutes, 'ru')} ожидается ${visual.shortLabel.toLowerCase()}. Не забудьте взять зонт!`
							: `Ожидаются осадки в ближайшие 2 часа. Не забудьте взять зонт!`;
				} else {
					message =
						minutes > 0
							? `${visual.shortLabel} expected in ~${spanWord(minutes, 'en')}. Take an umbrella!`
							: `Precipitation expected in the next 2 hours. Take an umbrella!`;
				}

				alerts.push({
					id: `precip-${precipHour.time}`,
					type: 'precipitation',
					severity: 'warning',
					title,
					message,
					icon: visual.iconDay,
					timestamp: nowMs,
					critical: false
				});
			}
		}
	}

	// 2. Severe Weather Warning Trigger
	if (enabledTypes.severe !== false) {
		const nearHours = payload.hourly.slice(hourStartIdx, hourStartIdx + 4);
		const severeHour = nearHours.find((h) => SEVERE_WMO_CODES.has(h.weatherCode));
		const currentIsSevere = SEVERE_WMO_CODES.has(payload.current.weatherCode);

		const maxWind = Math.max(
			payload.current.windSpeed,
			...nearHours.map((h) => h.windSpeed)
		);
		const maxGust = Math.max(
			payload.current.windGusts,
			...nearHours.map((h) => h.windSpeed * 1.3) // fallback estimation if gust not in hour
		);

		const isWindSevere = maxWind >= 15 || payload.current.windGusts >= 18;

		if (currentIsSevere || severeHour || isWindSevere) {
			const activeCode = currentIsSevere
				? payload.current.weatherCode
				: severeHour
					? severeHour.weatherCode
					: payload.current.weatherCode;
			const visual = getWeatherVisual(activeCode, lang);
			const title = t('alerts.severeTitle', lang);

			let message: string;
			if (activeCode === 95 || activeCode === 96 || activeCode === 99) {
				const gustVal = Math.round(maxGust >= 15 ? maxGust : payload.current.windGusts);
				if (lang === 'ru') {
					message =
						gustVal >= 15
							? `Штормовое предупреждение: гроза с порывами ветра до ${gustVal} м/с`
							: `Штормовое предупреждение: гроза`;
				} else {
					message =
						gustVal >= 15
							? `Severe alert: Thunderstorm with gusts up to ${gustVal} m/s`
							: `Severe alert: Thunderstorm`;
				}
			} else if (activeCode === 75 || activeCode === 86) {
				message =
					lang === 'ru'
						? `Штормовое предупреждение: сильный снегопад`
						: `Severe alert: Heavy snowfall`;
			} else {
				const windVal = Math.round(maxWind);
				message =
					lang === 'ru'
						? `Штормовое предупреждение: сильный ветер до ${windVal} м/с`
						: `Severe alert: Strong winds up to ${windVal} m/s`;
			}

			alerts.push({
				id: `severe-${nowIso.slice(0, 13)}`,
				type: 'severe',
				severity: 'severe',
				title,
				message,
				icon: visual.iconDay,
				timestamp: nowMs,
				critical: true
			});
		}
	}

	// 3. Freeze & Temperature Drop Trigger
	if (enabledTypes.freeze !== false) {
		const nearHours = payload.hourly.slice(hourStartIdx, hourStartIdx + 4);
		const temps = nearHours.map((h) => h.temperature);
		const minTemp = temps.length > 0 ? Math.min(...temps) : payload.current.temperature;
		const currentTemp = payload.current.temperature;

		// Freeze condition (crossing 0°C downwards)
		if (currentTemp > 0 && minTemp <= 0) {
			const title = t('alerts.freezeTitle', lang);
			const formattedMin = formatTemp(minTemp);
			const message =
				lang === 'ru'
					? `Внимание: температура опускается до ${formattedMin}, на дорогах возможна гололедица`
					: `Freeze alert: Temp dropping below 0°C, icy roads possible`;

			alerts.push({
				id: `freeze-${nowIso.slice(0, 10)}`,
				type: 'freeze',
				severity: 'warning',
				title,
				message,
				icon: 'sleet',
				timestamp: nowMs,
				critical: false
			});
		} else {
			// Sharp temperature drop >= 5°C in next 3 hours
			const futureTemps = payload.hourly.slice(hourStartIdx + 1, hourStartIdx + 4).map((h) => h.temperature);
			if (futureTemps.length > 0) {
				const lowestFuture = Math.min(...futureTemps);
				const drop = currentTemp - lowestFuture;
				if (drop >= 5) {
					const title = lang === 'ru' ? 'Резкое похолодание' : 'Sharp Temperature Drop';
					const message =
						lang === 'ru'
							? `Температура снизится на ${Math.round(drop)}°C в ближайшие часы`
							: `Temperature will drop by ${Math.round(drop)}°C in the coming hours`;

					alerts.push({
						id: `drop-${nowIso.slice(0, 10)}`,
						type: 'freeze',
						severity: 'warning',
						title,
						message,
						icon: 'snow',
						timestamp: nowMs,
						critical: false
					});
				}
			}
		}
	}

	// Filter out quiet hours (non-critical only) and rate-limited alerts
	return alerts.filter((alert) => {
		if (inQuietHours && !alert.critical) {
			return false;
		}

		const lastSent = lastSentTimestamps[alert.type];
		if (lastSent != null && nowMs - lastSent < rateLimitMs) {
			return false;
		}

		return true;
	});
}
