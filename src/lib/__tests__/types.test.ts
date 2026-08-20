import { describe, expect, it } from 'vitest';
import type {
	DayForecast,
	ForecastPayload,
	HourForecast,
	Location,
	CurrentWeather
} from '../types';

const location = {
	id: 'moscow',
	name: 'Москва',
	admin1: 'Москва',
	country: 'Россия',
	countryCode: 'RU',
	latitude: 55.7558,
	longitude: 37.6173,
	timezone: 'Europe/Moscow'
} satisfies Location;

const current = {
	time: '2026-08-20T12:00',
	temperature: 24.1,
	apparentTemperature: 25.3,
	weatherCode: 1,
	humidity: 45,
	pressureHpa: 1013.2,
	windSpeed: 3.1,
	windDirection: 180,
	windGusts: 5.4,
	precipitation: 0
} satisfies CurrentWeather;

const hour = {
	time: '2026-08-20T12:00',
	temperature: 24.1,
	apparentTemperature: 25.3,
	weatherCode: 1,
	precipitationProbability: 10,
	precipitation: 0,
	windSpeed: 3.1,
	windDirection: 180
} satisfies HourForecast;

const day = {
	date: '2026-08-20',
	weatherCode: 1,
	temperatureMax: 26.4,
	temperatureMin: 15.2,
	apparentMax: 27.1,
	apparentMin: 14.8,
	precipitationProbabilityMax: 20,
	precipitationSum: 0.4,
	windSpeedMax: 6.2,
	windGustMax: 11.8,
	sunrise: '2026-08-20T05:12',
	sunset: '2026-08-20T20:41',
	uvIndexMax: 5
} satisfies DayForecast;

const payload = {
	current,
	hourly: [hour],
	daily: [day],
	timezone: 'Europe/Moscow',
	fetchedAt: 1784707200000
} satisfies ForecastPayload;

describe('normalized data model types', () => {
	it('sample payload satisfies ForecastPayload and keeps its data', () => {
		expect(payload.current.temperature).toBe(24.1);
		expect(payload.hourly).toHaveLength(1);
		expect(payload.daily).toHaveLength(1);
		expect(payload.timezone).toBe('Europe/Moscow');
		expect(payload.fetchedAt).toBe(1784707200000);
		expect(location.latitude).toBe(55.7558);
	});
});