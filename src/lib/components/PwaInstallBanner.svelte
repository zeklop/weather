<script lang="ts">
	import { onMount } from 'svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { t } from '$lib/i18n';
	import {
		isStandalone,
		isIosSafari,
		isInstallDismissed,
		dismissInstall,
		type BeforeInstallPromptEvent,
		type BannerType
	} from '$lib/pwa/install';
	import { openPwaInstallModal } from './PwaInstallModal.svelte';

	interface Props {
		onopenmodal?: () => void;
	}

	let { onopenmodal }: Props = $props();

	const settings = getSettingsStore();
	const lang = $derived(settings.language);

	let bannerType = $state<BannerType>('none');
	let visible = $state(false);
	let promptEvent = $state<BeforeInstallPromptEvent | null>(null);

	onMount(() => {
		if (isStandalone() || isInstallDismissed()) {
			return;
		}

		if (isIosSafari()) {
			bannerType = 'ios';
			visible = true;
		}

		function onBeforeInstallPrompt(e: Event): void {
			e.preventDefault();
			promptEvent = e as BeforeInstallPromptEvent;
			if (!isStandalone() && !isInstallDismissed()) {
				bannerType = 'android';
				visible = true;
			}
		}

		function onAppInstalled(): void {
			visible = false;
			bannerType = 'none';
			promptEvent = null;
		}

		window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
		window.addEventListener('appinstalled', onAppInstalled);

		return () => {
			window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
			window.removeEventListener('appinstalled', onAppInstalled);
		};
	});

	async function handleAction(): Promise<void> {
		if (bannerType === 'android' && promptEvent) {
			try {
				await promptEvent.prompt();
				const choice = await promptEvent.userChoice;
				if (choice && choice.outcome === 'accepted') {
					visible = false;
					promptEvent = null;
				}
			} catch {
				// Prompt error handled gracefully
			}
		} else if (bannerType === 'ios') {
			if (onopenmodal) {
				onopenmodal();
			} else {
				openPwaInstallModal();
			}
		}
	}

	function handleDismiss(): void {
		visible = false;
		dismissInstall();
	}
</script>

{#if visible && bannerType !== 'none'}
	<aside class="pwa-banner" role="region" aria-label={t('pwa.installTitle', lang)}>
		<div class="banner-container">
			<div class="banner-icon-wrap" aria-hidden="true">
				<svg
					class="banner-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					{#if bannerType === 'android'}
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					{:else}
						<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
						<polyline points="16 6 12 2 8 6" />
						<line x1="12" y1="2" x2="12" y2="15" />
					{/if}
				</svg>
			</div>

			<div class="banner-text">
				{#if bannerType === 'android'}
					{t('pwa.bannerAndroidText', lang)}
				{:else}
					{t('pwa.bannerIosText', lang)}
				{/if}
			</div>

			<div class="banner-actions">
				<button class="action-btn" type="button" onclick={handleAction}>
					{#if bannerType === 'android'}
						{t('pwa.installBtn', lang)}
					{:else}
						{t('pwa.bannerIosAction', lang)}
					{/if}
				</button>
				<button
					class="dismiss-btn"
					type="button"
					aria-label={t('pwa.bannerDismiss', lang)}
					onclick={handleDismiss}
				>
					<svg
						class="dismiss-icon"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			</div>
		</div>
	</aside>
{/if}

<style>
	.pwa-banner {
		position: sticky;
		top: env(safe-area-inset-top, 0px);
		z-index: 25;
		background: var(--bg-card);
		-webkit-backdrop-filter: blur(16px) saturate(1.4);
		backdrop-filter: blur(16px) saturate(1.4);
		border-bottom: 1px solid var(--divider);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.banner-container {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		max-width: 860px;
		margin-inline: auto;
		padding: var(--space-2) var(--space-4);
		min-height: 52px;
	}

	.banner-icon-wrap {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		background: var(--bg-page-top);
		border: 1px solid var(--divider);
		border-radius: 8px;
		color: var(--accent-strong);
	}

	.banner-icon {
		width: 18px;
		height: 18px;
	}

	.banner-text {
		flex: 1;
		min-width: 0;
		font-size: 13px;
		font-weight: 500;
		line-height: 1.3;
		color: var(--text-primary);
	}

	.banner-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.action-btn {
		min-height: 36px;
		padding: 0 var(--space-3);
		border: none;
		border-radius: calc(var(--radius-control) - 4px);
		background: var(--accent-strong);
		color: #fff;
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
		transition: opacity 0.15s;
	}

	.action-btn:active {
		opacity: 0.85;
	}

	.dismiss-btn {
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		border: none;
		border-radius: calc(var(--radius-control) - 4px);
		background: transparent;
		color: var(--text-secondary);
	}

	.dismiss-btn:active {
		background: var(--divider);
	}

	.dismiss-icon {
		width: 18px;
		height: 18px;
	}

	@media (max-width: 480px) {
		.banner-container {
			gap: var(--space-2);
			padding: var(--space-2) var(--space-3);
		}

		.banner-text {
			font-size: 12px;
		}

		.action-btn {
			padding: 0 var(--space-2);
			font-size: 12px;
		}
	}
</style>
