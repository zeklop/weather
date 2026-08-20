<script module lang="ts">
	let moduleOpen = $state(false);
	let previousActiveElement: HTMLElement | null = null;

	export function openPwaInstallModal(): void {
		if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
			previousActiveElement = document.activeElement;
		}
		moduleOpen = true;
	}

	export function closePwaInstallModal(): void {
		moduleOpen = false;
		if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
			const el = previousActiveElement;
			previousActiveElement = null;
			queueMicrotask(() => {
				el.focus();
			});
		}
	}
</script>

<script lang="ts">
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		open?: boolean;
		onclose?: () => void;
	}

	let { open = $bindable(false), onclose }: Props = $props();

	const settings = getSettingsStore();
	const lang = $derived(settings.language);

	let isOpen = $derived(open || moduleOpen);
	let dialogEl: HTMLDivElement | undefined = $state();

	function close(): void {
		if (open) open = false;
		if (moduleOpen) closePwaInstallModal();
		onclose?.();
	}

	$effect(() => {
		if (!isOpen) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
			return;
		}

		if (event.key === 'Tab') {
			if (!dialogEl) return;
			const focusable = Array.from(
				dialogEl.querySelectorAll<HTMLElement>(
					'button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
				)
			).filter((el) => el.offsetParent !== null || el === document.activeElement);

			if (focusable.length === 0) {
				event.preventDefault();
				return;
			}

			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (event.shiftKey) {
				if (document.activeElement === first || !dialogEl.contains(document.activeElement)) {
					event.preventDefault();
					last?.focus();
				}
			} else {
				if (document.activeElement === last) {
					event.preventDefault();
					first?.focus();
				}
			}
		}
	}
</script>

{#if isOpen}
	<div class="overlay" role="presentation">
		<div class="scrim" aria-hidden="true" onclick={close}></div>
		<div
			class="modal card"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pwa-install-modal-title"
			tabindex="-1"
			onkeydown={onKeydown}
			bind:this={dialogEl}
		>
			<div class="modal-header">
				<h2 id="pwa-install-modal-title" class="modal-title">
					{t('pwa.modalTitle', lang)}
				</h2>
				<button
					class="close-btn"
					type="button"
					aria-label={t('pwa.bannerDismiss', lang)}
					onclick={close}
				>
					<svg
						class="icon"
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

			<div class="steps-list">
				<!-- Step 1 -->
				<div class="step-item">
					<div class="step-badge">1</div>
					<div class="step-icon-wrap">
						<svg
							class="step-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
							<polyline points="16 6 12 2 8 6" />
							<line x1="12" y1="2" x2="12" y2="15" />
						</svg>
					</div>
					<div class="step-content">
						<div class="step-text">{t('pwa.modalStep1', lang)}</div>
					</div>
				</div>

				<!-- Step 2 -->
				<div class="step-item">
					<div class="step-badge">2</div>
					<div class="step-icon-wrap">
						<svg
							class="step-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<rect x="3" y="3" width="18" height="18" rx="4" />
							<line x1="12" y1="8" x2="12" y2="16" />
							<line x1="8" y1="12" x2="16" y2="12" />
						</svg>
					</div>
					<div class="step-content">
						<div class="step-text">{t('pwa.modalStep2', lang)}</div>
					</div>
				</div>

				<!-- Step 3 -->
				<div class="step-item">
					<div class="step-badge">3</div>
					<div class="step-icon-wrap">
						<svg
							class="step-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M5 12l5 5L20 7" />
						</svg>
					</div>
					<div class="step-content">
						<div class="step-text">{t('pwa.modalStep3', lang)}</div>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button class="primary-btn" type="button" onclick={close}>
					{t('pwa.modalClose', lang)}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.scrim {
		position: absolute;
		inset: 0;
		background: rgba(16, 24, 40, 0.45);
		-webkit-backdrop-filter: blur(4px);
		backdrop-filter: blur(4px);
	}

	.modal {
		position: relative;
		width: 100%;
		max-width: 480px;
		background: var(--bg-card);
		border: 1px solid var(--divider);
		border-bottom: none;
		border-radius: var(--radius-card) var(--radius-card) 0 0;
		padding: var(--space-4) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
		box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.14);
		animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}

	.modal-title {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.close-btn {
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		border: none;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--text-secondary);
	}

	.close-btn:active {
		background: var(--divider);
	}

	.close-btn .icon {
		width: 20px;
		height: 20px;
	}

	.steps-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.step-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		background: var(--bg-page-top);
		border: 1px solid var(--divider);
		border-radius: var(--radius-control);
	}

	.step-badge {
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		background: var(--accent);
		color: #fff;
		border-radius: 50%;
		font-size: 13px;
		font-weight: 700;
	}

	.step-icon-wrap {
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		background: var(--bg-card);
		border: 1px solid var(--divider);
		border-radius: 10px;
		color: var(--accent-strong);
	}

	.step-icon {
		width: 20px;
		height: 20px;
	}

	.step-content {
		flex: 1;
		min-width: 0;
	}

	.step-text {
		font-size: 14px;
		font-weight: 500;
		line-height: 1.35;
		color: var(--text-primary);
	}

	.modal-footer {
		display: flex;
		justify-content: stretch;
	}

	.primary-btn {
		width: 100%;
		min-height: 44px;
		border: none;
		border-radius: var(--radius-control);
		background: var(--accent-strong);
		color: #fff;
		font-size: 15px;
		font-weight: 600;
		transition: opacity 0.15s;
	}

	.primary-btn:active {
		opacity: 0.85;
	}

	@media (min-width: 640px) {
		.overlay {
			align-items: center;
		}

		.modal {
			border-bottom: 1px solid var(--divider);
			border-radius: var(--radius-card);
			padding-bottom: var(--space-5);
			animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		}

		@keyframes scaleIn {
			from {
				transform: scale(0.95);
				opacity: 0;
			}
			to {
				transform: scale(1);
				opacity: 1;
			}
		}
	}
</style>
