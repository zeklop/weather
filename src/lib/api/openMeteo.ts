import type {
	CurrentWeather,
	DayForecast,
	ForecastPayload,
	HourForecast,
	Location
} from '../types';

const API_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 8000;

// Request only fields actually displayed (§6 spec, review: normalization drops the rest).
const CURRENT_FIELDS =
	'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m';

const HOURLY_FIELDS =
	'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m';

const DAILY_FIELDS =
	'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max';

export type ForecastErrorKind = 'timeout' | 'network' | 'http' | 'malformed';

export class ForecastApiError extends Error {
	readonly kind: ForecastErrorKind;
	readonly status?: number;

	constructor(
		kind: ForecastErrorKind,
		message: string,
		options: { status?: number; cause?: unknown } = {}
	) {
		super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
		this.name = 'ForecastApiError';
		this.kind = kind;
		this.status = options.status;
	}
}

type JsonObject = Record<string, unknown>;

function malformed(context: string): ForecastApiError {
	return new ForecastApiError('malformed', `malformed forecast response: ${context}`);
}

function isRecord(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null;
}

function requireArray(block: JsonObject, key: string): unknown[] {
	const value = block[key];
	if (!Array.isArray(value) || value.length === 0) {
		throw malformed(`${key} missing or empty`);
	}
	return value;
}

function requireStrings(block: JsonObject, key: string, length: number): string[] {
	const arr = requireArray(block, key);
	const values = arr.map((v) => {
		if (typeof v !== 'string') throw malformed(`${key} contains non-string`);
		return v;
	});
	if (values.length !== length) throw malformed(`${key} length mismatch`);
	return values;
}

function requireStringsOrNull(block: JsonObject, key: string, length: number): (string | null)[] {
	const arr = requireArray(block, key);
	const values = arr.map((v) => {
		if (v !== null && typeof v !== 'string') throw malformed(`${key} contains non-string`);
		return v;
	});
	if (values.length !== length) throw malformed(`${key} length mismatch`);
	return values;
}

function requireNumbers(block: JsonObject, key: string, length: number): number[] {
	const arr = requireArray(block, key);
	const values = arr.map((v) => {
		if (typeof v !== 'number') throw malformed(`${key} contains non-number`);
		return v;
	});
	if (values.length !== length) throw malformed(`${key} length mismatch`);
	return values;
}

function requireNumbersOrNull(block: JsonObject, key: string, length: number): (number | null)[] {
	const arr = requireArray(block, key);
	const values = arr.map((v) => {
		if (v !== null && typeof v !== 'number') throw malformed(`${key} contains non-number`);
		return v;
	});
	if (values.length !== length) throw malformed(`${key} length mismatch`);
	return values;
}

function requireNumberField(block: JsonObject, key: string): number {
	const value = block[key];
	if (typeof value !== 'number') throw malformed(`${key} missing or non-number`);
	return value;
}

function normalizeCurrent(block: JsonObject): CurrentWeather {
	return {
		time: (() => {
			const v = block['time'];
			if (typeof v !== 'string') throw malformed('current.time missing');
			return v;
		})(),
		temperature: requireNumberField(block, 'temperature_2m'),
		apparentTemperature: requireNumberField(block, 'apparent_temperature'),
		weatherCode: requireNumberField(block, 'weather_code'),
		humidity: requireNumberField(block, 'relative_humidity_2m'),
		pressureHpa: requireNumberField(block, 'pressure_msl'),
		windSpeed: requireNumberField(block, 'wind_speed_10m'),
		windDirection: requireNumberField(block, 'wind_direction_10m'),
		windGusts: requireNumberField(block, 'wind_gusts_10m'),
		precipitation: requireNumberField(block, 'precipitation')
	};
}

function normalizeHourly(block: JsonObject): HourForecast[] {
	const length = requireArray(block, 'time').length;
	const time = requireStrings(block, 'time', length);
	const temperature = requireNumbers(block, 'temperature_2m', length);
	const apparentTemperature = requireNumbers(block, 'apparent_temperature', length);
	const weatherCode = requireNumbers(block, 'weather_code', length);
	const precipitationProbability = requireNumbersOrNull(block, 'precipitation_probability', length);
	const precipitation = requireNumbers(block, 'precipitation', length);
	const windSpeed = requireNumbers(block, 'wind_speed_10m', length);
	const windDirection = requireNumbers(block, 'wind_direction_10m', length);

	return time.map((_, i) => ({
		time: time[i],
		temperature: temperature[i],
		apparentTemperature: apparentTemperature[i],
		weatherCode: weatherCode[i],
		precipitationProbability: precipitationProbability[i],
		precipitation: precipitation[i],
		windSpeed: windSpeed[i],
		windDirection: windDirection[i]
	}));
}

function normalizeDaily(block: JsonObject): DayForecast[] {
	const length = requireArray(block, 'time').length;
	const time = requireStrings(block, 'time', length);
	const weatherCode = requireNumbers(block, 'weather_code', length);
	const temperatureMax = requireNumbers(block, 'temperature_2m_max', length);
	const temperatureMin = requireNumbers(block, 'temperature_2m_min', length);
	const apparentMax = requireNumbers(block, 'apparent_temperature_max', length);
	const apparentMin = requireNumbers(block, 'apparent_temperature_min', length);
	const precipitationProbabilityMax = requireNumbersOrNull(
		block,
		'precipitation_probability_max',
		length
	);
	const precipitationSum = requireNumbers(block, 'precipitation_sum', length);
	const windSpeedMax = requireNumbers(block, 'wind_speed_10m_max', length);
	const windGustMax = requireNumbers(block, 'wind_gusts_10m_max', length);
	const sunrise = requireStringsOrNull(block, 'sunrise', length);
	const sunset = requireStringsOrNull(block, 'sunset', length);
	const uvIndexMax = requireNumbersOrNull(block, 'uv_index_max', length);

	return time.map((_, i) => ({
		date: time[i],
		weatherCode: weatherCode[i],
		temperatureMax: temperatureMax[i],
		temperatureMin: temperatureMin[i],
		apparentMax: apparentMax[i],
		apparentMin: apparentMin[i],
		precipitationProbabilityMax: precipitationProbabilityMax[i],
		precipitationSum: precipitationSum[i],
		windSpeedMax: windSpeedMax[i],
		windGustMax: windGustMax[i],
		sunrise: !sunrise[i] ? null : sunrise[i],
		sunset: !sunset[i] ? null : sunset[i],
		uvIndexMax: uvIndexMax[i]
	}));
}

export function normalizeForecast(raw: unknown): ForecastPayload {
	if (!isRecord(raw)) throw malformed('root is not an object');
	if (typeof raw['timezone'] !== 'string' || raw['timezone'] === '') {
		throw malformed('timezone missing');
	}
	const current = isRecord(raw['current']) ? raw['current'] : null;
	const hourly = isRecord(raw['hourly']) ? raw['hourly'] : null;
	const daily = isRecord(raw['daily']) ? raw['daily'] : null;
	if (!current) throw malformed('current missing');
	if (!hourly) throw malformed('hourly missing');
	if (!daily) throw malformed('daily missing');

	return {
		current: normalizeCurrent(current),
		hourly: normalizeHourly(hourly),
		daily: normalizeDaily(daily),
		timezone: raw['timezone'],
		fetchedAt: undefined
	};
}

export async function getForecast(location: Location): Promise<ForecastPayload> {
	const params = new URLSearchParams({
		latitude: String(location.latitude),
		longitude: String(location.longitude),
		current: CURRENT_FIELDS,
		hourly: HOURLY_FIELDS,
		daily: DAILY_FIELDS,
		timezone: 'auto',
		forecast_days: '10',
		wind_speed_unit: 'ms'
	});

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	let response: Response;
	try {
		response = await fetch(`${API_URL}?${params.toString()}`, { signal: controller.signal });
	} catch (err) {
		if (controller.signal.aborted) {
			throw new ForecastApiError('timeout', `forecast request timed out after ${TIMEOUT_MS}ms`, {
				cause: err
			});
		}
		throw new ForecastApiError('network', 'forecast request failed', { cause: err });
	} finally {
		clearTimeout(timer);
	}

	if (!response.ok) {
		throw new ForecastApiError('http', `forecast request failed with status ${response.status}`, {
			status: response.status
		});
	}

	let raw: unknown;
	try {
		raw = await response.json();
	} catch (err) {
		if (controller.signal.aborted) {
			throw new ForecastApiError('timeout', `forecast request timed out after ${TIMEOUT_MS}ms`, {
				cause: err
			});
		}
		throw new ForecastApiError('malformed', 'malformed forecast response: invalid JSON', {
			cause: err
		});
	}

	return normalizeForecast(raw);
}
