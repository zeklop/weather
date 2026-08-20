<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { getLocationStore } from '$lib/stores/location.svelte';
	import { isUnnamedLocation } from '$lib/stores/favorites.svelte';
	import { t } from '$lib/i18n';
	import { createBasemapStyle, updateRadarLayer } from '$lib/map/weatherLayer';
	import { fetchRainViewerData, formatRadarFrameLabel, type RadarFrame } from '$lib/map/rainviewer';
	import 'maplibre-gl/dist/maplibre-gl.css';

	const settings = getSettingsStore();
	const location = getLocationStore();
	const lang = $derived(settings.language);
	const displayName = $derived(
		isUnnamedLocation(location.current) ? t('header.myLocation', lang) : location.current.name
	);

	let mapContainer: HTMLDivElement | null = $state(null);
	let mapInstance: any = $state(null);
	let markerInstance: any = $state(null);

	let frames = $state<RadarFrame[]>([]);
	let activeFrameIndex = $state(0);
	let isPlaying = $state(false);
	let layerType = $state<'radar' | 'standard'>('radar');

	let isMapLoading = $state(true);
	let isRadarLoading = $state(true);
	let radarError = $state(false);

	let playTimer: ReturnType<typeof setInterval> | null = null;
	let destroyed = false;

	const activeFrame = $derived<RadarFrame | null>(
		frames.length > 0 && frames[activeFrameIndex] ? frames[activeFrameIndex]! : null
	);

	const activeLabel = $derived<string>(
		activeFrame ? formatRadarFrameLabel(activeFrame.time, Date.now(), lang) : ''
	);

	function updateMapRadar() {
		if (!mapInstance || frames.length === 0 || !frames[activeFrameIndex]) return;
		const frame = frames[activeFrameIndex]!;
		updateRadarLayer(mapInstance, frame.tileUrl, 0.75, layerType === 'radar');
	}

	function togglePlay() {
		if (isPlaying) {
			pause();
		} else {
			play();
		}
	}

	function play() {
		if (frames.length <= 1) return;
		isPlaying = true;
		if (playTimer) clearInterval(playTimer);

		playTimer = setInterval(() => {
			if (frames.length === 0) return;
			activeFrameIndex = (activeFrameIndex + 1) % frames.length;
			updateMapRadar();
		}, 650);
	}

	function pause() {
		isPlaying = false;
		if (playTimer) {
			clearInterval(playTimer);
			playTimer = null;
		}
	}

	function selectFrame(index: number) {
		pause();
		activeFrameIndex = Math.max(0, Math.min(frames.length - 1, index));
		updateMapRadar();
	}

	function nextFrame() {
		pause();
		if (frames.length === 0) return;
		activeFrameIndex = (activeFrameIndex + 1) % frames.length;
		updateMapRadar();
	}

	function prevFrame() {
		pause();
		if (frames.length === 0) return;
		activeFrameIndex = (activeFrameIndex - 1 + frames.length) % frames.length;
		updateMapRadar();
	}

	function toggleLayer() {
		layerType = layerType === 'radar' ? 'standard' : 'radar';
		updateMapRadar();
	}

	function zoomIn() {
		mapInstance?.zoomIn({ duration: 250 });
	}

	function zoomOut() {
		mapInstance?.zoomOut({ duration: 250 });
	}

	function recenter() {
		if (!mapInstance || !location.current) return;
		mapInstance.flyTo({
			center: [location.current.longitude, location.current.latitude],
			zoom: 8,
			duration: 400
		});
	}

	async function loadRadarData() {
		isRadarLoading = true;
		radarError = false;
		try {
			const data = await fetchRainViewerData();
			if (data.frames.length > 0) {
				frames = data.frames;
				// Start on the latest past frame (fall back to the last frame)
				const lastPastIdx = frames.findLastIndex((f) => f.isPast);
				activeFrameIndex = lastPastIdx >= 0 ? lastPastIdx : frames.length - 1;
				updateMapRadar();
			} else {
				radarError = true;
			}
		} catch {
			radarError = true;
		} finally {
			isRadarLoading = false;
		}
	}

	onMount(async () => {
		if (!mapContainer) return;

		try {
			const maplibregl = await import('maplibre-gl');
			// User navigated away while the chunk was loading — do not mount on a detached container
			if (destroyed) return;

			const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
			const initialStyle = createBasemapStyle(isDark ? 'dark' : 'light');

			const map = new maplibregl.Map({
				container: mapContainer,
				style: initialStyle as any,
				center: [location.current.longitude, location.current.latitude],
				zoom: 8,
				minZoom: 3,
				maxZoom: 16,
				attributionControl: false
			});

			// Add attribution control in bottom-left
			map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

			// Add location pin marker with pulse styling
			const markerEl = document.createElement('div');
			markerEl.className = 'city-pin-marker';
			markerEl.setAttribute('aria-label', isUnnamedLocation(location.current) ? 'My location' : location.current.name);

			const markerInner = document.createElement('div');
			markerInner.className = 'pin-inner';
			markerEl.appendChild(markerInner);

			const pinMarker = new maplibregl.Marker({ element: markerEl })
				.setLngLat([location.current.longitude, location.current.latitude])
				.addTo(map);

			markerInstance = pinMarker;
			mapInstance = map;

			map.on('load', async () => {
				isMapLoading = false;
				await loadRadarData();
			});
		} catch (err) {
			console.error('Failed to initialize MapLibre map:', err);
			isMapLoading = false;
			radarError = true;
		}
	});

	onDestroy(() => {
		destroyed = true;
		pause();
		if (markerInstance) {
			markerInstance.remove();
			markerInstance = null;
		}
		if (mapInstance) {
			mapInstance.remove();
			mapInstance = null;
		}
	});
</script>

<svelte:head>
	<title>{t('map.title', lang)} — {location.current.name} | {t('app.title', lang)}</title>
	<meta name="description" content={t('map.description', lang)} />
</svelte:head>

<div class="map-view">
	<!-- Top Bar Floating Overlay -->
	<header class="map-topbar">
		<a class="nav-back-btn" href={base + '/'} aria-label={t('map.toHome', lang)}>
			<svg
				class="btn-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="m15 18-6-6 6-6" />
			</svg>
			<span>{t('map.toHome', lang)}</span>
		</a>

		<div class="map-city-badge">
			<svg
				class="badge-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
				<circle cx="12" cy="10" r="3" />
			</svg>
			<span class="city-name">{displayName}</span>
		</div>
	</header>

	<!-- Map Container -->
	<div class="map-container" bind:this={mapContainer}>
		{#if isMapLoading}
			<div class="map-loading-overlay">
				<div class="spinner" aria-hidden="true"></div>
				<span class="loading-text">{t('map.loadingRadar', lang)}</span>
			</div>
		{/if}
	</div>

	<!-- Floating Map Controls -->
	<div class="map-floating-controls" role="toolbar" aria-label={t('map.layers', lang)}>
		<button
			class="control-btn"
			type="button"
			title={t('map.recenter', lang)}
			aria-label={t('map.recenter', lang)}
			onclick={recenter}
		>
			<svg
				class="btn-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" />
				<circle cx="12" cy="12" r="3" />
				<line x1="12" y1="2" x2="12" y2="5" />
				<line x1="12" y1="19" x2="12" y2="22" />
				<line x1="2" y1="12" x2="5" y2="12" />
				<line x1="19" y1="12" x2="22" y2="12" />
			</svg>
		</button>

		<button
			class="control-btn"
			class:active={layerType === 'radar'}
			type="button"
			title={layerType === 'radar' ? t('map.radar', lang) : t('map.standard', lang)}
			aria-label={t('map.layers', lang)}
			onclick={toggleLayer}
		>
			<svg
				class="btn-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<polygon points="12 2 2 7 12 12 22 7 12 2" />
				<polyline points="2 17 12 22 22 17" />
				<polyline points="2 12 12 17 22 12" />
			</svg>
		</button>

		<div class="zoom-group">
			<button
				class="control-btn zoom-btn"
				type="button"
				title={t('map.zoomIn', lang)}
				aria-label={t('map.zoomIn', lang)}
				onclick={zoomIn}
			>
				<svg
					class="btn-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			</button>
			<button
				class="control-btn zoom-btn"
				type="button"
				title={t('map.zoomOut', lang)}
				aria-label={t('map.zoomOut', lang)}
				onclick={zoomOut}
			>
				<svg
					class="btn-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Bottom Radar Timeline Player -->
	<div class="map-player-card">
		{#if radarError}
			<div class="player-error">
				<span>{t('map.radarUnavailable', lang)}</span>
				<button class="retry-btn" type="button" onclick={loadRadarData}>
					{t('home.retry', lang)}
				</button>
			</div>
		{:else}
			<div class="player-top">
				<div class="player-playback">
					<button
						class="play-btn"
						type="button"
						aria-label={isPlaying ? t('map.pause', lang) : t('map.play', lang)}
						onclick={togglePlay}
						disabled={frames.length === 0}
					>
						{#if isPlaying}
							<svg
								class="play-icon"
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
							>
								<rect x="6" y="4" width="4" height="16" rx="1.5" />
								<rect x="14" y="4" width="4" height="16" rx="1.5" />
							</svg>
						{:else}
							<svg
								class="play-icon"
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
							>
								<polygon points="6 3 20 12 6 21 6 3" />
							</svg>
						{/if}
					</button>

					<button
						class="step-btn"
						type="button"
						aria-label="Previous step"
						onclick={prevFrame}
						disabled={frames.length === 0}
					>
						<svg
							class="step-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<polyline points="15 18 9 12 15 6" />
						</svg>
					</button>

					<button
						class="step-btn"
						type="button"
						aria-label="Next step"
						onclick={nextFrame}
						disabled={frames.length === 0}
					>
						<svg
							class="step-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
					</button>
				</div>

				<div class="player-status">
					<span class="status-badge" class:radar-active={layerType === 'radar'}>
						<span class="status-dot"></span>
						<span class="status-label">{activeLabel || (isRadarLoading ? t('map.loadingRadar', lang) : '...')}</span>
					</span>
					<span class="layer-indicator">{layerType === 'radar' ? t('map.radar', lang) : t('map.standard', lang)}</span>
				</div>
			</div>

			<!-- Time Slider -->
			<div class="player-slider-wrap">
				<input
					class="timeline-slider"
					type="range"
					min="0"
					max={Math.max(0, frames.length - 1)}
					value={activeFrameIndex}
					aria-label="Radar timeline"
					disabled={frames.length === 0}
					oninput={(e) => selectFrame(Number((e.currentTarget as HTMLInputElement).value))}
				/>

				{#if frames.length > 0}
					<div class="slider-ticks" aria-hidden="true">
						{#each frames as f, i}
							<button
								class="slider-tick"
								class:active={i === activeFrameIndex}
								class:nowcast={f.isNowcast}
								type="button"
								tabindex="-1"
								aria-label={f.label || `Frame ${i + 1}`}
								onclick={() => selectFrame(i)}
							></button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.map-view {
		position: relative;
		width: 100%;
		height: calc(100vh - 120px);
		min-height: 480px;
		max-height: 860px;
		border-radius: var(--radius-card);
		overflow: hidden;
		background: var(--bg-card);
		border: 1px solid var(--border);
		box-shadow: var(--card-shadow);
	}

	.map-topbar {
		position: absolute;
		top: var(--space-3);
		left: var(--space-3);
		right: var(--space-3);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		z-index: 10;
		pointer-events: none;
	}

	.nav-back-btn {
		pointer-events: auto;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 var(--space-3);
		background: rgba(255, 255, 255, 0.92);
		color: var(--text-primary);
		border-radius: var(--radius-control);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
		font-size: 13.5px;
		font-weight: 600;
		text-decoration: none;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition: opacity 0.15s ease, transform 0.15s ease;
	}

	:global([data-theme='dark']) .nav-back-btn {
		background: rgba(30, 41, 59, 0.92);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.nav-back-btn:active {
		transform: scale(0.97);
		opacity: 0.85;
	}

	.map-city-badge {
		pointer-events: auto;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 var(--space-3);
		background: rgba(255, 255, 255, 0.92);
		color: var(--text-primary);
		border-radius: var(--radius-control);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
		font-size: 13.5px;
		font-weight: 600;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	:global([data-theme='dark']) .map-city-badge {
		background: rgba(30, 41, 59, 0.92);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.badge-icon {
		width: 16px;
		height: 16px;
		color: var(--accent);
	}

	.map-container {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.map-loading-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		background: var(--bg-card);
		z-index: 5;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--divider);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-text {
		color: var(--text-secondary);
		font-size: 14px;
	}

	.map-floating-controls {
		position: absolute;
		top: calc(var(--space-3) + 48px);
		right: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		z-index: 10;
	}

	.zoom-group {
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.92);
		border-radius: var(--radius-control);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
		overflow: hidden;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	:global([data-theme='dark']) .zoom-group {
		background: rgba(30, 41, 59, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
	}

	.control-btn {
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		border: none;
		background: rgba(255, 255, 255, 0.92);
		color: var(--text-primary);
		border-radius: var(--radius-control);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
		cursor: pointer;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition: opacity 0.15s ease, transform 0.15s ease, background 0.15s ease;
	}

	:global([data-theme='dark']) .control-btn {
		background: rgba(30, 41, 59, 0.92);
		color: var(--text-primary);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
	}

	.control-btn.active {
		background: var(--accent);
		color: #ffffff;
	}

	:global([data-theme='dark']) .control-btn.active {
		background: var(--accent);
		color: #ffffff;
		border-color: var(--accent-strong);
	}

	.control-btn:active {
		transform: scale(0.95);
	}

	.zoom-btn {
		box-shadow: none;
		border-radius: 0;
	}

	.zoom-btn:first-child {
		border-bottom: 1px solid var(--divider);
	}

	.btn-icon {
		width: 20px;
		height: 20px;
	}

	/* Bottom Player Card */
	.map-player-card {
		position: absolute;
		bottom: var(--space-3);
		left: var(--space-3);
		right: var(--space-3);
		background: rgba(255, 255, 255, 0.94);
		border-radius: var(--radius-card);
		padding: var(--space-3) var(--space-4);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		z-index: 10;
		border: 1px solid rgba(255, 255, 255, 0.6);
	}

	:global([data-theme='dark']) .map-player-card {
		background: rgba(30, 41, 59, 0.94);
		border: 1px solid rgba(255, 255, 255, 0.12);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
	}

	.player-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-2);
	}

	.player-playback {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.play-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: none;
		background: var(--accent);
		color: #ffffff;
		display: grid;
		place-items: center;
		cursor: pointer;
		transition: transform 0.15s ease, opacity 0.15s ease;
	}

	.play-btn:active {
		transform: scale(0.93);
	}

	.play-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.play-icon {
		width: 18px;
		height: 18px;
		margin-left: 2px;
	}

	.play-btn svg rect {
		margin-left: 0;
	}

	.step-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: none;
		background: var(--divider);
		color: var(--text-primary);
		display: grid;
		place-items: center;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.step-btn:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	:global([data-theme='dark']) .step-btn:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.step-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.step-icon {
		width: 16px;
		height: 16px;
	}

	.player-status {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 2px 8px;
		background: rgba(59, 130, 246, 0.12);
		color: var(--accent);
		border-radius: 12px;
		font-size: 13px;
		font-weight: 600;
	}

	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
	}

	.layer-indicator {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.player-slider-wrap {
		position: relative;
		display: flex;
		flex-direction: column;
		padding-top: 4px;
	}

	.timeline-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: var(--divider);
		outline: none;
		cursor: pointer;
		margin: 0;
		z-index: 2;
	}

	.timeline-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--accent);
		border: 2px solid #ffffff;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	.timeline-slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--accent);
		border: 2px solid #ffffff;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		cursor: pointer;
	}

	.timeline-slider::-webkit-slider-thumb:hover {
		transform: scale(1.15);
	}

	.slider-ticks {
		display: flex;
		justify-content: space-between;
		padding: 4px 6px 0;
	}

	.slider-tick {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--text-secondary);
		opacity: 0.3;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.slider-tick.active {
		background: var(--accent);
		opacity: 1;
		transform: scale(1.3);
	}

	.slider-tick.nowcast {
		background: #10b981;
	}

	.player-error {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.retry-btn {
		padding: 4px 12px;
		border-radius: var(--radius-control);
		border: 1px solid var(--border);
		background: var(--bg-card);
		color: var(--accent);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}

	/* City Pin Marker Style */
	:global(.city-pin-marker) {
		width: 22px;
		height: 22px;
		position: relative;
		cursor: pointer;
	}

	:global(.pin-inner) {
		width: 14px;
		height: 14px;
		background: #2563eb;
		border: 2.5px solid #ffffff;
		border-radius: 50%;
		position: absolute;
		top: 4px;
		left: 4px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
		z-index: 2;
	}

	:global(.city-pin-marker::after) {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: rgba(37, 99, 235, 0.35);
		animation: pulse-pin 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
		z-index: 1;
	}

	@keyframes pulse-pin {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.8;
		}
		50% {
			transform: scale(1.6);
			opacity: 0;
		}
	}
</style>
