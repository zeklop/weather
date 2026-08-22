export type Language = 'en' | 'ru';

export const DEFAULT_LANGUAGE: Language = 'en';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'ru'] as const;

// First-run language: follow the browser when the user hasn't chosen one yet.
// Outside the browser (SSR/prerender) there is nothing to detect → DEFAULT_LANGUAGE.
export function detectBrowserLanguage(): Language {
	if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
	const candidates = [navigator.language, ...(navigator.languages ?? [])];
	for (const tag of candidates) {
		if (!tag) continue;
		const base = tag.toLowerCase().split('-')[0];
		if ((SUPPORTED_LANGUAGES as readonly string[]).includes(base)) return base as Language;
	}
	return DEFAULT_LANGUAGE;
}

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
		appWebsite: string;
		weatherIcons: string;
		version: string;
		installApp: string;
		installAppHint: string;
		author: string;
		badgeLabel: string;
		alertsSection: string;
		alertsEnabled: string;
		pushNotifications: string;
		unitsTemperature: string;
		unitsPressure: string;
		unitsWind: string;
		unitsPrecipitation: string;
		precipitationAlerts: string;
		severeAlerts: string;
		freezeAlerts: string;
		quietHours: string;
		quietHoursDesc: string;
		customizeSectionsTitle: string;
		customizeSectionsDesc: string;
		moveUpAria: string;
		moveDownAria: string;
		resetSections: string;
		resetSectionsSuccess: string;
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
		mph: string;
		mmhg: string;
		inhg: string;
		hpa: string;
		mm: string;
		in: string;
		km: string;
		celsius: string;
	};
	alerts: {
		precipitationTitle: string;
		severeTitle: string;
		freezeTitle: string;
		dismiss: string;
	};
	push: {
		onboardingTitle: string;
		onboardingText: string;
		enableBtn: string;
		laterBtn: string;
		errorPrefix: string;
		disableError: string;
	};
	stats: {
		title: string;
		subtitle: string;
		totalSubscribers: string;
		active7Days: string;
		alertsSent7Days: string;
		platforms: string;
		languages: string;
		activityTitle: string;
		legendOpens: string;
		legendAlerts: string;
		days: string;
		funnelTitle: string;
		funnelInstalls: string;
		funnelOptIns: string;
		alertTypesTitle: string;
		healthTitle: string;
		healthDead: string;
		healthAutoRemoved: string;
		healthNeverAlerted: string;
		iosStandalone: string;
		android: string;
		desktop: string;
		topCities: string;
		recentAlerts: string;
		noAlerts: string;
		noData: string;
		lock: string;
		tokenPlaceholder: string;
		unlockBtn: string;
		unauthorized: string;
		loading: string;
		subscribersCount: string;
		recipients: string;
		broadcast: {
			title: string;
			description: string;
			titleLabel: string;
			titlePlaceholder: string;
			bodyLabel: string;
			bodyPlaceholder: string;
			languageLabel: string;
			langAll: string;
			langRu: string;
			langEn: string;
			cityLabel: string;
			cityAll: string;
			sendBtn: string;
			dryRunLabel: string;
			countBtn: string;
			confirmText: string;
			resultLine: string;
			dryRunResult: string;
			sendError: string;
		};
	};
	sections: {
		hero: string;
		alerts: string;
		precipHeuristic: string;
		hourlyRail: string;
		precipChart: string;
		metrics: string;
		airQuality: string;
		astronomy: string;
		marine: string;
		today: string;
		dailyForecast: string;
	};
	astronomy: {
		title: string;
		sunAndMoon: string;
		sunrise: string;
		sunset: string;
		daylight: string;
		untilSunset: string;
		untilSunrise: string;
		polarDay: string;
		polarNight: string;
		moonPhase: string;
		illumination: string;
		new_moon: string;
		waxing_crescent: string;
		first_quarter: string;
		waxing_gibbous: string;
		full_moon: string;
		waning_gibbous: string;
		last_quarter: string;
		waning_crescent: string;
		daysToFullMoon: string;
		daysToNewMoon: string;
		todayFullMoon: string;
		todayNewMoon: string;
	};
	scrubber: {
		forecastFor: string;
		forecastForTomorrow: string;
		resetNow: string;
		srSelected: string;
	};
	airQualityDetails: {
		title: string;
		subtitle: string;
		detailsBtn: string;
		hideDetailsBtn: string;
		who24hNote: string;
		pollenTitle: string;
		noAllergens: string;
		noPollenCoverage: string;
		dominantAllergen: string;
		good: string;
		fair: string;
		moderate: string;
		poor: string;
		very_poor: string;
		hazardous: string;
		low: string;
		high: string;
		very_high: string;
		none: string;
		pm2_5: string;
		pm10: string;
		nitrogenDioxide: string;
		sulphurDioxide: string;
		ozone: string;
		carbonMonoxide: string;
		alder: string;
		birch: string;
		grass: string;
		mugwort: string;
		olive: string;
		ragweed: string;
	};
	ptr: {
		pull: string;
		release: string;
		loading: string;
		success: string;
		error: string;
	};
	marineInfo: {
		title: string;
		waterTemp: string;
		waves: string;
		coastal: string;
	};
}

export const translations: Record<Language, Translations> = {
	en: {
		app: {
			name: 'Gradus',
			title: 'Gradus',
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
			description: 'Gradus app settings',
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
			appWebsite: 'App website',
			weatherIcons: 'Weather icons',
			version: 'Version',
			installApp: 'Install App',
			installAppHint: 'To add to Home Screen: Share → Add to Home Screen',
			author: 'Created by Zeklop',
			badgeLabel: 'Show temperature on app icon',
			alertsSection: 'Weather Alerts',
			alertsEnabled: 'Allow notifications',
			pushNotifications: 'Server push alerts',
			unitsTemperature: 'Temperature',
			unitsPressure: 'Pressure',
			unitsWind: 'Wind speed',
			unitsPrecipitation: 'Precipitation',
			precipitationAlerts: 'Precipitation (rain/snow)',
			severeAlerts: 'Severe weather warnings',
			freezeAlerts: 'Frost & temperature drop',
			quietHours: 'Quiet hours (23:00 – 07:00)',
			quietHoursDesc: 'Suppresses non-critical alerts at night',
			customizeSectionsTitle: 'Home Screen Layout',
			customizeSectionsDesc: 'Rearrange or hide forecast sections',
			moveUpAria: 'Move section {name} up',
			moveDownAria: 'Move section {name} down',
			resetSections: 'Reset sections to default',
			resetSectionsSuccess: 'Sections layout reset to default'
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
			installTitle: 'Install Gradus',
			installBtn: 'Install',
			bannerAndroidText: 'Install Gradus for quick access and offline mode',
			bannerIosText: 'Add Gradus to your Home Screen for the best experience',
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
			mph: 'mph',
			mmhg: 'mmHg',
			inhg: 'inHg',
			hpa: 'hPa',
			mm: 'mm',
			in: 'in',
			km: 'km',
			celsius: '°C'
		},
		alerts: {
			precipitationTitle: 'Precipitation Alert',
			severeTitle: 'Severe Weather Alert',
			freezeTitle: 'Freeze Warning',
			dismiss: 'Dismiss alert'
		},
		push: {
			onboardingTitle: 'Smart Weather Alerts',
			onboardingText: 'Enable notifications to get timely warnings about upcoming rain, snow, and freeze.',
			enableBtn: 'Enable',
			laterBtn: 'Later',
			errorPrefix: 'Could not enable notifications',
			disableError: 'Could not disable notifications'
		},
		stats: {
			title: 'Analytics & Subscriptions',
			subtitle: 'Privacy-first telemetry and Web Push distribution metrics',
			totalSubscribers: 'Total Subscribers',
			active7Days: 'Active Installs (7 Days)',
			alertsSent7Days: 'Alerts Sent (7 Days)',
			platforms: 'Platform Distribution',
			languages: 'Languages',
			activityTitle: 'Activity — Last 30 Days',
			legendOpens: 'Opens',
			legendAlerts: 'Alerts',
			days: '30 days',
			funnelTitle: 'Push Funnel',
			funnelInstalls: 'Installs',
			funnelOptIns: 'Push Opt-ins',
			alertTypesTitle: 'Alert Types',
			healthTitle: 'Subscription Health',
			healthDead: 'Stale (>90 days)',
			healthAutoRemoved: 'Auto-removed (7 days)',
			healthNeverAlerted: 'Never alerted',
			iosStandalone: 'iOS (Standalone PWA)',
			android: 'Android Chrome',
			desktop: 'Desktop Browser',
			topCities: 'Top 10 Subscriber Cities',
			recentAlerts: 'Recent Dispatched Alerts',
			noAlerts: 'No alerts sent recently',
			noData: 'No data yet',
			lock: 'Lock',
			tokenPlaceholder: 'Enter ADMIN_TOKEN...',
			unlockBtn: 'Unlock Stats',
			unauthorized: 'Invalid admin token or unauthorized access.',
			loading: 'Loading analytics data...',
			subscribersCount: 'subscribers',
			recipients: 'recipients',
			broadcast: {
				title: 'Manual Broadcast',
				description: 'Send a push notification to matching subscribers immediately.',
				titleLabel: 'Title (optional)',
				titlePlaceholder: 'Notification title',
				bodyLabel: 'Message',
				bodyPlaceholder: 'Notification text (max 500 characters)',
				languageLabel: 'Language',
				langAll: 'All languages',
				langRu: 'Russian',
				langEn: 'English',
				cityLabel: 'City',
				cityAll: 'All cities',
				sendBtn: 'Send Broadcast',
				dryRunLabel: 'Dry run (no sending)',
				countBtn: 'Count Recipients',
				confirmText: 'Send broadcast to {target}? Message length: {length} characters.',
				resultLine: 'Targeted: {targeted}, sent: {sent}, failed: {failed}, removed: {removed}',
				dryRunResult: 'Dry run: {targeted} recipients match the filters',
				sendError: 'Broadcast failed'
			}
		},
		sections: {
			hero: 'Current weather',
			alerts: 'Weather alerts',
			precipHeuristic: 'Next 2 hours precipitation',
			hourlyRail: 'Hourly forecast',
			precipChart: '24-hour precipitation chart',
			metrics: 'Weather parameters',
			airQuality: 'Air quality & Pollen',
			astronomy: 'Sun & Moon',
			marine: 'Water temperature',
			today: 'Today summary',
			dailyForecast: '7-day forecast'
		},
		astronomy: {
			title: 'Sun & Moon',
			sunAndMoon: 'Sun & Moon',
			sunrise: 'Sunrise',
			sunset: 'Sunset',
			daylight: 'Daylight',
			untilSunset: 'Sunset in {time}',
			untilSunrise: 'Sunrise in {time}',
			polarDay: 'Polar day (sun does not set)',
			polarNight: 'Polar night (sun does not rise)',
			moonPhase: 'Moon Phase',
			illumination: 'Illumination',
			new_moon: 'New Moon',
			waxing_crescent: 'Waxing Crescent',
			first_quarter: 'First Quarter',
			waxing_gibbous: 'Waxing Gibbous',
			full_moon: 'Full Moon',
			waning_gibbous: 'Waning Gibbous',
			last_quarter: 'Last Quarter',
			waning_crescent: 'Waning Crescent',
			daysToFullMoon: 'Full moon in ~{days} d.',
			daysToNewMoon: 'New moon in ~{days} d.',
			todayFullMoon: 'Full moon today',
			todayNewMoon: 'New moon today'
		},
		scrubber: {
			forecastFor: 'Forecast for {time}',
			forecastForTomorrow: 'Forecast for tomorrow, {time}',
			resetNow: '✕ Now',
			srSelected: 'Selected forecast for {time}: {temp}, {condition}'
		},
		airQualityDetails: {
			title: 'Air Quality & Pollen',
			subtitle: 'European AQI index & WHO standards',
			detailsBtn: 'Detailed breakdown',
			hideDetailsBtn: 'Hide details',
			who24hNote: 'Thresholds based on WHO 2021 24h guidelines',
			pollenTitle: 'Pollen & Allergens',
			noAllergens: 'No active allergens detected',
			noPollenCoverage: 'Pollen data unavailable for this region',
			dominantAllergen: 'Main allergen: {name} ({level})',
			good: 'Good',
			fair: 'Fair',
			moderate: 'Moderate',
			poor: 'Poor',
			very_poor: 'Very Poor',
			hazardous: 'Hazardous',
			low: 'Low',
			high: 'High',
			very_high: 'Very High',
			none: 'None',
			pm2_5: 'Fine particles (PM2.5)',
			pm10: 'Inhalable particles (PM10)',
			nitrogenDioxide: 'Nitrogen dioxide (NO₂)',
			sulphurDioxide: 'Sulphur dioxide (SO₂)',
			ozone: 'Ozone (O₃)',
			carbonMonoxide: 'Carbon monoxide (CO)',
			alder: 'Alder',
			birch: 'Birch',
			grass: 'Grasses',
			mugwort: 'Mugwort',
			olive: 'Olive',
			ragweed: 'Ragweed'
		},
		ptr: {
			pull: 'Pull down to refresh',
			release: 'Release to update',
			loading: 'Updating forecast…',
			success: 'Forecast updated',
			error: 'Failed to update'
		},
		marineInfo: {
			title: 'Water Temperature',
			waterTemp: 'Sea water: {temp}',
			waves: 'Waves: {height}',
			coastal: 'Coastal water'
		}
	},
	ru: {
		app: {
			name: 'Градус',
			title: 'Градус',
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
			description: 'Настройки приложения Градус',
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
			appWebsite: 'Сайт приложения',
			weatherIcons: 'Иконки погоды',
			version: 'Версия',
			installApp: 'Установить приложение',
			installAppHint: 'Чтобы добавить на экран «Домой»: Поделиться → На экран «Домой»',
			author: 'Автор: Zeklop',
			badgeLabel: 'Температура на иконке приложения',
			alertsSection: 'Погодные оповещения',
			alertsEnabled: 'Разрешить оповещения',
			pushNotifications: 'Серверные push-уведомления',
			unitsTemperature: 'Температура',
			unitsPressure: 'Давление',
			unitsWind: 'Скорость ветра',
			unitsPrecipitation: 'Осадки',
			precipitationAlerts: 'Осадки (дождь/снег)',
			severeAlerts: 'Штормовые предупреждения',
			freezeAlerts: 'Гололёд и перепады температуры',
			quietHours: 'Тихие часы (23:00 – 07:00)',
			quietHoursDesc: 'Заглушает обычные оповещения ночью',
			customizeSectionsTitle: 'Порядок и видимость блоков',
			customizeSectionsDesc: 'Настройка порядка и видимости секций на Главной',
			moveUpAria: 'Переместить блок «{name}» выше',
			moveDownAria: 'Переместить блок «{name}» ниже',
			resetSections: 'Сбросить порядок по умолчанию',
			resetSectionsSuccess: 'Порядок блоков сброшен'
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
			installTitle: 'Установить приложение Градус',
			installBtn: 'Установить',
			bannerAndroidText: 'Установите приложение Градус для быстрого доступа и оффлайн-режима',
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
			mph: 'миль/ч',
			mmhg: 'мм рт. ст.',
			inhg: 'дюйм рт. ст.',
			hpa: 'гПа',
			mm: 'мм',
			in: 'дюйм',
			km: 'км',
			celsius: '°C'
		},
		alerts: {
			precipitationTitle: 'Приближение осадков',
			severeTitle: 'Штормовое предупреждение',
			freezeTitle: 'Предупреждение о заморозках',
			dismiss: 'Закрыть оповещение'
		},
		push: {
			onboardingTitle: 'Умные оповещения о погоде',
			onboardingText: 'Включите уведомления, чтобы вовремя узнавать о дожде, снеге и заморозках.',
			enableBtn: 'Включить',
			laterBtn: 'Позже',
			errorPrefix: 'Не удалось включить оповещения',
			disableError: 'Не удалось отключить оповещения'
		},
		stats: {
			title: 'Аналитика и подписки',
			subtitle: 'Privacy-First телеметрия и статистика доставки фоновых Web Push алертов',
			totalSubscribers: 'Всего подписчиков',
			active7Days: 'Активные установки (7 дней)',
			alertsSent7Days: 'Отправлено алертов (7 дней)',
			platforms: 'Распределение платформ',
			languages: 'Языки',
			activityTitle: 'Активность за 30 дней',
			legendOpens: 'Открытия',
			legendAlerts: 'Алерты',
			days: '30 дней',
			funnelTitle: 'Воронка пушей',
			funnelInstalls: 'Установок',
			funnelOptIns: 'Согласились на пуши',
			alertTypesTitle: 'Типы алертов',
			healthTitle: 'Здоровье подписок',
			healthDead: 'Мёртвые (>90 дней)',
			healthAutoRemoved: 'Автоудалены (7 дней)',
			healthNeverAlerted: 'Без единого алерта',
			iosStandalone: 'iOS (Standalone PWA)',
			android: 'Android Chrome',
			desktop: 'Desktop Browser',
			topCities: 'Топ-10 городов по подпискам',
			recentAlerts: 'Последние отправленные алерты',
			noAlerts: 'Нет недавно отправленных алертов',
			noData: 'Пока нет данных',
			lock: 'Заблокировать',
			tokenPlaceholder: 'Введите ADMIN_TOKEN...',
			unlockBtn: 'Открыть статистику',
			unauthorized: 'Неверный токен администратора или доступ запрещен.',
			loading: 'Загрузка аналитики...',
			subscribersCount: 'подписчиков',
			recipients: 'получателей',
			broadcast: {
				title: 'Ручная рассылка',
				description: 'Отправить push-уведомление подходящим подписчикам немедленно.',
				titleLabel: 'Заголовок (необязательно)',
				titlePlaceholder: 'Заголовок уведомления',
				bodyLabel: 'Сообщение',
				bodyPlaceholder: 'Текст уведомления (до 500 символов)',
				languageLabel: 'Язык',
				langAll: 'Все языки',
				langRu: 'Русский',
				langEn: 'Английский',
				cityLabel: 'Город',
				cityAll: 'Все города',
				sendBtn: 'Отправить рассылку',
				dryRunLabel: 'Пробный прогон (без отправки)',
				countBtn: 'Подсчитать получателей',
				confirmText: 'Отправить рассылку на {target}? Длина сообщения: {length} символов.',
				resultLine: 'Целей: {targeted}, отправлено: {sent}, ошибок: {failed}, удалено: {removed}',
				dryRunResult: 'Пробный прогон: под фильтры попадает {targeted} получателей',
				sendError: 'Ошибка рассылки'
			}
		},
		sections: {
			hero: 'Текущая погода',
			alerts: 'Погодные оповещения',
			precipHeuristic: 'Осадки в ближайшие 2 часа',
			hourlyRail: 'Почасовой прогноз',
			precipChart: 'График осадков на 24 часа',
			metrics: 'Параметры погоды',
			airQuality: 'Качество воздуха и пыльца',
			astronomy: 'Солнце и Луна',
			marine: 'Температура воды',
			today: 'Сводка на сегодня',
			dailyForecast: 'Прогноз на 7 дней'
		},
		astronomy: {
			title: 'Солнце и Луна',
			sunAndMoon: 'Солнце и Луна',
			sunrise: 'Восход',
			sunset: 'Закат',
			daylight: 'Световой день',
			untilSunset: 'Закат через {time}',
			untilSunrise: 'Рассвет через {time}',
			polarDay: 'Полярный день (солнце не заходит)',
			polarNight: 'Полярная ночь (солнце не восходит)',
			moonPhase: 'Фаза Луны',
			illumination: 'Освещённость',
			new_moon: 'Новолуние',
			waxing_crescent: 'Молодая луна',
			first_quarter: 'Первая четверть',
			waxing_gibbous: 'Растущая луна',
			full_moon: 'Полнолуние',
			waning_gibbous: 'Убывающая луна',
			last_quarter: 'Последняя четверть',
			waning_crescent: 'Старая луна',
			daysToFullMoon: 'Полнолуние через ~{days} дн.',
			daysToNewMoon: 'Новолуние через ~{days} дн.',
			todayFullMoon: 'Полнолуние сегодня',
			todayNewMoon: 'Новолуние сегодня'
		},
		scrubber: {
			forecastFor: 'Прогноз на {time}',
			forecastForTomorrow: 'Прогноз на завтра, {time}',
			resetNow: '✕ Сейчас',
			srSelected: 'Выбран прогноз на {time}: {temp}, {condition}'
		},
		airQualityDetails: {
			title: 'Качество воздуха и пыльца',
			subtitle: 'Индекс European AQI и нормативы ВОЗ',
			detailsBtn: 'Подробный состав воздуха',
			hideDetailsBtn: 'Скрыть подробности',
			who24hNote: 'Пороги рассчитаны по 24-часовым нормам ВОЗ 2021',
			pollenTitle: 'Пыльца и аллергены',
			noAllergens: 'Активных аллергенов не обнаружено',
			noPollenCoverage: 'Данные о пыльце недоступны для этого региона',
			dominantAllergen: 'Основной аллерген: {name} ({level})',
			good: 'Отличное',
			fair: 'Хорошее',
			moderate: 'Умеренное',
			poor: 'Плохое',
			very_poor: 'Очень плохое',
			hazardous: 'Опасное',
			low: 'Низкий',
			high: 'Высокий',
			very_high: 'Очень высокий',
			none: 'Отсутствует',
			pm2_5: 'Мелкодисперсная пыль (PM2.5)',
			pm10: 'Взвешенные частицы (PM10)',
			nitrogenDioxide: 'Диоксид азота (NO₂)',
			sulphurDioxide: 'Диоксид серы (SO₂)',
			ozone: 'Озон (O₃)',
			carbonMonoxide: 'Угарный газ (CO)',
			alder: 'Ольха',
			birch: 'Берёза',
			grass: 'Злаковые травы',
			mugwort: 'Полынь',
			olive: 'Олива',
			ragweed: 'Амброзия'
		},
		ptr: {
			pull: 'Потяните вниз для обновления',
			release: 'Отпустите для обновления',
			loading: 'Обновляем прогноз…',
			success: 'Прогноз обновлён',
			error: 'Не удалось обновить'
		},
		marineInfo: {
			title: 'Температура воды',
			waterTemp: 'Вода в море: {temp}',
			waves: 'Волны: {height}',
			coastal: 'У побережья'
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
