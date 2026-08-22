import type { PressureUnit, TemperatureUnit } from './units';

// Reactive unit state lives in a .svelte.ts module because $state is only
// available there; formatters in units.ts read it during render so a unit
// switch re-renders every screen.
export const activeUnits = $state<{ temperature: TemperatureUnit; pressure: PressureUnit }>({
	temperature: 'celsius',
	pressure: 'mmhg'
});
