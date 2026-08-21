export type PtrState = 'idle' | 'pulling' | 'ready' | 'loading' | 'success' | 'error';

export type PtrEvent =
	| { type: 'TOUCH_START'; scrollY: number; targetHasNoPtr: boolean; isMultiTouch: boolean }
	| { type: 'TOUCH_MOVE'; deltaX: number; deltaY: number }
	| { type: 'TOUCH_END' }
	| { type: 'REFRESH_SUCCESS' }
	| { type: 'REFRESH_ERROR' }
	| { type: 'RESET' };

export const PTR_CONFIG = {
	THRESHOLD_PX: 65,
	MAX_PULL_PX: 120,
	RESISTANCE: 0.45,
	DEADZONE_PX: 8,
	MIN_ANGLE_RATIO: 1.5 // deltaY > 1.5 * abs(deltaX) => angle > 56 deg
} as const;

export type PtrMachineState = {
	state: PtrState;
	distance: number; // 0..MAX_PULL_PX
	isLockedAngle: boolean | null; // null: in deadzone, true: vertical, false: ignored
};

export function createInitialPtrState(): PtrMachineState {
	return {
		state: 'idle',
		distance: 0,
		isLockedAngle: null
	};
}

export function reducePtrState(
	current: PtrMachineState,
	event: PtrEvent
): PtrMachineState {
	switch (event.type) {
		case 'TOUCH_START':
			if (current.state === 'loading') {
				return current;
			}
			if (event.scrollY > 0 || event.targetHasNoPtr || event.isMultiTouch) {
				return { state: 'idle', distance: 0, isLockedAngle: false };
			}
			return { state: 'idle', distance: 0, isLockedAngle: null };

		case 'TOUCH_MOVE':
			if (current.state === 'loading' || current.isLockedAngle === false) {
				return current;
			}

			const absX = Math.abs(event.deltaX);
			const deltaY = event.deltaY;

			if (deltaY <= 0) {
				return { ...current, distance: 0, state: 'idle' };
			}

			// In deadzone: wait until finger moves beyond 8px
			if (current.isLockedAngle === null) {
				if (deltaY < PTR_CONFIG.DEADZONE_PX && absX < PTR_CONFIG.DEADZONE_PX) {
					return current;
				}
				// Evaluate angle once after leaving deadzone
				const isVertical = deltaY > absX * PTR_CONFIG.MIN_ANGLE_RATIO;
				if (!isVertical) {
					return { ...current, state: 'idle', distance: 0, isLockedAngle: false };
				}
			}

			// Calculate pull distance with elastic resistance and hard cap
			const rawDistance = deltaY * PTR_CONFIG.RESISTANCE;
			const distance = Math.min(PTR_CONFIG.MAX_PULL_PX, rawDistance);
			const state: PtrState = distance >= PTR_CONFIG.THRESHOLD_PX ? 'ready' : 'pulling';

			return {
				state,
				distance,
				isLockedAngle: true
			};

		case 'TOUCH_END':
			if (current.state === 'loading') {
				return current;
			}
			if (current.state === 'ready') {
				return {
					state: 'loading',
					distance: PTR_CONFIG.THRESHOLD_PX,
					isLockedAngle: null
				};
			}
			return {
				state: 'idle',
				distance: 0,
				isLockedAngle: null
			};

		case 'REFRESH_SUCCESS':
			return {
				state: 'success',
				distance: PTR_CONFIG.THRESHOLD_PX,
				isLockedAngle: null
			};

		case 'REFRESH_ERROR':
			return {
				state: 'error',
				distance: PTR_CONFIG.THRESHOLD_PX,
				isLockedAngle: null
			};

		case 'RESET':
			return createInitialPtrState();

		default:
			return current;
	}
}
