import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Keyframe interpolation with clamping and an ease-in-out default.
export const kf = (
	f: number,
	input: number[],
	output: number[],
	ease: (t: number) => number = Easing.inOut(Easing.cubic),
) =>
	interpolate(f, input, output, {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: ease,
	});

export const lin = (f: number, input: number[], output: number[]) =>
	kf(f, input, output, (t) => t);

export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);
export const backOut = Easing.out(Easing.back(1.6));

// Deterministic PRNG so procedural scenery is identical on every frame.
export const rng = (seed: number) => {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const hex = (c: string) => {
	const h = c.replace('#', '');
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

export const mix = (a: string, b: string, t: number) => {
	const A = hex(a);
	const B = hex(b);
	const k = clamp(t);
	return (
		'#' +
		A.map((v, i) =>
			Math.round(v + (B[i] - v) * k)
				.toString(16)
				.padStart(2, '0'),
		).join('')
	);
};

// Blend a palette (record of colors) across a keyframed sequence of palettes.
export const mixPalette = <T extends Record<string, string>>(
	pals: T[],
	t: number,
): T => {
	const n = pals.length - 1;
	const x = clamp(t, 0, n);
	const i = Math.min(Math.floor(x), n - 1);
	const k = x - i;
	const out: Record<string, string> = {};
	for (const key of Object.keys(pals[0])) {
		out[key] = mix(pals[i][key], pals[i + 1][key], k);
	}
	return out as T;
};

export const W = 1920;
export const H = 1080;

// Animation time in 30fps "story frames", whatever fps the film is rendered at.
// All scene timings are authored at 30fps; at 60fps this returns half-steps.
export const useF = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	return (f * 30) / fps;
};
