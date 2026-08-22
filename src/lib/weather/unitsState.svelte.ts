import type { PrecipUnit, PressureUnit, TemperatureUnit, WindUnit } from './units';

// Reactive unit state lives in a .svelte.ts module because $state is only
// available there; formatters in units.ts read it during render so a unit
// switch re-renders every screen.
export const activeUnits = $state<{
	temperature: TemperatureUnit;
	pressure: PressureUnit;
	wind: WindUnit;
	precip: PrecipUnit;
}>({
	temperature: 'celsius',
	pressure: 'mmhg',
	wind: 'ms',
	precip: 'mm'
});
