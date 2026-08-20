<script lang="ts">
	import { onMount } from 'svelte';
	import { openSearch } from '$lib/components/SearchSheet.svelte';
	import { getForecastStore } from '$lib/stores/context';
	import { getLocationStore } from '$lib/stores/location.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';

	const INSTALL_HINT_KEY = 'weather:installHintSeen';

	const forecast = getForecastStore();
	const location = getLocationStore();
	const settings = getSettingsStore();

	const refreshing = $derived(forecast.refreshing);

	// Hydration gate: city and lastUpdated come from localStorage, so the
	// server render shows neutral placeholders until the client mounts
	// (same pattern as the favorites route).
	let mounted = $state(false);

	// §35: PWA install hint — Safari iOS, not standalone, once, plain card.
	let showInstallHint = $state(false);

	function isSafariIos(): boolean {
		if (typeof navigator === 'undefined') return false;
		const ua = navigator.userAgent;
		if (!/Safari/.test(ua) || /CriOS|FxiOS/.test(ua)) return false;
		// iPhone/iPad/iPod, plus iPadOS 13+ which reports a Macintosh desktop UA.
		return /iPhone|iPad|iPod/.test(ua) || (navigator.maxTouchPoints > 0 && /Macintosh/.test(ua));
	}

	function isStandalone(): boolean {
		if (typeof window === 'undefined') return false;
		if (window.matchMedia('(display-mode: standalone)').matches) return true;
		return (navigator as Navigator & { standalone?: boolean }).standalone === true;
	}

	onMount(() => {
		mounted = true;
		void location.syncPermission();
		// The hint only ever renders inside Settings, so «unless opened from
		// Settings» is satisfied by construction; the persisted flag enforces
		// «no more than once».
		if (!isSafariIos() || isStandalone()) return;
		let seen = false;
		try {
			seen = localStorage.getItem(INSTALL_HINT_KEY) === '1';
			if (!seen) localStorage.setItem(INSTALL_HINT_KEY, '1');
		} catch {
			/* storage unavailable — show anyway, retry next visit */
		}
		showInstallHint = !seen;
	});

	function refresh(): void {
		forecast.refresh();
	}

	// Device-event timestamp (epoch ms), not an Open-Meteo wall-time string:
	// `new Date()` is correct here; the format.ts helpers are for wall-time only.
	const LAST_UPDATED_FORMAT = new Intl.DateTimeFormat('ru-RU', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});

	const lastUpdatedText = $derived(
		mounted && settings.lastUpdated !== null
			? LAST_UPDATED_FORMAT.format(new Date(settings.lastUpdated))
			: '—'
	);

	const cityName = $derived(mounted ? location.current.name : '…');

	const geoNote = $derived(
		mounted
			? location.geoState === 'denied'
				? 'Доступ к геолокации запрещён в браузере. Разрешите доступ в настройках и повторите попытку.'
				: location.geoState === 'unavailable'
					? 'Геолокация недоступна на этом устройстве'
					: location.geoState === 'error'
						? 'Не удалось определить местоположение (превышено время ожидания).'
						: null
			: null
	);
</script>

<svelte:head>
	<title>Настройки | Погода</title>
	<meta name="description" content="Настройки приложения Погода" />
</svelte:head>

<h1 class="sr-only">Настройки</h1>

<div class="settings">
	{#if showInstallHint}
		<div class="card hint">
			<div class="hint-title">Установить приложение</div>
			<div class="hint-text">Чтобы добавить на экран «Домой»: Поделиться → На экран «Домой»</div>
		</div>
	{/if}

	<div class="card group">
		<button
			class="row row-btn"
			type="button"
			onclick={openSearch}
			aria-label="Изменить город, текущий: {cityName}"
		>
			<span class="row-label">Город</span>
			<span class="row-value row-value-action">
				{cityName}
				<svg
					class="chevron"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
			</span>
		</button>
		<div class="row geo-row">
			<div class="geo-line">
				<span class="row-label">Геолокация</span>
				<button
					class="geo-btn"
					type="button"
					disabled={location.geoPending || location.geoState === 'unavailable'}
					aria-busy={location.geoPending}
					onclick={() => location.requestGeolocation()}
				>
					{#if location.geoPending}
						<span class="spinner geo-spinner" aria-hidden="true"></span>
						<span>Определяем…</span>
					{:else if location.geoState === 'error' || location.geoState === 'denied'}
						Повторить попытку
					{:else}
						Определить автоматически
					{/if}
				</button>
			</div>
			{#if geoNote}
				<div class="row-note" role="status">
					<span>{geoNote}</span>
					{#if location.geoState === 'denied' || location.geoState === 'error'}
						<button
							class="retry-btn"
							type="button"
							disabled={location.geoPending}
							onclick={() => location.requestGeolocation()}
						>
							Повторить
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div class="card group">
		<div class="row">
			<span class="row-label">Последнее обновление</span>
			{#if mounted && settings.lastUpdated !== null}
				<time class="row-value" datetime={new Date(settings.lastUpdated).toISOString()}>
					{lastUpdatedText}
				</time>
			{:else}
				<span class="row-value">—</span>
			{/if}
		</div>
		<div class="row">
			<button
				class="refresh-btn"
				type="button"
				disabled={refreshing}
				aria-busy={refreshing}
				onclick={refresh}
			>
				{#if refreshing}
					<span class="spinner" aria-hidden="true"></span>
				{/if}
				{refreshing ? 'Обновляем…' : 'Обновить'}
			</button>
		</div>
	</div>

	<div class="card group">
		<div class="row">
			<span class="row-label">Данные</span>
			<a class="row-link" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
				Open-Meteo
			</a>
		</div>
		<div class="row">
			<span class="row-label">Иконки погоды</span>
			<a
				class="row-link"
				href="https://github.com/basmilius/meteocons"
				target="_blank"
				rel="noopener noreferrer"
			>
				Meteocons
			</a>
		</div>
		<div class="row">
			<span class="row-label">Версия</span>
			<span class="row-value">{__BUILD_DATE__}</span>
		</div>
	</div>
</div>

<style>
	.settings {
		display: grid;
		gap: var(--space-4);
		max-width: 100%;
		min-width: 0;
	}

	.group {
		padding: var(--space-2) var(--space-4);
		max-width: 100%;
		min-width: 0;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 48px;
		border-bottom: 1px solid var(--divider);
		min-width: 0;
	}

	.row:last-child {
		border-bottom: none;
	}

	.row-label {
		font-size: 15px;
	}

	.row-value {
		font-size: 15px;
		color: var(--text-secondary);
		text-align: right;
	}

	.row-btn {
		width: 100%;
		border: none;
		border-bottom: 1px solid var(--divider);
		background: none;
		padding: 0;
		color: inherit;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
		border-radius: 0;
	}

	.row-btn:active {
		background: var(--divider);
	}

	.row-value-action {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	.chevron {
		width: 16px;
		height: 16px;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	/* ---------- geolocation row ---------- */
	.geo-row {
		flex-direction: column;
		align-items: stretch;
		gap: 0;
	}

	.geo-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 48px;
		min-width: 0;
	}

	.geo-btn {
		min-height: 44px;
		padding: 0 var(--space-4);
		border: none;
		border-radius: var(--radius-control);
		background: none;
		color: var(--accent-strong);
		font-size: 15px;
		font-weight: 500;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		cursor: pointer;
	}

	.geo-btn:active {
		background: var(--divider);
	}

	.geo-btn:disabled {
		color: var(--text-secondary);
		opacity: 0.6;
		cursor: not-allowed;
	}

	.geo-spinner {
		border-color: rgba(0, 122, 255, 0.25);
		border-top-color: var(--accent-strong);
	}

	.row-note {
		font-size: 13px;
		color: var(--text-secondary);
		padding-bottom: var(--space-2);
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.retry-btn {
		display: inline-block;
		margin-left: var(--space-1);
		padding: 2px var(--space-2);
		border: 1px solid var(--accent);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--accent-strong);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.retry-btn:active {
		background: var(--divider);
	}

	.retry-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ---------- refresh ---------- */
	.refresh-btn {
		width: 100%;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		border: none;
		border-radius: var(--radius-control);
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
	}

	.refresh-btn:active {
		opacity: 0.85;
	}

	.refresh-btn:disabled {
		opacity: 0.6;
	}

	.spinner {
		width: 12px;
		height: 12px;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ---------- about links ---------- */
	.row-link {
		color: var(--accent-strong);
		font-size: 15px;
		font-weight: 500;
		text-decoration: none;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}

	/* ---------- install hint ---------- */
	.hint {
		padding: var(--space-4);
		background: #eff6ff;
		border-color: #bfdbfe;
	}

	.hint-title {
		font-size: 15px;
		font-weight: 600;
	}

	.hint-text {
		font-size: 14px;
		color: var(--text-secondary);
		margin-top: 2px;
	}
</style>
