export interface Env {
	DB: D1Database;
	PUBLIC_VAPID_KEY?: string;
	VAPID_PRIVATE_KEY?: string;
	ADMIN_TOKEN?: string;
	/** Base path of the deployed frontend, e.g. "/weather" or "" */
	APP_BASE_PATH?: string;
	/** Comma-separated list of allowed browser origins for CORS; empty = permissive (dev only) */
	APP_ORIGIN?: string;
	[key: string]: unknown;
}

export interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
	exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = unknown>(colName?: string): Promise<T | null>;
	run<T = unknown>(): Promise<D1Result<T>>;
	all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
	results?: T[];
	success: boolean;
	error?: string;
	meta?: {
		changes?: number;
		last_row_id?: number;
		duration?: number;
	};
}

export interface D1ExecResult {
	count: number;
	duration: number;
}

export interface PushSubscriptionKeys {
	p256dh: string;
	auth: string;
}

export interface PushSubscriptionJSON {
	endpoint: string;
	keys: PushSubscriptionKeys;
}

export interface SubscriptionAlertFlags {
	rain: boolean;
	freeze: boolean;
	severe: boolean;
	quietHours: boolean;
}

export interface SubscribeRequestBody {
	endpoint: string;
	keys: PushSubscriptionKeys;
	city_name: string;
	latitude: number;
	longitude: number;
	timezone: string;
	language?: 'en' | 'ru';
	platform?: 'ios' | 'android' | 'desktop';
	alert_types?: Partial<SubscriptionAlertFlags>;
}

export interface UnsubscribeRequestBody {
	endpoint: string;
}

export interface PingRequestBody {
	install_id: string;
	platform: 'ios' | 'android' | 'desktop';
	city_name: string;
	lang: 'en' | 'ru';
}

export interface SubscriptionRecord {
	endpoint_hash: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	city_name: string;
	latitude: number;
	longitude: number;
	timezone: string;
	language: string;
	platform: string;
	alert_types: string;
	created_at: number;
	last_seen_at: number;
	last_alert_sent_at: number | null;
}

export interface AnalyticsEventRecord {
	id: number;
	install_id: string;
	event_type: 'install_open' | 'push_subscribed' | 'push_unsubscribed' | 'alert_sent';
	platform: string;
	city_name: string;
	lang: string;
	timestamp: number;
}

export interface AlertHistoryRecord {
	id: number;
	city_key: string;
	alert_type: string;
	recipients_count: number;
	timestamp: number;
}

export interface StatsSummary {
	totalSubscribers: number;
	activeLast7Days: number;
	alertsSentLast7Days: number;
	platforms: {
		ios: number;
		android: number;
		desktop: number;
	};
	languages: {
		ru: number;
		en: number;
	};
	dailyActivity: Array<{
		day: string;
		opens: number;
		alerts: number;
	}>;
	funnel: {
		totalInstalls: number;
		pushOptIns: number;
	};
	alertTypes: Array<{
		alertType: string;
		count: number;
		recipients: number;
	}>;
	health: {
		deadSubscriptions: number;
		autoRemovedLast7Days: number;
		neverAlerted: number;
	};
	topCities: Array<{
		cityName: string;
		subscribers: number;
	}>;
	recentAlerts: Array<{
		alertType: string;
		cityName: string;
		recipientsCount: number;
		timestamp: number;
	}>;
}

export interface WeatherAlertMessage {
	id: string;
	type: 'precipitation' | 'frost' | 'severe_wind' | 'thunderstorm';
	severity: 'info' | 'warning' | 'severe';
	title: string;
	message: string;
	icon: string;
	url?: string;
}
