<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Language } from '$lib/i18n/translations';
	import type { MarineData } from '$lib/types';
	import { formatTemp } from '$lib/weather/units';

	interface Props {
		marine: MarineData | null;
		lang: Language;
	}

	const { marine, lang }: Props = $props();

	const hasSeaTemp = $derived(marine?.seaTemperature !== null && marine?.seaTemperature !== undefined);
</script>

{#if hasSeaTemp && marine}
	<div class="marine-badge" data-no-ptr>
		<div class="marine-pill">
			<span class="marine-icon" aria-hidden="true">🌊</span>
			<span class="marine-temp">
				{t('marineInfo.waterTemp', lang, { temp: formatTemp(marine.seaTemperature!) })}
			</span>
			{#if marine.waveHeight !== null && marine.waveHeight > 0}
				<span class="marine-waves">
					· {t('marineInfo.waves', lang, { height: `${marine.waveHeight.toFixed(1)} ${lang === 'ru' ? 'м' : 'm'}` })}
				</span>
			{/if}
			<span class="coastal-tag">{t('marineInfo.coastal', lang)}</span>
		</div>
	</div>
{/if}

<style>
	.marine-badge {
		display: flex;
		align-items: center;
		width: 100%;
	}

	.marine-pill {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-2);
		background: rgba(14, 165, 233, 0.12);
		border: 1px solid rgba(14, 165, 233, 0.35);
		border-radius: var(--radius-control);
		padding: 4px 10px;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	:global([data-theme='dark']) .marine-pill {
		background: rgba(14, 165, 233, 0.18);
		border-color: rgba(14, 165, 233, 0.45);
	}

	.marine-icon {
		font-size: 0.875rem;
	}

	.marine-temp {
		font-weight: 600;
	}

	.marine-waves {
		color: var(--text-secondary);
		font-size: 0.75rem;
	}

	.coastal-tag {
		font-size: 0.625rem;
		text-transform: uppercase;
		font-weight: 600;
		color: #0284c7;
		background: rgba(14, 165, 233, 0.15);
		padding: 1px 4px;
		border-radius: 4px;
	}

	:global([data-theme='dark']) .coastal-tag {
		color: #38bdf8;
		background: rgba(14, 165, 233, 0.25);
	}
</style>
