import React from 'react';
import {mix} from '../lib';

export type Mood = 'neutral' | 'happy' | 'sad' | 'surprised' | 'off' | 'closed';

export type Arm = {s: number; e: number};

export type RobotProps = {
	x: number;
	y: number;
	scale?: number;
	facing?: 1 | -1;
	walk?: number | null; // walk-cycle phase in radians
	crouch?: number; // 0..1
	bob?: number; // extra vertical bob in px (positive = up)
	lean?: number; // whole-body lean in degrees
	headTilt?: number;
	look?: [number, number]; // pupil offset, -1..1
	open?: number; // eyelid openness 0..1
	mood?: Mood;
	glow?: number; // eye brightness 0..1
	antenna?: number; // antenna bulb brightness 0..1
	armL?: Arm;
	armR?: Arm;
	chestOpen?: number;
	chestSoil?: number;
	holdR?: React.ReactNode;
	holdL?: React.ReactNode;
	tint?: string;
	tintAmt?: number;
	dust?: number;
	moss?: number; // overgrowth on the body 0..1
	eyeColor?: string;
};

const BASE = {
	body: '#dc8a52',
	bodyHi: '#f2ac72',
	bodyLo: '#b0623a',
	rust: '#8d4a2c',
	metal: '#8c939e',
	metalLo: '#5e6570',
	dark: '#1b2430',
	foot: '#4a505a',
	door: '#e89c64',
};

export const HIP = -40;
export const CHEST_Y = -97;

// World position of the chest cavity center, for things that grow from it.
export const robotChest = (p: RobotProps) => {
	const s = p.scale ?? 1;
	const lift = (p.crouch ?? 0) * 26 - (p.bob ?? 0);
	return {x: p.x, y: p.y + (CHEST_Y + lift) * s};
};

const ArmShape: React.FC<{
	side: 1 | -1;
	arm: Arm;
	c: typeof BASE;
	hold?: React.ReactNode;
}> = ({side, arm, c, hold}) => {
	const up = 46;
	const fore = 40;
	return (
		<g transform={`translate(${side * 60} -128) rotate(${-side * arm.s})`}>
			<line x1={0} y1={0} x2={0} y2={up} stroke={c.metal} strokeWidth={13} strokeLinecap="round" />
			<circle cx={0} cy={0} r={11} fill={c.metalLo} />
			<g transform={`translate(0 ${up}) rotate(${-side * arm.e})`}>
				<line x1={0} y1={0} x2={0} y2={fore} stroke={c.metal} strokeWidth={11} strokeLinecap="round" />
				<circle cx={0} cy={0} r={7} fill={c.metalLo} />
				<g transform={`translate(0 ${fore})`}>
					<path d="M -9 -2 Q -14 10 -6 16 M 9 -2 Q 14 10 6 16" stroke={c.metalLo} strokeWidth={6} fill="none" strokeLinecap="round" />
					<circle cx={0} cy={0} r={9} fill={c.metal} />
					{hold ? <g transform={`rotate(${side * (arm.s + arm.e)}) translate(0 14)`}>{hold}</g> : null}
				</g>
			</g>
		</g>
	);
};

const Eyes: React.FC<{mood: Mood; open: number; look: [number, number]; glow: number; color: string}> = ({
	mood,
	open,
	look,
	glow,
	color,
}) => {
	if (mood === 'off' || glow <= 0.01) return null;
	const cx = look[0] * 10;
	const cy = -61 + look[1] * 7;
	const op = Math.max(0, Math.min(1, glow));
	const eye = (dx: number) => {
		const x = cx + dx;
		if (mood === 'happy') {
			return (
				<path
					key={dx}
					d={`M ${x - 11} ${cy + 5} Q ${x} ${cy - 13} ${x + 11} ${cy + 5}`}
					stroke={color}
					strokeWidth={6}
					fill="none"
					strokeLinecap="round"
				/>
			);
		}
		if (mood === 'closed' || open < 0.08) {
			return <line key={dx} x1={x - 10} y1={cy + 2} x2={x + 10} y2={cy + 2} stroke={color} strokeWidth={5} strokeLinecap="round" />;
		}
		const r = mood === 'surprised' ? 13 : 10;
		const ry = (mood === 'surprised' ? 15 : 13) * open;
		return (
			<g key={dx}>
				<ellipse cx={x} cy={cy} rx={r + 7} ry={ry + 7} fill={color} opacity={0.18} />
				<ellipse cx={x} cy={cy} rx={r} ry={ry} fill={color} />
				<ellipse cx={x - 3} cy={cy - ry * 0.35} rx={3} ry={3 * open} fill="#ffffff" opacity={0.85} />
			</g>
		);
	};
	return (
		<g opacity={op}>
			{eye(-19)}
			{eye(19)}
			{mood === 'sad' ? (
				<g stroke={color} strokeWidth={4} strokeLinecap="round">
					<line x1={cx - 29} y1={cy - 16} x2={cx - 11} y2={cy - 23} />
					<line x1={cx + 29} y1={cy - 16} x2={cx + 11} y2={cy - 23} />
				</g>
			) : null}
		</g>
	);
};

export const Robot: React.FC<RobotProps> = (p) => {
	const s = p.scale ?? 1;
	const facing = p.facing ?? 1;
	const crouch = p.crouch ?? 0;
	const tintAmt = p.tintAmt ?? 0;
	const tint = p.tint ?? '#000000';
	const c = Object.fromEntries(
		Object.entries(BASE).map(([k, v]) => [k, mix(v, tint, tintAmt)]),
	) as typeof BASE;
	const glow = p.glow ?? 1;
	const eyeColor = p.eyeColor ?? '#86f3ff';
	const phase = p.walk;
	const walking = phase !== null && phase !== undefined;
	const step = walking ? Math.sin(phase) : 0;
	const bob = (walking ? Math.abs(Math.cos(phase)) * 5 : 0) + (p.bob ?? 0);
	const lift = crouch * 26 - bob;
	const hipY = HIP + lift;
	const legL = {dx: walking ? step * 15 : 0, up: walking ? Math.max(0, Math.cos(phase)) * 9 : 0};
	const legR = {dx: walking ? -step * 15 : 0, up: walking ? Math.max(0, -Math.cos(phase)) * 9 : 0};
	const armL = p.armL ?? {s: walking ? 8 + step * 14 : 6, e: walking ? 12 : 8};
	const armR = p.armR ?? {s: walking ? 8 - step * 14 : 6, e: walking ? 12 : 8};
	const chest = p.chestOpen ?? 0;
	const doorScale = Math.cos(chest * Math.PI * 0.92);
	const dust = p.dust ?? 0;
	const moss = p.moss ?? 0;
	const antenna = p.antenna ?? glow;

	const leg = (x: number, l: {dx: number; up: number}) => (
		<g>
			<polyline
				points={`${x},${hipY} ${x + Math.sign(x) * crouch * 16 + l.dx * 0.5},${(hipY - 10 - l.up) / 2} ${x + l.dx},${-10 - l.up}`}
				stroke={c.metalLo}
				strokeWidth={17}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			/>
			<rect x={x + l.dx - 19} y={-16 - l.up} width={38} height={16} rx={7} fill={c.foot} />
			<rect x={x + l.dx - 19} y={-16 - l.up} width={38} height={5} rx={2.5} fill={c.metal} opacity={0.5} />
		</g>
	);

	return (
		<g transform={`translate(${p.x} ${p.y}) scale(${s * facing} ${s})`}>
			<ellipse cx={0} cy={2} rx={70} ry={11} fill="#000" opacity={0.22 * (1 - tintAmt * 0.4)} />
			<g transform={`rotate(${p.lean ?? 0} 0 0)`}>
				<g transform={`translate(0 ${lift})`}><ArmShape side={-1} arm={armL} c={c} hold={p.holdL} /></g>
				{leg(-25, legL)}
				{leg(25, legR)}
				<g transform={`translate(0 ${lift})`}>
					{/* torso */}
					<rect x={-57} y={-152} width={114} height={114} rx={22} fill={c.body} />
					<path d="M 22 -152 H 35 Q 57 -152 57 -130 V -60 Q 57 -38 35 -38 H 22 Z" fill={c.bodyLo} opacity={0.55} />
					<path d="M -47 -140 Q -47 -146 -40 -146 H 10" stroke={c.bodyHi} strokeWidth={5} strokeLinecap="round" fill="none" />
					<circle cx={-40} cy={-56} r={6} fill={c.rust} opacity={0.6} />
					<circle cx={42} cy={-142} r={4} fill={c.rust} opacity={0.6} />
					<circle cx={-46} cy={-102} r={3} fill={c.rust} opacity={0.5} />
					<rect x={-46} y={-60} width={30} height={6} rx={3} fill={c.bodyLo} />
					<circle cx={34} cy={-56} r={5} fill={c.metalLo} />
					{/* chest cavity */}
					<rect x={-33} y={-130} width={66} height={64} rx={10} fill={c.dark} />
					{(p.chestSoil ?? 0) > 0 ? (
						<path
							d={`M -31 -68 V ${-68 - 30 * (p.chestSoil ?? 0)} Q 0 ${-76 - 34 * (p.chestSoil ?? 0)} 31 ${-68 - 30 * (p.chestSoil ?? 0)} V -68 Z`}
							fill="#5b3b25"
						/>
					) : null}
					{(p.chestSoil ?? 0) > 0 ? (
						<path
							d={`M -31 ${-68 - 30 * (p.chestSoil ?? 0)} Q 0 ${-76 - 34 * (p.chestSoil ?? 0)} 31 ${-68 - 30 * (p.chestSoil ?? 0)}`}
							stroke="#7a5233"
							strokeWidth={4}
							fill="none"
						/>
					) : null}
					<g transform={`translate(-33 0) scale(${doorScale} 1)`}>
						<rect x={0} y={-130} width={66} height={64} rx={10} fill={doorScale > 0 ? c.door : c.bodyLo} />
						{doorScale > 0 ? (
							<>
								<rect x={10} y={-118} width={46} height={8} rx={4} fill={c.bodyLo} opacity={0.6} />
								<rect x={10} y={-102} width={46} height={8} rx={4} fill={c.bodyLo} opacity={0.6} />
								<circle cx={54} cy={-80} r={5} fill={c.metal} />
							</>
						) : null}
					</g>
					{moss > 0 ? (
						<g opacity={Math.min(1, moss * 1.4)} fill="#6fae4f">
							<path d={`M -57 -48 Q -40 ${-60 - moss * 14} -20 -46 Q -2 ${-58 - moss * 10} 12 -42 L 12 -38 L -57 -38 Z`} />
							<circle cx={48} cy={-150} r={10 * moss} />
							<circle cx={36} cy={-154} r={7 * moss} fill="#86c45e" />
						</g>
					) : null}
					{/* head */}
					<g transform={`translate(0 -152) rotate(${p.headTilt ?? 0} 0 -10)`}>
						<rect x={-9} y={-16} width={18} height={18} fill={c.metalLo} />
						<line x1={0} y1={-108} x2={0} y2={-138} stroke={c.metalLo} strokeWidth={5} />
						<circle cx={0} cy={-143} r={8} fill={mix(c.metal, '#ffd76a', antenna)} />
						{antenna > 0.05 ? <circle cx={0} cy={-143} r={18} fill="#ffd76a" opacity={0.25 * antenna} /> : null}
						<rect x={-64} y={-110} width={128} height={96} rx={38} fill={c.body} />
						<path d="M 26 -110 Q 64 -110 64 -72 V -52 Q 64 -14 26 -14 Z" fill={c.bodyLo} opacity={0.5} />
						<circle cx={-66} cy={-62} r={11} fill={c.metalLo} />
						<circle cx={66} cy={-62} r={11} fill={c.metalLo} />
						<rect x={-48} y={-96} width={96} height={68} rx={26} fill={c.dark} />
						<rect x={-48} y={-96} width={96} height={68} rx={26} fill={eyeColor} opacity={0.06 * glow} />
						<Eyes mood={p.mood ?? 'neutral'} open={p.open ?? 1} look={p.look ?? [0, 0]} glow={glow} color={eyeColor} />
						<path d="M -36 -88 Q -44 -80 -42 -66" stroke="#ffffff" strokeWidth={4} opacity={0.12} fill="none" strokeLinecap="round" />
						{moss > 0.2 ? (
							<g opacity={Math.min(1, (moss - 0.2) * 2)}>
								<path d="M -30 -110 Q -36 -130 -20 -136 Q -18 -120 -30 -110" fill="#79bb55" />
								<path d="M -28 -110 Q -10 -128 4 -122 Q -10 -108 -28 -110" fill="#5e9e45" />
							</g>
						) : null}
					</g>
					{dust > 0 ? (
						<g fill="#cfc4b4" opacity={dust}>
							<circle cx={-30} cy={-150} r={5} />
							<circle cx={10} cy={-152} r={4} />
							<circle cx={40} cy={-120} r={3} />
							<circle cx={-20} cy={-262} r={5} />
							<circle cx={25} cy={-261} r={4} />
							<rect x={-50} y={-154} width={90} height={5} rx={2.5} />
							<rect x={-40} y={-264} width={70} height={5} rx={2.5} />
						</g>
					) : null}
				</g>
				<g transform={`translate(0 ${lift})`}><ArmShape side={1} arm={armR} c={c} hold={p.holdR} /></g>
			</g>
		</g>
	);
};

// World position of a hand's grip point (where `hold` content is drawn).
export const handPos = (p: RobotProps, side: 1 | -1) => {
	const s = p.scale ?? 1;
	const facing = p.facing ?? 1;
	const walking = p.walk !== null && p.walk !== undefined;
	const step = walking ? Math.sin(p.walk as number) : 0;
	const bob = (walking ? Math.abs(Math.cos(p.walk as number)) * 5 : 0) + (p.bob ?? 0);
	const lift = (p.crouch ?? 0) * 26 - bob;
	const def = {s: walking ? 8 + side * -step * 14 : 6, e: walking ? 12 : 8};
	const arm = (side === 1 ? p.armR : p.armL) ?? def;
	const d = Math.PI / 180;
	const ex = side * 60 + side * 46 * Math.sin(arm.s * d);
	const ey = -128 + lift + 46 * Math.cos(arm.s * d);
	const hx = ex + side * 40 * Math.sin((arm.s + arm.e) * d);
	const hy = ey + 40 * Math.cos((arm.s + arm.e) * d) + 14;
	const L = ((p.lean ?? 0) * Math.PI) / 180;
	const lx = hx * Math.cos(L) - hy * Math.sin(L);
	const ly = hx * Math.sin(L) + hy * Math.cos(L);
	return {x: p.x + lx * s * facing, y: p.y + ly * s};
};

// Eye-screen center in world space (for projections and light beams).
export const eyePos = (p: RobotProps) => {
	const s = p.scale ?? 1;
	const lift = (p.crouch ?? 0) * 26 - (p.bob ?? 0);
	return {x: p.x + (p.look?.[0] ?? 0) * 10 * s * (p.facing ?? 1), y: p.y + (-152 - 61 + lift) * s};
};
