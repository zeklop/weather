<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { getForecast } from '$lib/api/openMeteo';
	import { cacheKey, createForecastCache, statusOf } from '$lib/cache/forecastCache';
	import { getFavoritesStore } from '$lib/stores/favorites.svelte';
	import { getLocationStore } from '$lib/stores/location.svelte';
	import WeatherIcon from '$lib/components/WeatherIcon.svelte';
	import { getWeatherVisual } from '$lib/weather/wmo';
	import { isDay } from '$lib/weather/dayNight';
	import { formatTimeShort } from '$lib/weather/format';
	import { formatTemp } from '$lib/weather/units';
	import type { CachedForecast, Location } from '$lib/types';

	const favorites = getFavoritesStore();
	const location = getLocationStore();

	// A fresh cache instance over the shared localStorage layer — the same key
	// the forecast store uses, so favorites share (and warm) its entries.
	const cache = typeof localStorage !== 'undefined' ? createForecastCache(localStorage) : null;

	type Row = { entry: CachedForecast | null; fetching: boolean; failed: boolean };
	const rows = $state(new Map<string, Row>());

	// SSR/hydration gate: the favorites list lives in localStorage, so server
	// and client can't agree on it — render a skeleton until the client mounts.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});

	function load(loc: Location): void {
		if (cache === null) return;
		const key = cacheKey(loc.latitude, loc.longitude);
		const entry = cache.get(key);
		const refetch = entry === null || statusOf(entry) !== 'fresh';
		rows.set(loc.id, { entry, fetching: refetch, failed: false });
		if (!refetch) return;

		getForecast(loc).then(
			(payload) => {
				if (!favorites.isFavorite(loc)) return;
				const now = Date.now();
				const stamped = { ...payload, fetchedAt: now };
				const next: CachedForecast = { fetchedAt: now, location: loc, payload: stamped };
				cache.set(key, next);
				rows.set(loc.id, { entry: next, fetching: false, failed: false });
			},
			() => {
				const current = rows.get(loc.id);
				if (current === undefined) return;
				// A failed refresh keeps the cached row; only a row with nothing
				// to show becomes an error state.
				rows.set(loc.id, { ...current, fetching: false, failed: current.entry === null });
			}
		);
	}

	// Client-side only: load every favorite that has no row yet. Runs once on
	// open and covers favorites toggled from the header star while on the page.
	$effect(() => {
		const favoriteList = favorites.list;
		untrack(() => {
			for (const loc of favoriteList) {
				if (!rows.has(loc.id)) load(loc);
			}
		});
	});

	function remove(id: string): void {
		favorites.removeFavorite(id);
		rows.delete(id);
	}

	function select(loc: Location): void {
		location.setLocation(loc);
		goto(base + '/');
	}

	function subLabel(loc: Location): string {
		const parts = [...new Set([loc.admin1, loc.country])].filter(
			(value): value is string => value != null && value !== '' && value !== loc.name
		);
		return parts.join(', ');
	}

	const list = $derived(favorites.list.map((loc) => ({ loc, row: rows.get(loc.id) })));
	const busy = $derived(list.some(({ row }) => row !== undefined && row.entry === null && row.fetching));

	function rowIconName(entry: CachedForecast): string {
		const v = getWeatherVisual(entry.payload.current.weatherCode);
		const d = entry.payload.daily.find((day) => day.date === entry.payload.current.time.slice(0, 10));
		const day = isDay(entry.payload.current.time, d?.sunrise ?? null, d?.sunset ?? null).isDay;
		return day ? v.iconDay : v.iconNight;
	}
</script>

<h1 class="sr-only">Избранное</h1>

{#if !mounted}
	<div class="card list" aria-busy="true">
		{#each [1, 2, 3] as _}
			<div class="sk-row">
				<div class="sk sk-block"></div>
				<div class="sk sk-line w50"></div>
				<div class="sk sk-line w30"></div>
			</div>
		{/each}
		<span class="sr-only">Загрузка избранного</span>
	</div>
{:else if list.length === 0}
	<div class="card state">
		<div class="state-icon" aria-hidden="true">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path
					d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"
				/>
			</svg>
		</div>
		<div class="state-title">Нет избранных городов</div>
		<div class="state-text">Нажмите звёздочку в шапке на главной, чтобы добавить город.</div>
		<a class="primary-btn" href={base + '/'}>На главную</a>
	</div>
{:else}
	<div class="card list" aria-busy={busy}>
		{#each list as { loc, row }}
			{@const sub = subLabel(loc)}
			<div class="fav-row">
				<button class="fav-main" type="button" onclick={() => select(loc)}>
					<WeatherIcon name={row?.entry ? rowIconName(row.entry) : 'cloudy'} size={26} />
					{#if row?.entry}
						<span class="sr-only">{getWeatherVisual(row.entry.payload.current.weatherCode).labelRu}</span>
					{/if}
					<span class="fav-info">
						<span class="fav-name">{loc.name}</span>
						{#if sub !== ''}
							<span class="fav-sub">{sub}</span>
						{/if}
					</span>
					<span class="fav-side">
						{#if row?.entry}
							<span class="fav-temp">{formatTemp(row.entry.payload.current.temperature)}</span>
							<span class="fav-time">{formatTimeShort(row.entry.payload.current.time)}</span>
						{:else if row?.failed}
							<span class="fav-error">Не удалось загрузить</span>
						{:else}
							<span class="sk sk-temp"></span>
						{/if}
					</span>
				</button>
				<button
					class="fav-remove"
					type="button"
					aria-label={`Убрать ${loc.name} из избранного`}
					onclick={() => remove(loc.id)}
				>
					<svg
						class="fav-trash"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M3 6h18" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
						<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						<path d="M10 11v6" />
						<path d="M14 11v6" />
					</svg>
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.list {
		padding: var(--space-2) var(--space-4);
	}

	.fav-row {
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--divider);
	}

	.fav-row:last-child {
		border-bottom: none;
	}

	.fav-main {
		flex: 1;
		min-width: 0;
		display: grid;
		grid-template-columns: 26px minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-3);
		min-height: 56px;
		padding: var(--space-2) 0;
		background: none;
		border: none;
		text-align: left;
		border-radius: var(--radius-control);
	}

	.fav-main:active {
		background: var(--divider);
	}

	.fav-info {
		min-width: 0;
	}

	.fav-name {
		display: block;
		font-size: 15px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.fav-sub {
		display: block;
		font-size: 13px;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.fav-side {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
	}

	.fav-temp {
		font-size: 17px;
		font-weight: 600;
	}

	.fav-time {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.fav-error {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.fav-remove {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		margin-left: var(--space-1);
		display: grid;
		place-items: center;
		background: none;
		border: none;
		border-radius: var(--radius-control);
		color: var(--text-secondary);
	}

	.fav-remove:active {
		background: var(--divider);
	}

	.fav-trash {
		width: 20px;
		height: 20px;
	}

	/* ---------- state (empty) ---------- */
	.state {
		padding: var(--space-7) var(--space-5);
		text-align: center;
	}

	.state-icon {
		display: grid;
		place-items: center;
		width: 84px;
		height: 84px;
		margin: 0 auto var(--space-4);
		border-radius: 50%;
		background: rgba(59, 130, 246, 0.1);
		color: var(--accent);
	}

	.state-icon svg {
		width: 40px;
		height: 40px;
	}

	.state-title {
		font-size: 17px;
		font-weight: 600;
	}

	.state-text {
		color: var(--text-secondary);
		font-size: 15px;
		margin-top: var(--space-1);
		margin-bottom: var(--space-5);
	}

	.primary-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0 var(--space-4);
		border: none;
		border-radius: var(--radius-control);
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		text-decoration: none;
	}

	.primary-btn:active {
		opacity: 0.85;
	}

	/* ---------- skeleton ---------- */
	.sk {
		background: var(--divider);
		border-radius: 8px;
		animation: sk-pulse 1.2s ease-in-out infinite;
	}

	@keyframes sk-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.45;
		}
	}

	.sk-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 56px;
		border-bottom: 1px solid var(--divider);
	}

	.sk-row:last-child {
		border-bottom: none;
	}

	.sk-block {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.sk-line {
		height: 14px;
	}

	.w30 {
		width: 30%;
	}

	.w50 {
		width: 50%;
	}

	.sk-temp {
		width: 44px;
		height: 14px;
	}
</style>
