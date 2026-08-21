<script lang="ts">
	import { onMount } from 'svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { getLocationStore } from '$lib/stores/location.svelte';
	import { t } from '$lib/i18n';
	import { isStandalone, isPushSupported, pushClient } from '$lib/pwa/pushManager';

	const settings = getSettingsStore();
	const locationStore = getLocationStore();

	const lang = $derived(settings.language);
	const currentLocation = $derived(locationStore.current);

	let visible = $state(false);
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);

	const STORAGE_DISMISSED_KEY = 'weather:pushOnboardingDismissedUntil';

	function isDismissed(): boolean {
		if (typeof window === 'undefined') return false;
		const dismissedUntil = localStorage.getItem(STORAGE_DISMISSED_KEY);
		if (!dismissedUntil) return false;
		const untilTime = parseInt(dismissedUntil, 10);
		return Number.isFinite(untilTime) && untilTime > Date.now();
	}

	onMount(() => {
		if (typeof window === 'undefined') return;

		// Only show in standalone PWA, if push is supported and configured, and
		// permission is still undecided. The subscription check is against the
		// live PushManager state, not a localStorage flag: browsers evict
		// subscriptions silently, and a stale flag would block re-onboarding forever.
		const isSupported = isPushSupported();
		const inStandalone = isStandalone();
		const isPermDefault = typeof Notification !== 'undefined' && Notification.permission === 'default';

		if (!isSupported || !inStandalone || !isPermDefault || isDismissed() || !pushClient.isConfigured) {
			return;
		}

		void pushClient.getExistingSubscription().then((existing) => {
			if (!existing) visible = true;
		});
	});

	async function handleEnable(): Promise<void> {
		if (!currentLocation) return;
		loading = true;
		errorMessage = null;

		try {
			const res = await pushClient.subscribe(currentLocation, lang);
			if (res.success) {
				visible = false;
			} else {
				errorMessage = res.error || 'Permission not granted';
			}
		} catch (e: unknown) {
			errorMessage = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	function handleDismiss(): void {
		visible = false;
		// Dismiss for 14 days
		const fourteenDaysMs = 14 * 24 * 3600 * 1000;
		localStorage.setItem(STORAGE_DISMISSED_KEY, String(Date.now() + fourteenDaysMs));
	}
</script>

{#if visible}
	<aside class="push-banner card" role="region" aria-label={t('push.onboardingTitle', lang)}>
		<div class="push-banner-content">
			<div class="push-icon-wrap" aria-hidden="true">
				<svg
					class="push-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
					<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
				</svg>
			</div>

			<div class="push-text-wrap">
				<div class="push-title">{t('push.onboardingTitle', lang)}</div>
				<div class="push-desc">{t('push.onboardingText', lang)}</div>
				{#if errorMessage}
					<div class="push-error">{t('push.errorPrefix', lang)}: {errorMessage}</div>
				{/if}
			</div>

			<div class="push-actions">
				<button class="push-btn primary" type="button" disabled={loading} onclick={handleEnable}>
					{loading ? '...' : t('push.enableBtn', lang)}
				</button>
				<button class="push-btn secondary" type="button" onclick={handleDismiss}>
					{t('push.laterBtn', lang)}
				</button>
			</div>
		</div>
	</aside>
{/if}

<style>
	.push-banner {
		margin: var(--space-3) var(--space-4);
		padding: var(--space-3) var(--space-4);
		background: var(--bg-card);
		border: 1px solid var(--divider);
		border-radius: var(--radius-card);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
		animation: pushSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes pushSlideIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.push-banner-content {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.push-icon-wrap {
		width: 38px;
		height: 38px;
		display: grid;
		place-items: center;
		border-radius: 10px;
		background: rgba(33, 150, 243, 0.12);
		color: var(--accent-strong);
		flex-shrink: 0;
	}

	.push-icon {
		width: 20px;
		height: 20px;
	}

	.push-text-wrap {
		flex: 1;
		min-width: 0;
	}

	.push-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.2;
		margin-bottom: 2px;
	}

	.push-desc {
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.35;
	}

	.push-error {
		font-size: 11px;
		color: #e53935;
		margin-top: 4px;
	}

	.push-actions {
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex-shrink: 0;
	}

	.push-btn {
		min-height: 32px;
		padding: 0 var(--space-3);
		border-radius: 8px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		border: none;
		transition: opacity 0.15s;
	}

	.push-btn.primary {
		background: var(--accent-strong);
		color: #ffffff;
	}

	.push-btn.secondary {
		background: var(--bg-page-top);
		color: var(--text-secondary);
		border: 1px solid var(--divider);
	}

	.push-btn:active {
		opacity: 0.8;
	}

	@media (max-width: 480px) {
		.push-banner {
			margin: var(--space-2) var(--space-3);
			padding: var(--space-3);
		}

		.push-banner-content {
			flex-wrap: wrap;
		}

		.push-text-wrap {
			flex: 1 1 calc(100% - 50px);
		}

		.push-actions {
			flex-direction: row;
			width: 100%;
			margin-top: var(--space-2);
		}

		.push-btn {
			flex: 1;
			text-align: center;
		}
	}
</style>
