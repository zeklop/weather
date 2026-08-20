export type Language = 'en' | 'ru';

export const DEFAULT_LANGUAGE: Language = 'en';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'ru'] as const;

export interface Translations {
	app: {
		name: string;
		title: string;
		description: string;
	};
	nav: {
		home: string;
		forecast: string;
		favorites: string;
		settings: string;
		map: string;
		ariaLabel: string;
	};
	header: {
		refresh: string;
		search: string;
		addToFavorites: string;
		removeFromFavorites: string;
		unnamedLocationStar: string;
		unnamedLocationTitle: string;
		myLocation: string;
	};
	home: {
		loading: string;
		refreshing: string;
		errorTitle: string;
		offlineTitle: string;
		offlineText: string;
		retry: string;
		update: string;
		staleBanner: string;
		staleShown: string;
		staleFailedShown: string;
		staleOfflineShown: string;
		weatherNowSr: string;
		feelsLike: string;
		wind: string;
		pressure: string;
		next2Hours: string;
		noPrecipitation: string;
		noPrecipitation2h: string;
		hourlyForecast: string;
		now: string;
		precipProbability: string;
		today: string;
		tomorrow: string;
		daytime: string;
		nighttime: string;
		dayAndNight: string;
		noSignificantPrecip: string;
		sunrise: string;
		sunset: string;
		forecast10Days: string;
		precipitationChartTitle: string;
		precipitationVolume: string;
		precipitationProbability: string;
		noPrecipitation24h: string;
		showOnMap: string;
		metricsTitle: string;
		uvIndex: string;
		humidity: string;
		dewPoint: string;
		airQuality: string;
	};
	forecast: {
		title: string;
		description: string;
		hourlyTitle: string;
		dailyTitle: string;
		time: string;
		weather: string;
		temp: string;
		precip: string;
		wind: string;
		day: string;
		minMax: string;
		nightMin: string;
		dayMax: string;
		precipProbabilityTitle: string;
		noPrecipitation: string;
	};
	favorites: {
		title: string;
		description: string;
		loading: string;
		emptyTitle: string;
		emptyHint: string;
		addCity: string;
		localTime: string;
		noNetwork: string;
		failedToLoad: string;
		removeFavorite: string;
	};
	settings: {
		title: string;
		description: string;
		theme: string;
		themeSelectAria: string;
		themeSystem: string;
		themeLight: string;
		themeDark: string;
		language: string;
		languageSelectAria: string;
		city: string;
		changeCityAria: string;
		geolocation: string;
		geoLocating: string;
		geoRetry: string;
		geoAuto: string;
		geoDenied: string;
		geoUnavailable: string;
		geoTimeout: string;
		lastUpdated: string;
		updating: string;
		update: string;
		dataSource: string;
		weatherIcons: string;
		version: string;
		installApp: string;
		installAppHint: string;
		author: string;
		badgeLabel: string;
		alertsSection: string;
		alertsEnabled: string;
		precipitationAlerts: string;
		severeAlerts: string;
		freezeAlerts: string;
		quietHours: string;
		quietHoursDesc: string;
	};
	map: {
		title: string;
		description: string;
		toHome: string;
		radar: string;
		standard: string;
		play: string;
		pause: string;
		recenter: string;
		zoomIn: string;
		zoomOut: string;
		loadingRadar: string;
		radarUnavailable: string;
		past: string;
		now: string;
		forecast: string;
		layers: string;
	};
	search: {
		placeholder: string;
		ariaLabel: string;
		dialogAria: string;
		clear: string;
		close: string;
		minChars: string;
		loading: string;
		searchingSr: string;
		error: string;
		empty: string;
		emptySub: string;
		results: string;
	};
	errorPage: {
		notFoundTitle: string;
		genericTitle: string;
		notFoundText: string;
		genericText: string;
		toHome: string;
	};
	pwa: {
		installTitle: string;
		installBtn: string;
		bannerAndroidText: string;
		bannerIosText: string;
		bannerIosAction: string;
		bannerDismiss: string;
		modalTitle: string;
		modalStep1: string;
		modalStep2: string;
		modalStep3: string;
		modalClose: string;
	};
	units: {
		ms: string;
		mmhg: string;
		hpa: string;
		mm: string;
		km: string;
		celsius: string;
	};
	alerts: {
		precipitationTitle: string;
		severeTitle: string;
		freezeTitle: string;
		dismiss: string;
	};
}

export const translations: Record<Language, Translations> = {
	en: {
		app: {
			name: 'Weather',
			title: 'Weather',
			description: 'Lightweight weather PWA'
		},
		nav: {
			home: 'Home',
			forecast: 'Forecast',
			favorites: 'Favorites',
			settings: 'Settings',
			map: 'Map',
			ariaLabel: 'Main navigation'
		},
		header: {
			refresh: 'Refresh forecast',
			search: 'Find city',
			addToFavorites: 'Add to favorites',
			removeFromFavorites: 'Remove from favorites',
			unnamedLocationStar: 'Not available for unnamed location',
			unnamedLocationTitle: 'Cannot add current unnamed location to favorites',
			myLocation: 'My location'
		},
		home: {
			loading: 'Loading forecast',
			refreshing: 'Updating…',
			errorTitle: 'Failed to load forecast',
			offlineTitle: 'No connection',
			offlineText: 'Check your internet connection and try again.',
			retry: 'Retry',
			update: 'Update',
			staleBanner: 'Data is outdated. Refresh to get the latest forecast.',
			staleShown: 'Showing data for {time}.',
			staleFailedShown: 'Failed to update forecast. Showing data for {time}.',
			staleOfflineShown: 'No connection. Showing data for {time}.',
			weatherNowSr: 'Weather now',
			feelsLike: 'Feels like {temp}',
			wind: 'Wind {speed}, {dir}',
			pressure: 'Pressure {pressure}',
			next2Hours: 'Next 2 hours',
			noPrecipitation: 'No precipitation',
			noPrecipitation2h: 'No precipitation in the next 2 hours',
			hourlyForecast: 'Hourly forecast',
			now: 'Now',
			precipProbability: 'precipitation probability',
			today: 'Today',
			tomorrow: 'Tomorrow',
			daytime: 'Day {temp}',
			nighttime: 'Night {temp}',
			dayAndNight: 'Day {day} · Night {night}',
			noSignificantPrecip: 'No significant precipitation',
			sunrise: 'Sunrise: {time}',
			sunset: 'Sunset: {time}',
			forecast10Days: '10-day forecast →',
			precipitationChartTitle: '24-Hour Precipitation',
			precipitationVolume: 'Amount',
			precipitationProbability: 'Probability',
			noPrecipitation24h: 'No precipitation expected in the next 24 hours',
			showOnMap: 'Show on map →',
			metricsTitle: 'Weather details',
			uvIndex: 'UV index',
			humidity: 'Humidity',
			dewPoint: 'Dew point',
			airQuality: 'Air quality'
		},
		forecast: {
			title: 'Forecast',
			description: 'Detailed hourly and 10-day weather forecast',
			hourlyTitle: 'Hourly forecast',
			dailyTitle: '10-day forecast',
			time: 'Time',
			weather: 'Weather',
			temp: 'Temp',
			precip: 'Precip',
			wind: 'Wind',
			day: 'Day',
			minMax: 'Min / Max',
			nightMin: 'Night min',
			dayMax: 'Day max',
			precipProbabilityTitle: 'Precipitation probability: {prob}',
			noPrecipitation: 'No precipitation'
		},
		favorites: {
			title: 'Favorites',
			description: 'Saved locations and quick access to forecast',
			loading: 'Loading favorites',
			emptyTitle: 'No saved locations',
			emptyHint: 'No saved locations yet. Tap below to find and add a city',
			addCity: 'Add city',
			localTime: 'local {time}',
			noNetwork: 'No network',
			failedToLoad: 'Failed to load',
			removeFavorite: 'Remove {name} from favorites'
		},
		settings: {
			title: 'Settings',
			description: 'Weather app settings',
			theme: 'Theme',
			themeSelectAria: 'Select theme',
			themeSystem: 'System',
			themeLight: 'Light',
			themeDark: 'Dark',
			language: 'Language',
			languageSelectAria: 'Select language',
			city: 'City',
			changeCityAria: 'Change city, current: {city}',
			geolocation: 'Geolocation',
			geoLocating: 'Locating…',
			geoRetry: 'Retry',
			geoAuto: 'Detect automatically',
			geoDenied: 'Geolocation permission denied in browser. Enable access in settings and retry.',
			geoUnavailable: 'Geolocation unavailable on this device',
			geoTimeout: 'Failed to detect location (timeout exceeded).',
			lastUpdated: 'Last updated',
			updating: 'Updating…',
			update: 'Update',
			dataSource: 'Data source',
			weatherIcons: 'Weather icons',
			version: 'Version',
			installApp: 'Install App',
			installAppHint: 'To add to Home Screen: Share → Add to Home Screen',
			author: 'Created by Zeklop',
			badgeLabel: 'Show temperature on app icon',
			alertsSection: 'Weather Alerts',
			alertsEnabled: 'Allow notifications',
			precipitationAlerts: 'Precipitation (rain/snow)',
			severeAlerts: 'Severe weather warnings',
			freezeAlerts: 'Frost & temperature drop',
			quietHours: 'Quiet hours (23:00 – 07:00)',
			quietHoursDesc: 'Suppresses non-critical alerts at night'
		},
		map: {
			title: 'Map',
			description: 'Interactive weather map',
			toHome: 'Back to Home',
			radar: 'Radar',
			standard: 'Standard',
			play: 'Play',
			pause: 'Pause',
			recenter: 'My City',
			zoomIn: 'Zoom in',
			zoomOut: 'Zoom out',
			loadingRadar: 'Loading radar...',
			radarUnavailable: 'Radar data currently unavailable',
			past: 'Past',
			now: 'Now',
			forecast: 'Forecast',
			layers: 'Layers'
		},
		search: {
			placeholder: 'City, region or country',
			ariaLabel: 'City name',
			dialogAria: 'Find city',
			clear: 'Clear input',
			close: 'Close search',
			minChars: 'Type at least 2 characters',
			loading: 'Searching cities...',
			searchingSr: 'Searching cities',
			error: 'Failed to search. Check connection.',
			empty: 'Nothing found',
			emptySub: 'Check city spelling or specify region/country',
			results: 'Search results'
		},
		errorPage: {
			notFoundTitle: 'Page not found',
			genericTitle: 'An error occurred',
			notFoundText: 'The requested page does not exist or was moved.',
			genericText: 'Something went wrong. Try returning to the home page.',
			toHome: 'To home page'
		},
		pwa: {
			installTitle: 'Install Weather App',
			installBtn: 'Install',
			bannerAndroidText: 'Install Weather for quick access and offline mode',
			bannerIosText: 'Add Weather to your Home Screen for the best experience',
			bannerIosAction: 'How to install',
			bannerDismiss: 'Dismiss',
			modalTitle: 'How to install',
			modalStep1: 'Tap the Share button in Safari',
			modalStep2: 'Scroll and select "Add to Home Screen"',
			modalStep3: 'Tap "Add" in the top-right corner',
			modalClose: 'Got it'
		},
		units: {
			ms: 'm/s',
			mmhg: 'mmHg',
			hpa: 'hPa',
			mm: 'mm',
			km: 'km',
			celsius: '°C'
		},
		alerts: {
			precipitationTitle: 'Precipitation Alert',
			severeTitle: 'Severe Weather Alert',
			freezeTitle: 'Freeze Warning',
			dismiss: 'Dismiss alert'
		}
	},
	ru: {
		app: {
			name: 'Погода',
			title: 'Погода',
			description: 'Легкое погодное PWA-приложение'
		},
		nav: {
			home: 'Главная',
			forecast: 'Прогноз',
			favorites: 'Избранное',
			settings: 'Настройки',
			map: 'Карта',
			ariaLabel: 'Основная навигация'
		},
		header: {
			refresh: 'Обновить прогноз',
			search: 'Найти город',
			addToFavorites: 'Добавить в избранное',
			removeFromFavorites: 'Убрать из избранного',
			unnamedLocationStar: 'Недоступно для безымянного местоположения',
			unnamedLocationTitle: 'Нельзя добавить текущее местоположение без названия в избранное',
			myLocation: 'Моё местоположение'
		},
		home: {
			loading: 'Загрузка прогноза',
			refreshing: 'Обновляем…',
			errorTitle: 'Не удалось обновить прогноз',
			offlineTitle: 'Нет соединения',
			offlineText: 'Проверьте подключение к интернету и попробуйте ещё раз.',
			retry: 'Повторить',
			update: 'Обновить',
			staleBanner: 'Данные устарели. Нажмите кнопку обновления, чтобы получить актуальный прогноз.',
			staleShown: 'Показаны данные на {time}.',
			staleFailedShown: 'Не удалось обновить прогноз. Показаны данные на {time}.',
			staleOfflineShown: 'Нет соединения. Показаны данные на {time}.',
			weatherNowSr: 'Погода сейчас',
			feelsLike: 'Ощущается как {temp}',
			wind: 'Ветер {speed}, {dir}',
			pressure: 'Давление {pressure}',
			next2Hours: 'В ближайшие 2 часа',
			noPrecipitation: 'Без осадков',
			noPrecipitation2h: 'Без осадков в ближайшие 2 часа',
			hourlyForecast: 'Прогноз по часам',
			now: 'Сейчас',
			precipProbability: 'вероятность осадков',
			today: 'Сегодня',
			tomorrow: 'Завтра',
			daytime: 'Днём {temp}',
			nighttime: 'Ночью {temp}',
			dayAndNight: 'Днём {day} · Ночью {night}',
			noSignificantPrecip: 'Без существенных осадков',
			sunrise: 'Восход: {time}',
			sunset: 'Закат: {time}',
			forecast10Days: 'Прогноз на 10 дней →',
			precipitationChartTitle: 'Осадки на 24 часа',
			precipitationVolume: 'Количество',
			precipitationProbability: 'Вероятность',
			noPrecipitation24h: 'Без осадков в ближайшие 24 часа',
			showOnMap: 'Показать на карте →',
			metricsTitle: 'Подробно о погоде',
			uvIndex: 'УФ-индекс',
			humidity: 'Влажность',
			dewPoint: 'Точка росы',
			airQuality: 'Качество воздуха'
		},
		forecast: {
			title: 'Прогноз',
			description: 'Подробный почасовой и 10-дневный прогноз погоды',
			hourlyTitle: 'Почасовой прогноз',
			dailyTitle: 'Прогноз на 10 дней',
			time: 'Время',
			weather: 'Погода',
			temp: 'Темп',
			precip: 'Осадки',
			wind: 'Ветер',
			day: 'День',
			minMax: 'Мин / Макс',
			nightMin: 'Ночной минимум',
			dayMax: 'Дневной максимум',
			precipProbabilityTitle: 'Вероятность осадков: {prob}',
			noPrecipitation: 'Без осадков'
		},
		favorites: {
			title: 'Избранное',
			description: 'Сохранённые города и быстрый доступ к прогнозу',
			loading: 'Загрузка избранного',
			emptyTitle: 'Нет избранных городов',
			emptyHint: 'У вас пока нет сохранённых городов. Нажмите кнопку ниже, чтобы найти и добавить город',
			addCity: 'Добавить город',
			localTime: 'местное {time}',
			noNetwork: 'Нет сети',
			failedToLoad: 'Не удалось загрузить',
			removeFavorite: 'Удалить {name} из избранного'
		},
		settings: {
			title: 'Настройки',
			description: 'Настройки приложения Погода',
			theme: 'Тема',
			themeSelectAria: 'Выбор темы',
			themeSystem: 'Системная',
			themeLight: 'Светлая',
			themeDark: 'Тёмная',
			language: 'Язык',
			languageSelectAria: 'Выбор языка',
			city: 'Город',
			changeCityAria: 'Изменить город, текущий: {city}',
			geolocation: 'Геолокация',
			geoLocating: 'Определяем…',
			geoRetry: 'Повторить попытку',
			geoAuto: 'Определить автоматически',
			geoDenied: 'Доступ к геолокации запрещён в браузере. Разрешите доступ в настройках и повторите попытку.',
			geoUnavailable: 'Геолокация недоступна на этом устройстве',
			geoTimeout: 'Не удалось определить местоположение (превышено время ожидания).',
			lastUpdated: 'Последнее обновление',
			updating: 'Обновляем…',
			update: 'Обновить',
			dataSource: 'Данные',
			weatherIcons: 'Иконки погоды',
			version: 'Версия',
			installApp: 'Установить приложение',
			installAppHint: 'Чтобы добавить на экран «Домой»: Поделиться → На экран «Домой»',
			author: 'Автор: Zeklop',
			badgeLabel: 'Температура на иконке приложения',
			alertsSection: 'Погодные оповещения',
			alertsEnabled: 'Разрешить оповещения',
			precipitationAlerts: 'Осадки (дождь/снег)',
			severeAlerts: 'Штормовые предупреждения',
			freezeAlerts: 'Гололёд и перепады температуры',
			quietHours: 'Тихие часы (23:00 – 07:00)',
			quietHoursDesc: 'Заглушает обычные оповещения ночью'
		},
		map: {
			title: 'Карта',
			description: 'Интерактивная карта погоды и осадков',
			toHome: 'На главную',
			radar: 'Осадки',
			standard: 'Схема',
			play: 'Воспроизвести',
			pause: 'Пауза',
			recenter: 'Мой город',
			zoomIn: 'Увеличить',
			zoomOut: 'Уменьшить',
			loadingRadar: 'Загрузка данных радара...',
			radarUnavailable: 'Данные радара временно недоступны',
			past: 'Прошедшие',
			now: 'Сейчас',
			forecast: 'Прогноз',
			layers: 'Слои'
		},
		search: {
			placeholder: 'Город, регион или страна',
			ariaLabel: 'Название города',
			dialogAria: 'Поиск города',
			clear: 'Очистить поле',
			close: 'Закрыть поиск',
			minChars: 'Введите минимум 2 символа',
			loading: 'Ищем города...',
			searchingSr: 'Ищем города',
			error: 'Не удалось выполнить поиск. Проверьте соединение.',
			empty: 'Ничего не найдено',
			emptySub: 'Проверьте написание города или укажите регион/страну',
			results: 'Результаты поиска'
		},
		errorPage: {
			notFoundTitle: 'Страница не найдена',
			genericTitle: 'Произошла ошибка',
			notFoundText: 'Запрошенная страница не существует или была перемещена.',
			genericText: 'Что-то пошло не так. Попробуйте вернуться на главную.',
			toHome: 'На главную'
		},
		pwa: {
			installTitle: 'Установить приложение Погода',
			installBtn: 'Установить',
			bannerAndroidText: 'Установите приложение Погода для быстрого доступа и оффлайн-режима',
			bannerIosText: 'Установите на экран «Домой» для удобной работы',
			bannerIosAction: 'Как установить',
			bannerDismiss: 'Закрыть',
			modalTitle: 'Инструкция по установке',
			modalStep1: 'Нажмите кнопку «Поделиться» в Safari',
			modalStep2: 'Прокрутите меню и выберите «На экран "Домой"»',
			modalStep3: 'Нажмите «Добавить» в правом верхнем углу',
			modalClose: 'Понятно'
		},
		units: {
			ms: 'м/с',
			mmhg: 'мм рт. ст.',
			hpa: 'гПа',
			mm: 'мм',
			km: 'км',
			celsius: '°C'
		},
		alerts: {
			precipitationTitle: 'Приближение осадков',
			severeTitle: 'Штормовое предупреждение',
			freezeTitle: 'Предупреждение о заморозках',
			dismiss: 'Закрыть оповещение'
		}
	}
};

export function getTranslations(lang: Language = DEFAULT_LANGUAGE): Translations {
	return translations[lang] ?? translations[DEFAULT_LANGUAGE];
}

export function t(
	path: string,
	lang: Language = DEFAULT_LANGUAGE,
	params?: Record<string, string | number>
): string {
	const dict = translations[lang] ?? translations[DEFAULT_LANGUAGE];
	const parts = path.split('.');
	let current: unknown = dict;

	for (const part of parts) {
		if (current && typeof current === 'object' && part in current) {
			current = (current as Record<string, unknown>)[part];
		} else {
			return path;
		}
	}

	if (typeof current !== 'string') {
		return path;
	}

	if (!params) {
		return current;
	}

	return current.replace(/\{(\w+)\}/g, (_, key) => {
		return key in params ? String(params[key]) : `{${key}}`;
	});
}
