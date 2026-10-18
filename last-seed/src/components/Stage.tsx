import React from 'react';
import {AbsoluteFill} from 'remotion';
import {W, H} from '../lib';
import {WALK_SPEED} from '../timing';

export type CamT = {cx: number; cy: number; z: number; shake?: number};

export const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
	<AbsoluteFill style={{background: '#000'}}>
		<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display: 'block'}}>
			{children}
		</svg>
	</AbsoluteFill>
);

export const Cam: React.FC<{cam: CamT; f: number; children: React.ReactNode}> = ({cam, f, children}) => {
	const sh = cam.shake ?? 0;
	const sx = sh ? Math.sin(f * 2.3) * sh + Math.sin(f * 5.1) * sh * 0.5 : 0;
	const sy = sh ? Math.cos(f * 2.9) * sh * 0.7 : 0;
	return <g transform={`translate(${960 + sx} ${540 + sy}) scale(${cam.z}) translate(${-cam.cx} ${-cam.cy})`}>{children}</g>;
};

// A parallax layer inside <Cam>; k=1 moves with the world, k=0 is pinned to the screen.
export const PL: React.FC<{cam: CamT; k: number; children: React.ReactNode}> = ({cam, k, children}) => (
	<g transform={`translate(${(cam.cx - 960) * (1 - k)} ${(cam.cy - 540) * (1 - k) * 0.5})`}>{children}</g>
);

// Walk-cycle phase (or null when standing) and frames spent walking so far.
export const walkAt = (f: number, segs: [number, number][]) => {
	let walked = 0;
	let phase: number | null = null;
	for (const [a, b] of segs) {
		if (f >= b) walked += b - a;
		else if (f >= a) {
			walked += f - a;
			phase = (f - a) * WALK_SPEED;
		}
	}
	return {phase, walked};
};

// Ground speed matching the leg swing so feet don't slide.
export const stepPx = (scale: number) => 2.0 * scale;
