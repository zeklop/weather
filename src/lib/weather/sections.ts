export type SectionId =
	| 'hero'
	| 'alerts'
	| 'precipHeuristic'
	| 'hourlyRail'
	| 'precipChart'
	| 'metrics'
	| 'airQuality'
	| 'astronomy'
	| 'marine'
	| 'today'
	| 'dailyForecast';

export type SectionMeta = {
	id: SectionId;
	titleKey: string;
	defaultVisible: boolean;
	locked?: boolean;
};

export const SECTIONS_METADATA: readonly SectionMeta[] = [
	{ id: 'hero', titleKey: 'sections.hero', defaultVisible: true, locked: true },
	{ id: 'alerts', titleKey: 'sections.alerts', defaultVisible: true, locked: true },
	{ id: 'precipHeuristic', titleKey: 'sections.precipHeuristic', defaultVisible: true },
	{ id: 'hourlyRail', titleKey: 'sections.hourlyRail', defaultVisible: true },
	{ id: 'precipChart', titleKey: 'sections.precipChart', defaultVisible: true },
	{ id: 'metrics', titleKey: 'sections.metrics', defaultVisible: true },
	{ id: 'airQuality', titleKey: 'sections.airQuality', defaultVisible: true },
	{ id: 'astronomy', titleKey: 'sections.astronomy', defaultVisible: true },
	{ id: 'marine', titleKey: 'sections.marine', defaultVisible: true },
	{ id: 'today', titleKey: 'sections.today', defaultVisible: true },
	{ id: 'dailyForecast', titleKey: 'sections.dailyForecast', defaultVisible: true }
] as const;

export const DEFAULT_SECTION_ORDER: SectionId[] = SECTIONS_METADATA.map((s) => s.id);

export const DEFAULT_VISIBLE_SECTIONS: Record<SectionId, boolean> = Object.fromEntries(
	SECTIONS_METADATA.map((s) => [s.id, s.defaultVisible])
) as Record<SectionId, boolean>;

const VALID_SECTION_IDS = new Set<string>(DEFAULT_SECTION_ORDER);

/**
 * Normalizes a potentially corrupted or outdated array of section IDs.
 * - Guarantees locked sections ('hero', 'alerts') stay at the beginning in fixed order.
 * - Strips unknown / invalid section IDs.
 * - Appends any newly introduced section IDs that were missing in saved settings.
 */
export function normalizeSectionOrder(raw: unknown): SectionId[] {
	const result: SectionId[] = ['hero', 'alerts'];
	const seen = new Set<SectionId>(result);

	if (Array.isArray(raw)) {
		for (const item of raw) {
			if (typeof item === 'string' && VALID_SECTION_IDS.has(item)) {
				const id = item as SectionId;
				if (!seen.has(id)) {
					seen.add(id);
					result.push(id);
				}
			}
		}
	}

	// Append any missing valid sections in default order
	for (const defId of DEFAULT_SECTION_ORDER) {
		if (!seen.has(defId)) {
			seen.add(defId);
			result.push(defId);
		}
	}

	return result;
}

/**
 * Normalizes visible sections record.
 * - Locked sections are always true.
 * - Missing sections default to their metadata defaultVisible.
 */
export function normalizeVisibleSections(raw: unknown): Record<SectionId, boolean> {
	const result = { ...DEFAULT_VISIBLE_SECTIONS };

	if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
		const obj = raw as Record<string, unknown>;
		for (const meta of SECTIONS_METADATA) {
			if (meta.locked) {
				result[meta.id] = true;
			} else if (typeof obj[meta.id] === 'boolean') {
				result[meta.id] = obj[meta.id] as boolean;
			}
		}
	}

	result.hero = true;
	result.alerts = true;
	return result;
}
