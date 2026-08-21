import { describe, expect, it } from 'vitest';
import {
	createInitialPtrState,
	PTR_CONFIG,
	reducePtrState,
	type PtrMachineState
} from '../pullToRefresh';

describe('pullToRefresh state machine reducer', () => {
	it('starts in idle state', () => {
		const initial = createInitialPtrState();
		expect(initial.state).toBe('idle');
		expect(initial.distance).toBe(0);
	});

	it('ignores touchstart if scrollY > 0 or target has no-ptr or multitouch', () => {
		const initial = createInitialPtrState();

		const withScroll = reducePtrState(initial, {
			type: 'TOUCH_START',
			scrollY: 50,
			targetHasNoPtr: false,
			isMultiTouch: false
		});
		expect(withScroll.isLockedAngle).toBe(false);

		const withNoPtr = reducePtrState(initial, {
			type: 'TOUCH_START',
			scrollY: 0,
			targetHasNoPtr: true,
			isMultiTouch: false
		});
		expect(withNoPtr.isLockedAngle).toBe(false);

		const withMulti = reducePtrState(initial, {
			type: 'TOUCH_START',
			scrollY: 0,
			targetHasNoPtr: false,
			isMultiTouch: true
		});
		expect(withMulti.isLockedAngle).toBe(false);
	});

	it('locks out non-vertical gestures (horizontal swipe on charts/rails)', () => {
		let s: PtrMachineState = createInitialPtrState();
		s = reducePtrState(s, {
			type: 'TOUCH_START',
			scrollY: 0,
			targetHasNoPtr: false,
			isMultiTouch: false
		});

		// Move mostly horizontally: deltaX = 30, deltaY = 10
		s = reducePtrState(s, { type: 'TOUCH_MOVE', deltaX: 30, deltaY: 10 });
		expect(s.isLockedAngle).toBe(false);
		expect(s.state).toBe('idle');

		// Subsequent moves in same gesture remain ignored
		s = reducePtrState(s, { type: 'TOUCH_MOVE', deltaX: 30, deltaY: 80 });
		expect(s.state).toBe('idle');
		expect(s.distance).toBe(0);
	});

	it('transitions through pulling -> ready -> loading upon release', () => {
		let s: PtrMachineState = createInitialPtrState();
		s = reducePtrState(s, {
			type: 'TOUCH_START',
			scrollY: 0,
			targetHasNoPtr: false,
			isMultiTouch: false
		});

		// Pull downwards vertically (deltaX = 2, deltaY = 50)
		s = reducePtrState(s, { type: 'TOUCH_MOVE', deltaX: 2, deltaY: 50 });
		expect(s.state).toBe('pulling');
		expect(s.distance).toBe(50 * PTR_CONFIG.RESISTANCE); // 22.5px
		expect(s.isLockedAngle).toBe(true);

		// Pull beyond threshold (deltaY = 160)
		s = reducePtrState(s, { type: 'TOUCH_MOVE', deltaX: 2, deltaY: 160 });
		expect(s.state).toBe('ready');
		expect(s.distance).toBe(160 * PTR_CONFIG.RESISTANCE); // 72px >= 65px

		// Release finger (TOUCH_END)
		s = reducePtrState(s, { type: 'TOUCH_END' });
		expect(s.state).toBe('loading');
		expect(s.distance).toBe(PTR_CONFIG.THRESHOLD_PX);

		// Complete with success
		s = reducePtrState(s, { type: 'REFRESH_SUCCESS' });
		expect(s.state).toBe('success');

		// Complete with error
		s = reducePtrState(s, { type: 'REFRESH_ERROR' });
		expect(s.state).toBe('error');

		// Reset
		s = reducePtrState(s, { type: 'RESET' });
		expect(s.state).toBe('idle');
		expect(s.distance).toBe(0);
	});

	it('cancels gesture if finger is released before threshold', () => {
		let s: PtrMachineState = createInitialPtrState();
		s = reducePtrState(s, {
			type: 'TOUCH_START',
			scrollY: 0,
			targetHasNoPtr: false,
			isMultiTouch: false
		});

		// Pull only 40px (distance = 18px < 65px)
		s = reducePtrState(s, { type: 'TOUCH_MOVE', deltaX: 0, deltaY: 40 });
		expect(s.state).toBe('pulling');

		s = reducePtrState(s, { type: 'TOUCH_END' });
		expect(s.state).toBe('idle');
		expect(s.distance).toBe(0);
	});

	it('enforces maximum pull cap (MAX_PULL_PX)', () => {
		let s: PtrMachineState = createInitialPtrState();
		s = reducePtrState(s, {
			type: 'TOUCH_START',
			scrollY: 0,
			targetHasNoPtr: false,
			isMultiTouch: false
		});

		s = reducePtrState(s, { type: 'TOUCH_MOVE', deltaX: 0, deltaY: 500 });
		expect(s.distance).toBe(PTR_CONFIG.MAX_PULL_PX);
	});
});
