<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { getForecast } from '$lib/api/openMeteo';
	import { cacheKey, createForecastCache, statusOf } from '$lib/cache/forecastCache';
	import { openSearch } from '$lib/components/SearchSheet.svelte';
	import { getFavoritesStore } from '$lib/stores/favorites.svelte';
	import { getLocationStore } from '$lib/stores/location.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { t } from '$lib/i18n';
	import WeatherIcon from '$lib/components/WeatherIcon.svelte';
	import { getWeatherVisual } from '$lib/weather/wmo';
	import { isDay } from '$lib/weather/dayNight';
	import { formatFavoriteLocalTime } from '$lib/weather/format';
	import { formatTemp } from '$lib/weather/units';
	import type { CachedForecast, Location } from '$lib/types';

	const favorites = getFavoritesStore();
	const location = getLocationStore();
	const settings = getSettingsStore();
	const lang = $derived(settings.language);

	// A fresh cache instance over the shared localStorage layer — the same key
	// the forecast store uses, so favorites share (and warm) its entries.
	const cache = typeof localStorage !== 'undefined' ? createForecastCache(localStorage) : null;

	type Row = {
		entry: CachedForecast | null;
		fetching: boolean;
		failed: boolean;
		offline: boolean;
	};
	const rows = new SvelteMap<string, Row>();

	// SSR/hydration gate: the favorites list lives in localStorage, so server
	// and client can't agree on it — render a skeleton until the client mounts.
	let mounted = $state(false);

	let currentLoadSeq = 0;

	async function loadAllFavorites(force = false): Promise<void> {
		const activeCache = cache;
		if (activeCache === null) return;
		const seq = ++currentLoadSeq;
		const currentList = favorites.list;
		const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

		const toFetch: Location[] = [];
		for (const loc of currentList) {
			const key = cacheKey(loc.latitude, loc.longitude);
			const entry = activeCache.get(key);
			const needsRefetch = force || entry === null || statusOf(entry) !== 'fresh';

			if (isOffline) {
				rows.set(loc.id, {
					entry,
					fetching: false,
					failed: entry === null,
					offline: entry === null
				});
			} else {
				rows.set(loc.id, {
					entry,
					fetching: needsRefetch,
					failed: false,
					offline: false
				});
				if (needsRefetch) {
					toFetch.push(loc);
				}
			}
		}

		if (toFetch.length === 0 || isOffline) return;

		// Concurrency limit: load in batches of max 2 requests to avoid flooding localStorage and network
		const CONCURRENCY = 2;
		let index = 0;
		let successfulLoads = 0;

		async function worker(activeCache: NonNullable<typeof cache>): Promise<void> {
			while (index < toFetch.length) {
				if (seq !== currentLoadSeq) return;
				const loc = toFetch[index++];
				if (!loc) break;

				if (typeof navigator !== 'undefined' && !navigator.onLine) {
					if (seq !== currentLoadSeq) return;
					const current = rows.get(loc.id);
					rows.set(loc.id, {
						entry: current?.entry ?? null,
						fetching: false,
						failed: current?.entry == null,
						offline: current?.entry == null
					});
					continue;
				}

				try {
					const payload = await getForecast(loc);
					if (seq !== currentLoadSeq) return;
					if (!favorites.isFavorite(loc)) continue;
					const now = Date.now();
					const stamped = { ...payload, fetchedAt: now };
					const next: CachedForecast = { fetchedAt: now, location: loc, payload: stamped };
					const key = cacheKey(loc.latitude, loc.longitude);
					activeCache.set(key, next);
					rows.set(loc.id, { entry: next, fetching: false, failed: false, offline: false });
					successfulLoads++;
				} catch {
					if (seq !== currentLoadSeq) return;
					const current = rows.get(loc.id);
					const offlineNow = typeof navigator !== 'undefined' && !navigator.onLine;
					rows.set(loc.id, {
						entry: current?.entry ?? null,
						fetching: false,
						failed: current?.entry == null,
						offline: offlineNow && current?.entry == null
					});
				}
			}
		}

		const workers = Array.from({ length: Math.min(CONCURRENCY, toFetch.length) }, () =>
			worker(activeCache)
		);
		await Promise.all(workers);

		if (seq === currentLoadSeq && successfulLoads > 0) {
			settings.touchLastUpdated();
		}
	}

	onMount(() => {
		mounted = true;

		function onOnline(): void {
			loadAllFavorites(true);
		}

		window.addEventListener('online', onOnline);
		return () => {
			window.removeEventListener('online', onOnline);
		};
	});

	// Client-side only: load every favorite that has no row yet or needs refresh.
	$effect(() => {
		// Order-invariant read: a pure reorder does re-run this effect, but
		// loadAllFavorites() only fetches stale entries, so no requests fire.
		void [...favorites.list].map((l) => l.id).sort().join();
		untrack(() => {
			loadAllFavorites();
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

	let dragFrom = $state<number | null>(null);
	let dragTo = $state(0);
	let dragStartY = 0;

	// During a drag render this preview order; rows are looked up by loc.id
	// in the rows map, so no data is lost or refetched mid-drag.
	function preview(items: Array<{ loc: Location; row: Row | undefined }>, from: number, to: number) {
		const next = [...items];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved!);
		return next;
	}

	function rowHeight(): number {
		const row = document.querySelector('.fav-row');
		return row?.getBoundingClientRect().height ?? 57;
	}

	function onHandleDown(e: PointerEvent, index: number): void {
		e.preventDefault(); // no text selection / native scroll intent
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		dragStartY = e.clientY;
		dragFrom = index;
		dragTo = index;
	}

	function onHandleMove(e: PointerEvent): void {
		if (dragFrom === null) return;
		const max = favorites.list.length - 1;
		dragTo = Math.max(0, Math.min(max, dragFrom + Math.round((e.clientY - dragStartY) / rowHeight())));
	}

	function onHandleUp(): void {
		if (dragFrom !== null && dragTo !== dragFrom) {
			favorites.moveFavorite(dragFrom, dragTo);
		}
		dragFrom = null;
	}

	function onHandleCancel(): void {
		dragFrom = null; // revert preview without committing
	}

	function onHandleKey(e: KeyboardEvent, index: number): void {
		if (e.key === 'ArrowUp' && index > 0) {
			e.preventDefault();
			favorites.moveFavorite(index, index - 1);
		} else if (e.key === 'ArrowDown' && index < list.length - 1) {
			e.preventDefault();
			favorites.moveFavorite(index, index + 1);
		}
	}

	function subLabel(loc: Location): string {
		const parts = [...new Set([loc.admin1, loc.country])].filter(
			(value): value is string => value != null && value !== '' && value !== loc.name
		);
		return parts.join(', ');
	}

	const list = $derived(favorites.list.map((loc) => ({ loc, row: rows.get(loc.id) })));
	const busy = $derived(list.some(({ row }) => row !== undefined && row.entry === null && row.fetching));
	// Declared after `list` on purpose: it reads it, and `$derived` has no hoisting.
	const displayList = $derived(dragFrom === null ? list : preview(list, dragFrom, dragTo));

	function rowIconName(entry: CachedForecast): string {
		const v = getWeatherVisual(entry.payload.current.weatherCode);
		const d = entry.payload.daily.find((day) => day.date === entry.payload.current.time.slice(0, 10));
		const day = isDay(entry.payload.current.time, d?.sunrise ?? null, d?.sunset ?? null).isDay;
		return day ? v.iconDay : v.iconNight;
	}
</script>

<svelte:head>
	<title>{t('favorites.title', lang)} | {t('app.title', lang)}</title>
	<meta name="description" content={t('favorites.description', lang)} />
</svelte:head>

<h1 class="sr-only">{t('favorites.title', lang)}</h1>

{#if !mounted}
	<div class="card list" aria-busy="true">
		{#each [1, 2, 3] as _}
			<div class="sk-row">
				<div class="sk sk-block"></div>
				<div class="sk sk-line w50"></div>
				<div class="sk sk-line w30"></div>
			</div>
		{/each}
		<span class="sr-only">{t('favorites.loading', lang)}</span>
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
		<div class="state-title">{t('favorites.emptyTitle', lang)}</div>
		<div class="state-text">{t('favorites.emptyHint', lang)}</div>
		<button class="primary-btn" type="button" onclick={() => openSearch({ addToFavorites: true })}>{t('favorites.addCity', lang)}</button>
	</div>
{:else}
	<div class="card list" aria-busy={busy}>
		{#each displayList as { loc, row }, i (loc.id)}
			{@const sub = subLabel(loc)}
			{@const visual = row?.entry ? getWeatherVisual(row.entry.payload.current.weatherCode, lang) : null}
			{@const dragging = dragFrom !== null && i === dragTo}
			<div class="fav-row" class:dragging>
				<button
					class="fav-handle"
					type="button"
					aria-label={t('favorites.reorder', lang, { name: loc.name, position: i + 1, total: displayList.length })}
					onpointerdown={(e) => onHandleDown(e, i)}
					onpointermove={onHandleMove}
					onpointerup={onHandleUp}
					onpointercancel={onHandleCancel}
					onlostpointercapture={onHandleCancel}
					onkeydown={(e) => onHandleKey(e, i)}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
						<circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" />
						<circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
						<circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" />
					</svg>
				</button>
				<button class="fav-main" type="button" onclick={() => select(loc)}>
					<div class="fav-icon">
						<WeatherIcon name={row?.entry ? rowIconName(row.entry) : 'cloudy'} size={28} />
						{#if visual}
							<span class="sr-only">{visual.label}</span>
						{/if}
					</div>
					<span class="fav-info">
						<span class="fav-name">{loc.name}</span>
						{#if sub !== ''}
							<span class="fav-sub">{sub}</span>
						{/if}
						{#if visual}
							<span class="fav-condition">{visual.label}</span>
						{/if}
					</span>
					<span class="fav-side">
						{#if row?.entry}
							<span class="fav-temp">{formatTemp(row.entry.payload.current.temperature)}</span>
							<span class="fav-time">{formatFavoriteLocalTime(row.entry.payload.current.time, lang)}</span>
						{:else if row?.offline}
							<span class="fav-error">{t('favorites.noNetwork', lang)}</span>
						{:else if row?.failed}
							<span class="fav-error">{t('favorites.failedToLoad', lang)}</span>
						{:else}
							<span class="sk sk-temp"></span>
						{/if}
					</span>
				</button>
				<button
					class="fav-remove"
					type="button"
					aria-label={t('favorites.removeFavorite', lang, { name: loc.name })}
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

	<div class="actions-wrapper">
		<button class="add-city-btn" type="button" onclick={() => openSearch({ addToFavorites: true })}>
			<svg
				class="icon-plus"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
			<span>{t('favorites.addCity', lang)}</span>
		</button>
	</div>
{/if}

<style>
	.list {
		padding: var(--space-2) var(--space-4);
		max-width: 100%;
		min-width: 0;
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
		grid-template-columns: 28px minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-3);
		min-height: 56px;
		padding: var(--space-2) 0;
		background: none;
		border: none;
		text-align: left;
		border-radius: var(--radius-control);
		cursor: pointer;
	}

	.fav-main:active {
		background: var(--divider);
	}

	.fav-handle {
		flex-shrink: 0;
		width: 40px; /* hit target ~44px вместе с gap'ом справа */
		height: 44px;
		margin-right: var(--space-1);
		display: grid;
		place-items: center;
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: grab;
		touch-action: none; /* critical: prevents page scroll while dragging on touch */
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none; /* no iOS magnifier on long press */
	}

	.fav-handle svg {
		width: 18px;
		height: 18px;
		pointer-events: none; /* pointerdown must land on the button */
	}

	.fav-handle:focus-visible {
		outline: 2px solid var(--accent-strong);
		border-radius: var(--radius-control);
	}

	.fav-row.dragging {
		background: var(--divider);
		border-radius: var(--radius-control);
		opacity: 0.85;
	}

	/* ponytail: no auto-scroll while dragging past viewport edges — revisit if
	   lists routinely exceed ~10 cities on small screens */

	.fav-icon {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		flex-shrink: 0;
	}

	.fav-info {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
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
		font-size: 12px;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.fav-condition {
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
		padding-left: var(--space-2);
	}

	.fav-temp {
		font-size: 17px;
		font-weight: 600;
	}

	.fav-time {
		font-size: 12px;
		color: var(--text-secondary);
		white-space: nowrap;
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
		cursor: pointer;
	}

	.fav-remove:active {
		background: var(--divider);
	}

	.fav-trash {
		width: 20px;
		height: 20px;
	}

	/* ---------- add city button ---------- */
	.actions-wrapper {
		margin-top: var(--space-3);
	}

	.add-city-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		width: 100%;
		min-height: 48px;
		padding: 0 var(--space-4);
		border: 1px dashed var(--divider);
		border-radius: var(--radius-control);
		background: var(--bg-card);
		color: var(--accent-strong);
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
	}

	.add-city-btn:active {
		background: var(--divider);
	}

	.icon-plus {
		width: 18px;
		height: 18px;
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
		color: var(--accent-strong);
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
		cursor: pointer;
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
