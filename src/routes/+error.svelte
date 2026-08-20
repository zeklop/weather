<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { t } from '$lib/i18n';

	const settings = getSettingsStore();
	const lang = $derived(settings.language);
</script>

<svelte:head>
	<title>{page.status} | {t('app.title', lang)}</title>
	<meta name="description" content={page.status === 404 ? t('errorPage.notFoundTitle', lang) : t('errorPage.genericTitle', lang)} />
</svelte:head>

<div class="error-page">
	<div class="card state">
		<div class="state-code">{page.status}</div>
		<h1 class="state-title">
			{page.status === 404 ? t('errorPage.notFoundTitle', lang) : t('errorPage.genericTitle', lang)}
		</h1>
		<div class="state-text">
			{page.error?.message && page.error.message !== 'Not Found'
				? page.error.message
				: page.status === 404
					? t('errorPage.notFoundText', lang)
					: t('errorPage.genericText', lang)}
		</div>
		<a class="primary-btn" href="{base}/">{t('errorPage.toHome', lang)}</a>
	</div>
</div>

<style>
	.error-page {
		display: grid;
		place-items: center;
		padding-top: var(--space-7);
		max-width: 100%;
		min-width: 0;
	}

	.state {
		width: 100%;
		max-width: 360px;
		padding: var(--space-7) var(--space-5);
		text-align: center;
		min-width: 0;
	}

	.state-code {
		font-size: 48px;
		font-weight: 700;
		color: var(--accent-strong);
		line-height: 1;
		margin-bottom: var(--space-2);
	}

	.state-title {
		font-size: 17px;
		font-weight: 600;
		margin: 0;
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
</style>
