// ponytail: svelte's public API lacks effect_root/effect (store needs a
// self-owned effect root for its location watcher). Import via this plain .ts
// bridge because the svelte compiler forbids svelte/internal/* in runes files.
// Revisit when svelte exports effect_root publicly (then delete this file).
// @ts-ignore — svelte/internal/client ships no types (untyped JS module)
import { effect_root as rawEffectRoot, effect as rawEffect } from 'svelte/internal/client';

export function effect_root(fn: () => void | (() => void)): () => void {
	return rawEffectRoot(fn);
}

export function effect(fn: () => void | (() => void)): void {
	rawEffect(fn);
}
