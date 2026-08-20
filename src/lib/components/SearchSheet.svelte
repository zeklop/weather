<script module lang="ts">
	// Module-level open state: the header search button (layout) calls
	// openSearch(); the sheet renders itself while open. One place owns the
	// search UI state, no store file needed.
	let open = $state(false);

	export function openSearch(): void {
		open = true;
	}

	export function closeSearch(): void {
		open = false;
	}
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { searchLocations } from '$lib/api/geocoding';
	import { getLocationStore } from '$lib/stores/location.svelte';
	import type { Location } from '$lib/types';

	const location = getLocationStore();

	type Status = 'idle' | 'loading' | 'results' | 'empty' | 'error';

	const MIN_QUERY_LENGTH = 2;
	const DEBOUNCE_MS = 300;
	const RESULT_LIMIT = 8;

	let query = $state('');
	let status = $state<Status>('idle');
	let results = $state<Location[]>([]);
	let highlight = $state(-1);
	let inputEl: HTMLInputElement | undefined = $state();

	// retry re-runs the effect below for the same query (error state).
	let attempt = $state(0);

	// Sequence guard: drops results of fetches superseded by a newer query.
	// The effect cleanup already cancels the debounce timer; the guard covers
	// fetches already in flight. (searchLocations owns its AbortController.)
	let seq = 0;

	function select(loc: Location): void {
		location.setLocation(loc);
		closeSearch();
		goto(base + '/');
	}

	function subLabel(loc: Location): string {
		const parts = [...new Set([loc.admin1, loc.country])].filter(
			(value): value is string => value != null && value !== '' && value !== loc.name
		);
		return parts.join(', ');
	}

	// Debounced search: starts from 2 typed characters, cancels the previous
	// run on every keystroke via effect cleanup + the seq guard.
	$effect(() => {
		const q = query.trim();
		// Read attempt so the retry button (which bumps it) re-runs this
		// effect and re-issues the search for the current query.
		void attempt;
		if (q.length < MIN_QUERY_LENGTH) {
			seq++;
			status = 'idle';
			results = [];
			highlight = -1;
			return;
		}
		const id = ++seq;
		status = 'loading';
		results = [];
		highlight = -1;
		const timer = setTimeout(async () => {
			try {
				const found = await searchLocations(q, RESULT_LIMIT);
				if (id !== seq) return;
				results = found;
				status = found.length === 0 ? 'empty' : 'results';
				highlight = found.length === 0 ? -1 : 0;
			} catch {
				if (id !== seq) return;
				status = 'error';
			}
		}, DEBOUNCE_MS);
		return () => clearTimeout(timer);
	});

	// Reset the sheet state and focus the input each time it opens.
	$effect(() => {
		if (!open) return;
		seq++;
		query = '';
		status = 'idle';
		results = [];
		highlight = -1;
		inputEl?.focus();
	});

	// Lock body scroll while the sheet is open.
	$effect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			closeSearch();
			return;
		}
		if (status !== 'results' || results.length === 0) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			highlight = (highlight + 1) % results.length;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			highlight = (highlight - 1 + results.length) % results.length;
		} else if (event.key === 'Enter') {
			event.preventDefault();
			const idx = highlight >= 0 ? highlight : 0;
			select(results[idx]);
		}
	}

	function retry(): void {
		attempt++;
	}
</script>

{#if open}
	<div class="overlay">
		<div class="scrim" aria-hidden="true" onclick={closeSearch}></div>
		<div
			class="sheet"
			role="dialog"
			aria-modal="true"
			aria-label="Поиск города"
			tabindex="-1"
			onkeydown={onKeydown}
		>
			<div class="sheet-header">
				<input
					class="search-input"
					type="search"
					placeholder="Город, регион или страна"
					aria-label="Название города"
					autocomplete="off"
					aria-controls="search-results"
					aria-activedescendant={highlight >= 0 ? `search-opt-${highlight}` : undefined}
					bind:value={query}
					bind:this={inputEl}
				/>
				<button class="close-btn" type="button" aria-label="Закрыть поиск" onclick={closeSearch}>
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
			<div class="sheet-body" id="search-results">
				{#if status === 'idle'}
					<div class="hint">Введите минимум 2 символа</div>
				{:else if status === 'loading'}
					<div class="list" role="status" aria-label="Поиск" aria-busy="true">
						{#each [1, 2, 3] as _}
							<div class="sk-row">
								<div class="sk sk-block"></div>
								<div class="sk sk-line w50"></div>
							</div>
						{/each}
						<span class="sr-only">Ищем города</span>
					</div>
				{:else if status === 'error'}
					<div class="state">
						<div class="state-text">Не удалось выполнить поиск. Проверьте соединение.</div>
						<button class="retry-btn" type="button" onclick={retry}>Повторить</button>
					</div>
				{:else if status === 'empty'}
					<div class="state">
						<div class="state-text">Ничего не найдено</div>
					</div>
				{:else}
					<div class="list" role="listbox" aria-label="Результаты поиска">
						{#each results as loc, i}
							<button
								type="button"
								class="result-row"
								class:highlighted={highlight === i}
								role="option"
								tabindex="-1"
								aria-selected={highlight === i}
								id={`search-opt-${i}`}
								onclick={() => select(loc)}
							>
								<svg
									class="pin"
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
								<span class="result-info">
									<span class="result-name">{loc.name}</span>
									{#if subLabel(loc) !== ''}
										<span class="result-sub">{subLabel(loc)}</span>
									{/if}
								</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.scrim {
		position: absolute;
		inset: 0;
		background: rgba(16, 24, 40, 0.4);
	}

	.sheet {
		position: relative;
		width: 100%;
		max-width: 520px;
		max-height: min(85dvh, 640px);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--bg-card);
		border: 1px solid var(--divider);
		border-bottom: none;
		border-radius: var(--radius-card) var(--radius-card) 0 0;
		padding-bottom: env(safe-area-inset-bottom);
	}

	.sheet-header {
		display: flex;
		gap: var(--space-2);
		padding: var(--space-4) var(--space-4) var(--space-2);
	}

	.search-input {
		flex: 1;
		min-width: 0;
		min-height: 44px;
		padding: 0 var(--space-4);
		border: 1px solid var(--divider);
		border-radius: var(--radius-control);
		background: var(--bg-page-top);
		font-size: 16px;
	}

	.search-input:focus {
		outline: 2px solid var(--accent-strong);
		outline-offset: -1px;
	}

	.close-btn {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
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
		width: 22px;
		height: 22px;
	}

	.sheet-body {
		overflow-y: auto;
		padding: var(--space-2) var(--space-4) var(--space-4);
	}

	.hint {
		padding: var(--space-5) var(--space-2);
		color: var(--text-secondary);
		font-size: 15px;
		text-align: center;
	}

	.list {
		display: flex;
		flex-direction: column;
	}

	.result-row {
		display: grid;
		grid-template-columns: 28px minmax(0, 1fr);
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		min-height: 48px;
		padding: var(--space-2) var(--space-2);
		border: none;
		border-bottom: 1px solid var(--divider);
		border-radius: var(--radius-control);
		background: none;
		text-align: left;
		cursor: pointer;
	}

	.result-row:last-child {
		border-bottom: none;
	}

	.result-row.highlighted {
		background: var(--divider);
	}

	.pin {
		width: 24px;
		height: 24px;
		color: var(--text-secondary);
	}

	.result-info {
		min-width: 0;
	}

	.result-name {
		display: block;
		font-size: 15px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-sub {
		display: block;
		font-size: 13px;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.state {
		padding: var(--space-5) var(--space-2);
		text-align: center;
	}

	.state-text {
		color: var(--text-secondary);
		font-size: 15px;
	}

	.retry-btn {
		min-height: 44px;
		margin-top: var(--space-4);
		padding: 0 var(--space-4);
		border: none;
		border-radius: var(--radius-control);
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
	}

	.retry-btn:active {
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
		min-height: 48px;
		border-bottom: 1px solid var(--divider);
	}

	.sk-row:last-child {
		border-bottom: none;
	}

	.sk-block {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.sk-line {
		height: 14px;
	}

	.w50 {
		width: 50%;
	}

	@media (min-width: 640px) {
		.overlay {
			align-items: center;
		}

		.sheet {
			border: 1px solid var(--divider);
			border-radius: var(--radius-card);
			margin-bottom: 0;
		}
	}
</style>
