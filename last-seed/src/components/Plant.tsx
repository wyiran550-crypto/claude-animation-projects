import React, {useMemo} from 'react';
import {clamp, rng} from '../lib';

export const Seed: React.FC<{x: number; y: number; s?: number; glow?: number; frame: number; rot?: number}> = ({
	x,
	y,
	s = 1,
	glow = 1,
	frame,
	rot = -20,
}) => {
	const pulse = 0.75 + 0.25 * Math.sin(frame * 0.12);
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`}>
			{glow > 0 ? (
				<>
					<circle r={46} fill="#b8ff9a" opacity={0.1 * glow * pulse} />
					<circle r={26} fill="#c9ffb0" opacity={0.22 * glow * pulse} />
				</>
			) : null}
			<g transform={`rotate(${rot})`}>
				<path d="M 0 -15 Q 11 -6 9 6 Q 6 15 0 15 Q -6 15 -9 6 Q -11 -6 0 -15 Z" fill="#8a5a32" />
				<path d="M 0 -13 Q 3 0 0 13" stroke="#5f3b1e" strokeWidth={2} fill="none" />
				<path d="M -4 -7 Q -6 0 -4 6" stroke="#b78457" strokeWidth={2.5} fill="none" strokeLinecap="round" />
			</g>
			{glow > 0 ? <circle cx={-3} cy={-5} r={2.2} fill="#f2ffe6" opacity={glow * pulse} /> : null}
		</g>
	);
};

type Branch = {len: number; ang: number; depth: number; birth: number; kids: Branch[]; leaf: boolean; seed: number};

const build = (seed: number) => {
	const r = rng(seed);
	const make = (depth: number, birth: number, len: number, ang: number): Branch => {
		const kids: Branch[] = [];
		if (depth < 5) {
			const n = depth === 0 ? 3 : 2 + (r() < 0.4 ? 1 : 0);
			for (let i = 0; i < n; i++) {
				const spread = depth === 0 ? 34 : 30;
				const a = (i - (n - 1) / 2) * spread + (r() - 0.5) * 18;
				kids.push(make(depth + 1, birth + 0.1 + r() * 0.05, len * (0.62 + r() * 0.18), a));
			}
		}
		return {len, ang, depth, birth, kids, leaf: depth >= 2, seed: Math.floor(r() * 1e6)};
	};
	return make(0, 0.18, 230, 0);
};

const LEAF = ['#3f8a3b', '#5aa847', '#7cc35a', '#9ad46f'];

export const Tree: React.FC<{
	g: number; // growth 0..1
	bloom?: number;
	frame: number;
	sway?: number;
	seed?: number;
	glow?: number;
	trunk?: string;
	bend?: number; // trunk lean in degrees; branches straighten back up
}> = ({g, bloom = 0, frame, sway = 1, seed = 8, glow = 0, trunk = '#6b4a2f', bend = 0}) => {
	const tree = useMemo(() => build(seed), [seed]);
	const sprout = clamp(g / 0.18);
	const stem = 70 * sprout;
	const coty = clamp((sprout - 0.35) / 0.65);
	const leaves: React.ReactNode[] = [];
	const flowers: React.ReactNode[] = [];

	const draw = (b: Branch, w: number, key: string): React.ReactNode => {
		const p = clamp((g - b.birth) / 0.3);
		if (p <= 0) return null;
		const len = b.len * (b.depth === 0 ? Math.max(p, 0) : p);
		const wob = Math.sin(frame * 0.035 + b.depth * 0.9 + b.seed) * sway * b.depth * 1.2;
		const width = w * clamp((g - b.birth + 0.1) / 0.5, 0.25, 1);
		const lp = clamp((g - b.birth - 0.12) / 0.3);
		const leafNode =
			b.leaf && lp > 0 ? (
				<g key={`${key}l`} transform={`translate(0 ${-len})`}>
					{[0, 1, 2, 3, 4].map((k) => {
						const rr = rng(b.seed + k);
						const lx = (rr() - 0.5) * 70;
						const ly = (rr() - 0.5) * 50 - 10;
						const R = (24 + rr() * 26) * lp * (b.depth >= 4 ? 0.8 : 1);
						return <circle key={k} cx={lx} cy={ly} r={R} fill={LEAF[0]} />;
					})}
					{[0, 1, 2].map((k) => {
						const rr = rng(b.seed + 20 + k);
						const lx = (rr() - 0.5) * 50 - 8;
						const ly = (rr() - 0.5) * 36 - 22;
						const R = (16 + rr() * 16) * lp;
						return <circle key={`h${k}`} cx={lx} cy={ly} r={R} fill={LEAF[k === 2 ? 2 : 1]} />;
					})}
					{bloom > 0
						? [0, 1, 2].map((k) => {
								const rr = rng(b.seed + 50 + k);
								const bx = (rr() - 0.5) * 70;
								const by = (rr() - 0.5) * 50 - 14;
								const s = clamp(bloom * 1.5 - rr() * 0.5) * 7;
								return s > 0 ? (
									<g key={`f${k}`}>
										<circle cx={bx} cy={by} r={s} fill="#ffc2d4" />
										<circle cx={bx} cy={by} r={s * 0.4} fill="#ffe680" />
									</g>
								) : null;
							})
						: null}
				</g>
			) : null;
		const ang = b.depth === 0 ? b.ang + bend : b.depth === 1 ? b.ang - bend * 0.85 : b.ang;
		return (
			<g key={key} transform={`rotate(${ang + wob})`}>
				<line x1={0} y1={0} x2={0} y2={-len} stroke={trunk} strokeWidth={width} strokeLinecap="round" />
				<g transform={`translate(0 ${-len})`}>{b.kids.map((k, i) => draw(k, w * 0.62, `${key}-${i}`))}</g>
				{leafNode}
			</g>
		);
	};

	return (
		<g>
			{glow > 0 ? (
				<>
					<defs>
						<radialGradient id="treeglow">
							<stop offset="0" stopColor="#e6ffcc" stopOpacity={0.55} />
							<stop offset="1" stopColor="#e6ffcc" stopOpacity={0} />
						</radialGradient>
					</defs>
					<circle cx={0} cy={-40} r={110} fill="url(#treeglow)" opacity={glow} />
				</>
			) : null}
			{g < 0.3 ? (
				<g opacity={g < 0.22 ? 1 : 1 - (g - 0.22) / 0.08}>
					<path
						d={`M 0 0 Q ${6 * sprout} ${-stem * 0.5} 0 ${-stem}`}
						stroke="#6cb34e"
						strokeWidth={5}
						fill="none"
						strokeLinecap="round"
					/>
					<g transform={`translate(0 ${-stem}) rotate(${Math.sin(frame * 0.05) * 4})`}>
						<path d="M 0 0 Q -14 -20 -34 -14 Q -22 4 0 0" fill="#7cc35a" transform={`scale(${coty})`} />
						<path d="M 0 0 Q 14 -24 36 -18 Q 26 2 0 0" fill="#5aa847" transform={`scale(${coty})`} />
					</g>
				</g>
			) : null}
			{g > 0.18 ? draw(tree, 34, 't') : null}
			{leaves}
			{flowers}
		</g>
	);
};

export const Grass: React.FC<{x: number; y: number; s?: number; frame: number; color?: string; flower?: string | null}> = ({
	x,
	y,
	s = 1,
	frame,
	color = '#5fa64a',
	flower = null,
}) => {
	if (s <= 0.01) return null;
	const w = Math.sin(frame * 0.05 + x * 0.01) * 4;
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`}>
			<path d={`M -14 0 Q -12 -20 ${-18 + w} -36 Q -6 -18 -4 0 Z`} fill={color} />
			<path d={`M -4 0 Q -2 -30 ${2 + w} -50 Q 6 -26 6 0 Z`} fill={color} />
			<path d={`M 4 0 Q 10 -18 ${20 + w} -30 Q 14 -12 14 0 Z`} fill={color} />
			{flower ? (
				<g transform={`translate(${2 + w} -52)`}>
					{[0, 72, 144, 216, 288].map((a) => (
						<circle key={a} cx={Math.cos((a * Math.PI) / 180) * 6} cy={Math.sin((a * Math.PI) / 180) * 6} r={5} fill={flower} />
					))}
					<circle r={4} fill="#ffe27a" />
				</g>
			) : null}
		</g>
	);
};

export const Bird: React.FC<{x: number; y: number; s?: number; frame: number; flap?: boolean; facing?: 1 | -1; color?: string}> = ({
	x,
	y,
	s = 1,
	frame,
	flap = true,
	facing = 1,
	color = '#4a8fd6',
}) => {
	const a = flap ? Math.sin(frame * 0.9) * 40 : -10;
	const hop = flap ? 0 : Math.max(0, Math.sin(frame * 0.25)) * 0;
	return (
		<g transform={`translate(${x} ${y - hop}) scale(${s * facing} ${s})`}>
			<ellipse cx={0} cy={0} rx={18} ry={13} fill={color} />
			<ellipse cx={4} cy={4} rx={10} ry={7} fill="#e8f2ff" />
			<circle cx={14} cy={-10} r={10} fill={color} />
			<circle cx={17} cy={-12} r={2.6} fill="#1b2430" />
			<path d="M 23 -10 L 32 -7 L 23 -5 Z" fill="#f2a64a" />
			<path d="M -16 -2 L -30 -8 L -28 4 Z" fill={color} />
			<path d={`M -2 -4 Q -10 ${-4 - 26 * Math.cos((a * Math.PI) / 180)} -20 ${-6 - 24 * Math.sin((a * Math.PI) / 180)} Q -8 -2 -2 -4 Z`} fill="#3a78bd" />
			{!flap ? (
				<g stroke="#f2a64a" strokeWidth={2.5}>
					<line x1={-2} y1={12} x2={-4} y2={20} />
					<line x1={5} y1={12} x2={5} y2={20} />
				</g>
			) : null}
		</g>
	);
};

export const Butterfly: React.FC<{x: number; y: number; frame: number; color?: string; s?: number}> = ({x, y, frame, color = '#ffb347', s = 1}) => {
	const f = Math.abs(Math.sin(frame * 0.5));
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`}>
			<ellipse cx={-8 * f} cy={-4} rx={9 * f + 1} ry={11} fill={color} />
			<ellipse cx={8 * f} cy={-4} rx={9 * f + 1} ry={11} fill={color} />
			<ellipse cx={-6 * f} cy={8} rx={6 * f + 1} ry={6} fill={color} opacity={0.8} />
			<ellipse cx={6 * f} cy={8} rx={6 * f + 1} ry={6} fill={color} opacity={0.8} />
			<rect x={-1.5} y={-10} width={3} height={22} rx={1.5} fill="#3a2a1a" />
		</g>
	);
};
