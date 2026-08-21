<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Language } from '$lib/i18n/translations';
	import type { PtrState } from '$lib/weather/pullToRefresh';

	interface Props {
		state: PtrState;
		distance: number;
		lang: Language;
	}

	const { state, distance, lang }: Props = $props();

	const isVisible = $derived(state !== 'idle' || distance > 0);
	const rotationDeg = $derived(Math.min(180, (distance / 65) * 180));

	const statusText = $derived.by(() => {
		switch (state) {
			case 'pulling':
				return t('ptr.pull', lang);
			case 'ready':
				return t('ptr.release', lang);
			case 'loading':
				return t('ptr.loading', lang);
			case 'success':
				return t('ptr.success', lang);
			case 'error':
				return t('ptr.error', lang);
			default:
				return '';
		}
	});
</script>

{#if isVisible}
	<div
		class="ptr-container"
		class:active={isVisible}
		class:loading={state === 'loading'}
		class:success={state === 'success'}
		class:error={state === 'error'}
		style="transform: translateY({distance}px);"
		aria-hidden="true"
	>
		<div class="ptr-pill">
			{#if state === 'pulling' || state === 'ready'}
				<svg
					viewBox="0 0 24 24"
					class="ptr-icon arrow"
					style="transform: rotate({rotationDeg}deg);"
				>
					<path
						d="M12 4v16m0-16l-6 6m6-6l6 6"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			{:else if state === 'loading'}
				<div class="ptr-spinner"></div>
			{:else if state === 'success'}
				<svg viewBox="0 0 24 24" class="ptr-icon check">
					<path
						d="M5 13l4 4L19 7"
						fill="none"
						stroke="#10B981"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			{:else if state === 'error'}
				<svg viewBox="0 0 24 24" class="ptr-icon err">
					<circle cx="12" cy="12" r="9" fill="none" stroke="#EF4444" stroke-width="2" />
					<line x1="12" y1="8" x2="12" y2="12" stroke="#EF4444" stroke-width="2" stroke-linecap="round" />
					<circle cx="12" cy="16" r="1" fill="#EF4444" />
				</svg>
			{/if}

			<span class="ptr-text">{statusText}</span>
		</div>
	</div>

	<!-- Screen reader announcement -->
	{#if state === 'loading' || state === 'success' || state === 'error'}
		<div class="sr-only" role="status" aria-live="polite">
			{statusText}
		</div>
	{/if}
{/if}

<style>
	.ptr-container {
		position: absolute;
		top: -48px;
		left: 0;
		right: 0;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		z-index: 50;
		transition: transform 0.08s ease-out;
	}

	.ptr-container.loading,
	.ptr-container.success,
	.ptr-container.error {
		transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1);
	}

	.ptr-pill {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 24px;
		padding: 6px 14px;
		box-shadow: var(--card-shadow-md);
	}

	.ptr-icon {
		width: 16px;
		height: 16px;
		color: var(--accent);
		transition: transform 0.1s ease;
	}

	.ptr-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: ptrSpin 0.7s linear infinite;
	}

	@keyframes ptrSpin {
		to {
			transform: rotate(360deg);
		}
	}

	.ptr-text {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.success .ptr-text {
		color: #10b981;
	}

	.error .ptr-text {
		color: #ef4444;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
