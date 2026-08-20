export type Location = {
	id: string;
	name: string;
	admin1?: string;
	country?: string;
	countryCode?: string;
	latitude: number;
	longitude: number;
	timezone: string;
};

export type CurrentWeather = {
	time: string; // ISO wall-time in location tz
	temperature: number;
	apparentTemperature: number;
	weatherCode: number;
	humidity: number;
	pressureHpa: number;
	windSpeed: number;
	windDirection: number;
	windGusts: number;
	precipitation: number;
};

export type HourForecast = {
	time: string; // ISO wall-time in location tz
	temperature: number;
	apparentTemperature: number;
	weatherCode: number;
	precipitationProbability: number | null;
	precipitation: number;
	windSpeed: number;
	windDirection: number;
};

export type DayForecast = {
	date: string; // ISO date, location tz
	weatherCode: number;
	temperatureMax: number;
	temperatureMin: number;
	apparentMax: number;
	apparentMin: number;
	precipitationProbabilityMax: number | null;
	precipitationSum: number;
	windSpeedMax: number;
	windGustMax: number;
	sunrise: string; // ISO wall-time in location tz
	sunset: string; // ISO wall-time in location tz
	uvIndexMax: number | null;
};

export type ForecastPayload = {
	current: CurrentWeather;
	hourly: HourForecast[];
	daily: DayForecast[];
	timezone: string; // required TZ contract — wall-time source for all timestamps
	fetchedAt?: number; // cache/store stamp
};

export type ForecastStatus = 'idle' | 'loading' | 'fresh' | 'stale' | 'error' | 'offline';

export type DayResult = {
	isDay: boolean;
	source: 'calculated' | 'fallback';
};

export type CachedForecast = {
	fetchedAt: number;
	location: Location;
	payload: ForecastPayload;
};