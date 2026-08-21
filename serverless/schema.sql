-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    endpoint_hash TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    city_name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    language TEXT NOT NULL DEFAULT 'en',
    platform TEXT NOT NULL DEFAULT 'desktop',
    alert_types TEXT NOT NULL DEFAULT '{"rain":true,"freeze":true,"severe":true,"quietHours":true}',
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    last_alert_sent_at INTEGER DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_coords ON subscriptions (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_subscriptions_last_seen ON subscriptions (last_seen_at);

-- Privacy-first anonymous events
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    install_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    platform TEXT NOT NULL,
    city_name TEXT NOT NULL,
    lang TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_install ON analytics_events (install_id);

-- Alert delivery history & dedup
CREATE TABLE IF NOT EXISTS alert_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_key TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    recipients_count INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_history_dedup ON alert_history (city_key, alert_type, timestamp);
