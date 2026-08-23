import type { WeatherAlertMessage } from '../types';

export interface OpenMeteoHourlyPayload {
	time: string[];
	temperature_2m: number[];
	precipitation_probability: number[];
	precipitation: number[];
	weather_code: number[];
	wind_speed_10m: number[];
	wind_gusts_10m: number[];
}

export interface OpenMeteoForecastResponse {
	latitude: number;
	longitude: number;
	timezone: string;
	hourly: OpenMeteoHourlyPayload;
}

/**
 * Evaluates forecast data to generate appropriate weather alerts.
 */
export function evaluateWeatherConditions(
	data: OpenMeteoForecastResponse,
	lang: 'en' | 'ru' = 'en',
	nowIndex = 0
): WeatherAlertMessage[] {
	const alerts: WeatherAlertMessage[] = [];
	const hourly = data.hourly;
	if (!hourly || !hourly.time || hourly.time.length <= nowIndex + 2) {
		return alerts;
	}

	const currentPrecip = hourly.precipitation[nowIndex] || 0;
	const currentProb = hourly.precipitation_probability[nowIndex] || 0;
	const currentTemp = hourly.temperature_2m[nowIndex] || 0;

	// Check next 2-3 hours
	const nextPrecip1 = hourly.precipitation[nowIndex + 1] || 0;
	const nextProb1 = hourly.precipitation_probability[nowIndex + 1] || 0;
	const nextCode1 = hourly.weather_code[nowIndex + 1] || 0;
	const nextTemp1 = hourly.temperature_2m[nowIndex + 1] || 0;
	const nextGust1 = hourly.wind_gusts_10m[nowIndex + 1] || 0;

	// 1. Precipitation Transition (Clear now -> Rain/Snow in next 1-2 hours)
	const isCurrentlyDry = currentPrecip < 0.2 && currentProb < 35;
	const isUpcomingPrecip = nextPrecip1 >= 0.4 || nextProb1 >= 60 || [51, 53, 55, 61, 63, 65, 71, 73, 75, 80, 81, 82, 85, 86].includes(nextCode1);

	if (isCurrentlyDry && isUpcomingPrecip) {
		const isSnow = [71, 73, 75, 77, 85, 86].includes(nextCode1) || nextTemp1 <= 0;
		if (isSnow) {
			alerts.push({
				id: 'precip_snow',
				type: 'precipitation',
				severity: 'info',
				title: lang === 'ru' ? 'Ожидается снегопад' : 'Snow expected soon',
				message: lang === 'ru' ? 'Снег начнется в ближайшие 1–2 часа' : 'Snow expected within the next 1–2 hours',
				icon: 'snow'
			});
		} else {
			alerts.push({
				id: 'precip_rain',
				type: 'precipitation',
				severity: 'info',
				title: lang === 'ru' ? 'Ожидается дождь' : 'Rain expected soon',
				message: lang === 'ru' ? 'Осадки начнутся в ближайшие 1–2 часа' : 'Rain expected within the next 1–2 hours',
				icon: 'rain'
			});
		}
	}

	// 2. Severe Weather (Thunderstorm or Gale)
	const isThunderstorm = [95, 96, 99].includes(nextCode1) || [95, 96, 99].includes(hourly.weather_code[nowIndex] || 0);
	if (isThunderstorm) {
		alerts.push({
			id: 'severe_storm',
			type: 'thunderstorm',
			severity: 'severe',
			title: lang === 'ru' ? 'Грозовое предупреждение' : 'Thunderstorm warning',
			message: lang === 'ru' ? 'Возможна гроза, сильный ливень и порывистый ветер' : 'Thunderstorm, heavy rain and wind gusts possible',
			icon: 'thunderstorm'
		});
	} else if (nextGust1 >= 17) {
		// Local wall-clock label from "YYYY-MM-DDTHH:00" — e.g. "15:00".
		const m = /T(\d{2}):\d{2}$/.exec(hourly.time[nowIndex + 1] || '');
		const at = m ? ` ${lang === 'ru' ? 'около' : 'around'} ${m[1]}:00` : '';
		alerts.push({
			id: 'severe_wind',
			type: 'severe_wind',
			severity: 'warning',
			title: lang === 'ru' ? 'Шквалистый ветер' : 'Gale wind warning',
			message:
				(lang === 'ru' ? `Порывы ветра до ${Math.round(nextGust1)} м/с` : `Wind gusts up to ${Math.round(nextGust1)} m/s`) + at,
			icon: 'wind'
		});
	}

	// 3. Freeze Transition (Current > 0°C -> Next <= 0°C)
	if (currentTemp > 0.5 && nextTemp1 <= 0) {
		alerts.push({
			id: 'freeze_alert',
			type: 'frost',
			severity: 'warning',
			title: lang === 'ru' ? 'Предупреждение о заморозках' : 'Frost warning',
			message: lang === 'ru' ? 'Температура перейдет через 0°C, возможна гололедица' : 'Temperature dropping below 0°C, icy roads possible',
			icon: 'frost'
		});
	}

	return alerts;
}
