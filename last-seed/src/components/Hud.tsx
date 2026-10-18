import React from 'react';
import {clamp, kf} from '../lib';

const FONT = 'WenQuanYi Zen Hei, sans-serif';

// Robot's internal log: a typewriter line in a small terminal panel.
export const LogLine: React.FC<{
	f: number; // local frame
	at: number;
	dur: number;
	text: string;
	x: number;
	y: number;
	cps?: number; // characters per second
	color?: string;
	label?: string;
	size?: number;
}> = ({f, at, dur, text, x, y, cps = 12, color = '#8ff4ff', label = 'LOG', size = 34}) => {
	const t = f - at;
	if (t < 0 || t > dur) return null;
	const o = Math.min(clamp(t / 8), clamp((dur - t) / 12));
	const chars = Array.from(text);
	const n = Math.min(chars.length, Math.floor((t / 30) * cps));
	const shown = chars.slice(0, n).join('');
	const cursor = Math.floor(t / 8) % 2 === 0 || n < chars.length;
	const w = Math.max(220, chars.length * size * 0.98 + 120);
	return (
		<g transform={`translate(${x} ${y + (1 - o) * 10})`} opacity={o}>
			<rect x={0} y={0} width={w} height={size + 40} rx={14} fill="#0c1a24" opacity={0.72} />
			<rect x={0} y={0} width={6} height={size + 40} rx={3} fill={color} opacity={0.9} />
			<text x={22} y={size + 12} fontSize={size * 0.5} fill={color} opacity={0.55} fontFamily="monospace" letterSpacing={2}>
				{label}
			</text>
			<text x={22 + label.length * size * 0.36 + 18} y={size + 14} fontSize={size} fill={color} fontFamily={FONT}>
				{shown}
				{cursor ? <tspan opacity={0.9}>▌</tspan> : null}
			</text>
		</g>
	);
};

export const Battery: React.FC<{level: number; x: number; y: number; o: number; f: number; s?: number}> = ({level, x, y, o, f, s = 1}) => {
	if (o <= 0) return null;
	const col = level > 0.5 ? '#7be07b' : level > 0.2 ? '#f2c94c' : '#ff5d5d';
	const blink = level < 0.15 ? (Math.floor(f / 10) % 2 === 0 ? 1 : 0.35) : 1;
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`} opacity={o * blink}>
			<rect x={0} y={0} width={130} height={56} rx={12} fill="#0c1a24" opacity={0.7} />
			<rect x={14} y={14} width={78} height={28} rx={5} fill="none" stroke={col} strokeWidth={3} />
			<rect x={93} y={22} width={6} height={12} rx={2} fill={col} />
			<rect x={18} y={18} width={Math.max(0, 70 * level)} height={20} rx={3} fill={col} />
			<text x={112} y={36} fontSize={14} fill={col} fontFamily="monospace" textAnchor="middle">
				{Math.round(level * 100)}
			</text>
		</g>
	);
};

export const Title: React.FC<{text: string; sub?: string; o: number; y?: number; size?: number; color?: string; spread?: number}> = ({
	text,
	sub,
	o,
	y = 540,
	size = 110,
	color = '#fff6e6',
	spread = 0,
}) => {
	if (o <= 0) return null;
	return (
		<g opacity={o}>
			<text
				x={960}
				y={y}
				fontSize={size}
				fill={color}
				fontFamily={FONT}
				textAnchor="middle"
				letterSpacing={18 + spread * 14}
				style={{filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.35))'}}
			>
				{text}
			</text>
			{sub ? (
				<text x={960} y={y + size * 0.75} fontSize={size * 0.3} fill={color} opacity={0.8} fontFamily={FONT} textAnchor="middle" letterSpacing={10}>
					{sub}
				</text>
			) : null}
		</g>
	);
};

export const Subtitle: React.FC<{f: number; at: number; dur: number; text: string; y?: number}> = ({f, at, dur, text, y = 990}) => {
	const t = f - at;
	if (t < 0 || t > dur) return null;
	const o = Math.min(clamp(t / 10), clamp((dur - t) / 10));
	return (
		<text
			x={960}
			y={y}
			fontSize={44}
			fill="#fffaf0"
			opacity={o}
			fontFamily={FONT}
			textAnchor="middle"
			letterSpacing={4}
			style={{filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))'}}
		>
			{text}
		</text>
	);
};

// Holographic projection beam from the robot's eye.
export const Hologram: React.FC<{x: number; y: number; tx: number; ty: number; w: number; h: number; o: number; f: number; children: React.ReactNode}> = ({
	x,
	y,
	tx,
	ty,
	w,
	h,
	o,
	f,
	children,
}) => {
	if (o <= 0) return null;
	const flick = 0.85 + 0.15 * Math.sin(f * 1.7) * Math.sin(f * 0.37);
	const scan = (f * 3) % h;
	return (
		<g opacity={o * flick}>
			<polygon points={`${x},${y} ${tx - w / 2},${ty + h / 2} ${tx + w / 2},${ty + h / 2}`} fill="#8ff4ff" opacity={0.08} />
			<polygon points={`${x},${y} ${tx - w / 2},${ty - h / 2} ${tx + w / 2},${ty - h / 2}`} fill="#8ff4ff" opacity={0.06} />
			<g transform={`translate(${tx - w / 2} ${ty - h / 2})`}>
				<rect width={w} height={h} rx={10} fill="#5fe3ff" opacity={0.12} stroke="#8ff4ff" strokeWidth={2} />
				{children}
				{Array.from({length: Math.floor(h / 8)}, (_, i) => (
					<rect key={i} x={0} y={i * 8} width={w} height={1.5} fill="#8ff4ff" opacity={0.07} />
				))}
				<rect x={0} y={scan} width={w} height={4} fill="#c8fbff" opacity={0.3} />
			</g>
		</g>
	);
};

export const fadeIO = (f: number, a: number, b: number, c: number, d: number) => kf(f, [a, b, c, d], [0, 1, 1, 0]);
