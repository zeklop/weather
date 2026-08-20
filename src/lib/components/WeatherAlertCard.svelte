<script lang="ts">
	import type { WeatherAlert } from '$lib/weather/alerts';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		alert: WeatherAlert;
		ondismiss?: () => void;
	}

	let { alert, ondismiss }: Props = $props();

	const settings = getSettingsStore();
	const lang = $derived(settings.language);
	const isSevere = $derived(alert.severity === 'severe');
</script>

<div
	class="alert-card card"
	class:severe={isSevere}
	class:warning={!isSevere}
	role="alert"
	aria-live="polite"
>
	<div class="alert-icon-wrap" aria-hidden="true">
		<svg
			class="alert-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			{#if isSevere}
				<path
					d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
				/>
				<line x1="12" y1="9" x2="12" y2="13" />
				<line x1="12" y1="17" x2="12.01" y2="17" />
			{:else if alert.type === 'precipitation'}
				<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
				<path d="M16 14v6" />
				<path d="M8 14v6" />
				<path d="M12 16v6" />
			{:else}
				<path
					d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
				/>
				<line x1="12" y1="9" x2="12" y2="13" />
				<line x1="12" y1="17" x2="12.01" y2="17" />
			{/if}
		</svg>
	</div>

	<div class="alert-content">
		<div class="alert-title">{alert.title}</div>
		<div class="alert-message">{alert.message}</div>
	</div>

	{#if ondismiss}
		<button
			class="dismiss-btn"
			type="button"
			aria-label={t('alerts.dismiss', lang)}
			onclick={ondismiss}
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
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	{/if}
</div>

<style>
	.alert-card {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-control);
		transition: transform 0.2s ease, opacity 0.2s ease;
		animation: slideIn 0.25s ease-out;
		position: relative;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.alert-card.warning {
		background: #fffbeb;
		border: 1px solid #fde68a;
		color: #92400e;
	}

	.alert-card.severe {
		background: #fef2f2;
		border: 1px solid #fca5a5;
		color: #991b1b;
	}

	.alert-icon-wrap {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		border-radius: 8px;
		margin-top: 2px;
	}

	.warning .alert-icon-wrap {
		background: #fef3c7;
		color: #d97706;
	}

	.severe .alert-icon-wrap {
		background: #fee2e2;
		color: #dc2626;
	}

	.alert-icon {
		width: 20px;
		height: 20px;
	}

	.alert-content {
		flex: 1;
		min-width: 0;
	}

	.alert-title {
		font-size: 15px;
		font-weight: 600;
		line-height: 1.3;
	}

	.alert-message {
		font-size: 13.5px;
		line-height: 1.4;
		margin-top: 2px;
		opacity: 0.95;
	}

	.dismiss-btn {
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		border: none;
		background: transparent;
		color: currentColor;
		opacity: 0.65;
		border-radius: calc(var(--radius-control) - 4px);
		margin-left: auto;
		cursor: pointer;
		transition: opacity 0.15s ease, background 0.15s ease;
	}

	.dismiss-btn:hover {
		opacity: 1;
		background: rgba(0, 0, 0, 0.05);
	}

	.dismiss-btn:active {
		opacity: 0.8;
	}

	.dismiss-icon {
		width: 18px;
		height: 18px;
	}
</style>
