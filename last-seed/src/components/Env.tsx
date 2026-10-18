import React, {useMemo} from 'react';
import {clamp, mix, rng, W, H} from '../lib';

export type SkyPal = {top: string; mid: string; bottom: string; haze: string};

export const PAL: Record<string, SkyPal> = {
	dusk: {top: '#2b3563', mid: '#c06f6c', bottom: '#f3b17c', haze: '#e7a07c'},
	day: {top: '#86a9c2', mid: '#d4cbb8', bottom: '#e8dcc3', haze: '#d9cdb5'},
	noon: {top: '#7aa3c4', mid: '#c9cfc8', bottom: '#e6dcc6', haze: '#d5d0c0'},
	sunset: {top: '#3c3f73', mid: '#d0705a', bottom: '#f7a35c', haze: '#e88a5f'},
	night: {top: '#090d22', mid: '#18204a', bottom: '#2c3566', haze: '#252d58'},
	storm: {top: '#14161e', mid: '#23272f', bottom: '#373b45', haze: '#30343e'},
	dawn: {top: '#4d6fae', mid: '#efa996', bottom: '#ffdcaa', haze: '#f6c6a2'},
	green: {top: '#4f9fdc', mid: '#9fd3ee', bottom: '#f1f0d6', haze: '#cfe6e4'},
};

// ---------------------------------------------------------------- sky

export const Sky: React.FC<{
	pal: SkyPal;
	sun?: {x: number; y: number; r: number; color: string; glow?: number};
	moon?: {x: number; y: number; r: number; o: number};
	stars?: number;
	frame: number;
	clouds?: number;
	cloudColor?: string;
}> = ({pal, sun, moon, stars = 0, frame, clouds = 0, cloudColor}) => {
	const starList = useMemo(() => {
		const r = rng(42);
		return Array.from({length: 160}, () => ({x: r() * W, y: r() * H * 0.62, s: 0.6 + r() * 1.8, p: r() * 6.28}));
	}, []);
	const cloudList = useMemo(() => {
		const r = rng(7);
		return Array.from({length: 7}, (_, i) => ({x: r() * 2600 - 300, y: 80 + r() * 300, s: 0.6 + r() * 0.9, v: 0.15 + r() * 0.25, i}));
	}, []);
	const cc = cloudColor ?? mix(pal.mid, '#ffffff', 0.25);
	return (
		<g>
			<defs>
				<linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={pal.top} />
					<stop offset="0.6" stopColor={pal.mid} />
					<stop offset="1" stopColor={pal.bottom} />
				</linearGradient>
				<radialGradient id="sung">
					<stop offset="0" stopColor={sun?.color ?? '#fff'} stopOpacity={0.9} />
					<stop offset="0.25" stopColor={sun?.color ?? '#fff'} stopOpacity={0.35} />
					<stop offset="1" stopColor={sun?.color ?? '#fff'} stopOpacity={0} />
				</radialGradient>
			</defs>
			<rect x={-10} y={-10} width={W + 20} height={H + 20} fill="url(#skyg)" />
			{stars > 0 ? (
				<g fill="#fff">
					{starList.map((s, i) => (
						<circle key={i} cx={s.x} cy={s.y} r={s.s} opacity={stars * (0.45 + 0.55 * Math.sin(frame * 0.05 + s.p) ** 2)} />
					))}
				</g>
			) : null}
			{moon && moon.o > 0 ? (
				<g opacity={moon.o}>
					<defs>
						<radialGradient id="moong">
							<stop offset="0" stopColor="#dfe6ff" stopOpacity={0.35} />
							<stop offset="1" stopColor="#dfe6ff" stopOpacity={0} />
						</radialGradient>
					</defs>
					<circle cx={moon.x} cy={moon.y} r={moon.r * 4} fill="url(#moong)" />
					<circle cx={moon.x} cy={moon.y} r={moon.r} fill="#eef1ff" />
					<circle cx={moon.x + moon.r * 0.35} cy={moon.y - moon.r * 0.2} r={moon.r * 0.9} fill={pal.top} opacity={0.0} />
					<circle cx={moon.x - moon.r * 0.3} cy={moon.y + moon.r * 0.2} r={moon.r * 0.18} fill="#d5dbf0" />
					<circle cx={moon.x + moon.r * 0.25} cy={moon.y - moon.r * 0.3} r={moon.r * 0.12} fill="#d5dbf0" />
				</g>
			) : null}
			{sun ? (
				<g>
					<circle cx={sun.x} cy={sun.y} r={sun.r * 6 * (sun.glow ?? 1)} fill="url(#sung)" />
					<circle cx={sun.x} cy={sun.y} r={sun.r} fill={sun.color} />
				</g>
			) : null}
			{clouds > 0 ? (
				<g fill={cc} opacity={clouds}>
					{cloudList.map((c) => {
						const x = ((c.x + frame * c.v + 400) % 2700) - 400;
						return (
							<g key={c.i} transform={`translate(${x} ${c.y}) scale(${c.s})`}>
								<ellipse cx={0} cy={0} rx={120} ry={22} />
								<ellipse cx={-40} cy={-14} rx={50} ry={26} />
								<ellipse cx={30} cy={-22} rx={60} ry={34} />
							</g>
						);
					})}
				</g>
			) : null}
		</g>
	);
};

// ---------------------------------------------------------------- city

type Building = {
	x: number;
	w: number;
	h: number;
	top: number[]; // jagged roof offsets
	windows: {x: number; y: number; lit: boolean; broken: boolean}[];
	tower: boolean;
	rebar: boolean;
	lean: number;
};

const makeCity = (seed: number, from: number, to: number, minH: number, maxH: number, gap: number) => {
	const r = rng(seed);
	const out: Building[] = [];
	let x = from;
	while (x < to) {
		const w = 110 + r() * 170;
		const h = minH + r() * (maxH - minH);
		const broken = r() < 0.55;
		const n = 6;
		const top = Array.from({length: n + 1}, (_, i) => (broken && i > 0 && i < n ? -r() * 60 : 0));
		if (broken) top[Math.floor(r() * n)] -= 40 + r() * 50;
		const windows: Building['windows'] = [];
		const cols = Math.max(2, Math.floor((w - 30) / 34));
		const rows = Math.floor((h - 70) / 46);
		for (let cy = 0; cy < rows; cy++) {
			for (let cx = 0; cx < cols; cx++) {
				if (r() < 0.12) continue;
				windows.push({x: 18 + cx * ((w - 36) / cols), y: 50 + cy * 46, lit: r() < 0.04, broken: r() < 0.3});
			}
		}
		out.push({x, w, h, top, windows, tower: r() < 0.18, rebar: broken && r() < 0.6, lean: r() < 0.12 ? (r() - 0.5) * 6 : 0});
		x += w + gap * (0.3 + r());
	}
	return out;
};

export const City: React.FC<{
	seed: number;
	baseY: number;
	color: string;
	windowColor: string;
	minH: number;
	maxH: number;
	from?: number;
	to?: number;
	gap?: number;
	green?: number;
	litColor?: string;
	lit?: number;
	detail?: boolean;
}> = ({seed, baseY, color, windowColor, minH, maxH, from = -1200, to = 6400, gap = 30, green = 0, litColor = '#ffd27a', lit = 0, detail = true}) => {
	const bs = useMemo(() => makeCity(seed, from, to, minH, maxH, gap), [seed, from, to, minH, maxH, gap]);
	const r = useMemo(() => rng(seed + 99), [seed]);
	const greens = useMemo(() => bs.map(() => [r(), r(), r(), r()]), [bs, r]);
	const shade = mix(color, '#000000', 0.12);
	return (
		<g>
			{bs.map((b, i) => {
				const n = b.top.length - 1;
				const pts = b.top.map((t, k) => `${(b.w * k) / n},${-b.h + t}`).join(' ');
				const g = greens[i];
				const gv = clamp(green * 1.3 - g[0] * 0.3);
				return (
					<g key={i} transform={`translate(${b.x} ${baseY}) rotate(${b.lean} 0 0)`}>
						<polygon points={`0,0 ${pts} ${b.w},0`} fill={color} />
						<rect x={b.w * 0.72} y={-b.h + 10} width={b.w * 0.28} height={b.h - 10} fill={shade} opacity={0.5} />
						{detail
							? b.windows.map((w, k) =>
									w.y < b.h - 40 && w.y > Math.max(...b.top.map((t) => -t)) + 12 ? (
										<rect
											key={k}
											x={w.x}
											y={-b.h + w.y}
											width={18}
											height={26}
											rx={2}
											fill={w.lit && lit > 0 ? mix(windowColor, litColor, lit) : windowColor}
											opacity={w.broken ? 0.55 : 0.9}
										/>
									) : null,
								)
							: null}
						{b.rebar && detail ? (
							<g stroke={shade} strokeWidth={3}>
								<line x1={b.w * 0.3} y1={-b.h + b.top[2]} x2={b.w * 0.27} y2={-b.h + b.top[2] - 30} />
								<line x1={b.w * 0.5} y1={-b.h + b.top[3]} x2={b.w * 0.55} y2={-b.h + b.top[3] - 24} />
							</g>
						) : null}
						{b.tower ? (
							<g fill={color}>
								<rect x={b.w * 0.2} y={-b.h - 54} width={40} height={36} rx={4} />
								<rect x={b.w * 0.2 + 6} y={-b.h - 20} width={4} height={20} />
								<rect x={b.w * 0.2 + 30} y={-b.h - 20} width={4} height={20} />
							</g>
						) : null}
						{gv > 0 ? (
							<g>
								<path
									d={`M 0 ${-b.h + b.top[0]} ${b.top.map((t, k) => `L ${(b.w * k) / n} ${-b.h + t}`).join(' ')} L ${b.w} ${-b.h + b.top[n] + 16 * gv} L 0 ${-b.h + b.top[0] + 16 * gv} Z`}
									fill="#5fa64a"
									opacity={gv}
								/>
								<path
									d={`M ${b.w * g[1]} ${-b.h + 10} q ${12} ${b.h * 0.25 * gv} ${-6} ${b.h * 0.55 * gv} q ${-10} ${b.h * 0.15 * gv} ${4} ${b.h * 0.3 * gv}`}
									stroke="#4f9440"
									strokeWidth={7}
									fill="none"
									opacity={gv}
									strokeLinecap="round"
								/>
								<circle cx={b.w * g[2]} cy={-b.h + 4} r={18 * gv} fill="#77bd58" opacity={gv} />
								<circle cx={b.w * g[3]} cy={-b.h + 8} r={14 * gv} fill="#4f9440" opacity={gv} />
								{gv > 0.6 ? <circle cx={b.w * g[2] + 8} cy={-b.h - 2} r={5} fill="#ffb3c7" opacity={(gv - 0.6) * 2.5} /> : null}
							</g>
						) : null}
					</g>
				);
			})}
		</g>
	);
};

// Parallax helper: content with factor k moves k times as fast as the camera.
export const Layer: React.FC<{cam: {x: number; y: number}; k: number; children: React.ReactNode}> = ({cam, k, children}) => (
	<g transform={`translate(${-cam.x * k} ${-cam.y * k})`}>{children}</g>
);

// ---------------------------------------------------------------- ground & props

export const Ground: React.FC<{y: number; color: string; line: string; from?: number; to?: number; cracks?: boolean}> = ({
	y,
	color,
	line,
	from = -2000,
	to = 8000,
	cracks = true,
}) => {
	const cr = useMemo(() => {
		const r = rng(5);
		return Array.from({length: 60}, () => ({x: from + r() * (to - from), w: 30 + r() * 90, d: r()}));
	}, [from, to]);
	return (
		<g>
			<rect x={from} y={y} width={to - from} height={1200} fill={color} />
			<rect x={from} y={y} width={to - from} height={10} fill={line} opacity={0.6} />
			{cracks
				? cr.map((c, i) => (
						<path
							key={i}
							d={`M ${c.x} ${y + 30 + c.d * 120} l ${c.w * 0.4} ${8} l ${c.w * 0.3} ${-10} l ${c.w * 0.3} ${6}`}
							stroke={line}
							strokeWidth={3}
							fill="none"
							opacity={0.5}
						/>
					))
				: null}
		</g>
	);
};

export const Lamp: React.FC<{x: number; y: number; color: string; bent?: number; light?: number}> = ({x, y, color, bent = 0, light = 0}) => (
	<g transform={`translate(${x} ${y})`}>
		<rect x={-7} y={-12} width={14} height={12} fill={color} />
		<path d={`M 0 0 V -260 Q 0 -300 ${40 + bent * 20} ${-300 + bent * 60}`} stroke={color} strokeWidth={9} fill="none" />
		<rect x={30 + bent * 20} y={-306 + bent * 60} width={36} height={12} rx={4} fill={color} transform={`rotate(${bent * 40} ${48 + bent * 20} ${-300 + bent * 60})`} />
		{light > 0 ? (
			<polygon points={`${36 + bent * 20},${-292 + bent * 60} ${66 + bent * 20},${-292 + bent * 60} ${150},0 ${-50},0`} fill="#ffe7a8" opacity={0.12 * light} />
		) : null}
	</g>
);

export const Car: React.FC<{x: number; y: number; color: string; dark: string; s?: number; flip?: boolean}> = ({x, y, color, dark, s = 1, flip}) => (
	<g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s}) rotate(-3)`}>
		<path d="M -130 -20 Q -130 -50 -100 -55 L -60 -58 L -30 -100 Q -20 -108 10 -108 L 60 -108 Q 80 -106 95 -80 L 110 -58 Q 135 -54 135 -30 L 135 -18 Z" fill={color} />
		<path d="M -22 -94 L 4 -94 L 4 -62 L -46 -62 Z M 14 -94 L 55 -94 Q 68 -92 80 -62 L 14 -62 Z" fill={dark} opacity={0.75} />
		<circle cx={-75} cy={-14} r={24} fill={dark} />
		<circle cx={85} cy={-12} r={24} fill={dark} />
		<circle cx={-75} cy={-14} r={9} fill={color} opacity={0.6} />
		<path d="M -100 -40 l 30 -6 M 40 -38 l 40 -2" stroke={dark} strokeWidth={4} opacity={0.4} />
	</g>
);

export const Rubble: React.FC<{x: number; y: number; color: string; s?: number; seed?: number}> = ({x, y, color, s = 1, seed = 1}) => {
	const parts = useMemo(() => {
		const r = rng(seed);
		return Array.from({length: 9}, () => ({x: (r() - 0.5) * 220, w: 30 + r() * 70, h: 16 + r() * 50, a: (r() - 0.5) * 50, t: r()}));
	}, [seed]);
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`}>
			<path d="M -160 0 Q -90 -70 0 -80 Q 90 -70 160 0 Z" fill={color} />
			{parts.map((p, i) => (
				<rect
					key={i}
					x={p.x - p.w / 2}
					y={-60 - p.h / 2 + Math.abs(p.x) * 0.3}
					width={p.w}
					height={p.h}
					rx={4}
					fill={mix(color, p.t > 0.5 ? '#000000' : '#ffffff', 0.12)}
					transform={`rotate(${p.a} ${p.x} ${-60 + Math.abs(p.x) * 0.3})`}
				/>
			))}
		</g>
	);
};

export const Sign: React.FC<{x: number; y: number; color: string; text: string; tilt?: number}> = ({x, y, color, text, tilt = 0}) => (
	<g transform={`translate(${x} ${y}) rotate(${tilt})`}>
		<rect x={-4} y={-150} width={8} height={150} fill={color} />
		<rect x={-70} y={-200} width={140} height={60} rx={8} fill={color} />
		<text x={0} y={-160} textAnchor="middle" fontSize={26} fontFamily="WenQuanYi Zen Hei" fill="#e9e1d1" opacity={0.75}>
			{text}
		</text>
	</g>
);

// ---------------------------------------------------------------- particles

export const Dust: React.FC<{frame: number; n?: number; color?: string; opacity?: number; wind?: number; seed?: number; size?: number}> = ({
	frame,
	n = 70,
	color = '#f4e3c7',
	opacity = 0.5,
	wind = 1.5,
	seed = 3,
	size = 1,
}) => {
	const ps = useMemo(() => {
		const r = rng(seed);
		return Array.from({length: n}, () => ({x: r() * W, y: r() * H, s: (1 + r() * 3) * size, v: 0.5 + r(), p: r() * 6.28}));
	}, [n, seed, size]);
	return (
		<g fill={color}>
			{ps.map((p, i) => {
				const x = (((p.x + frame * wind * p.v * 2) % (W + 40)) + W + 40) % (W + 40) - 20;
				const y = p.y + Math.sin(frame * 0.03 + p.p) * 18;
				return <circle key={i} cx={x} cy={y} r={p.s} opacity={opacity * (0.4 + 0.6 * Math.sin(p.p + frame * 0.02) ** 2)} />;
			})}
		</g>
	);
};

export const Rain: React.FC<{frame: number; amount: number; n?: number; slant?: number; color?: string}> = ({
	frame,
	amount,
	n = 260,
	slant = 0.25,
	color = '#b9c6e0',
}) => {
	const ps = useMemo(() => {
		const r = rng(11);
		return Array.from({length: n}, () => ({x: r() * (W + 400), y: r() * H, l: 30 + r() * 40, v: 38 + r() * 20}));
	}, [n]);
	if (amount <= 0) return null;
	const count = Math.floor(n * amount);
	return (
		<g stroke={color} strokeWidth={2} opacity={0.55} strokeLinecap="round">
			{ps.slice(0, count).map((p, i) => {
				const y = (p.y + frame * p.v) % (H + 100) - 50;
				const x = ((p.x - y * slant) % (W + 400) + W + 400) % (W + 400) - 200;
				return <line key={i} x1={x} y1={y} x2={x - p.l * slant} y2={y + p.l} />;
			})}
		</g>
	);
};

export const Motes: React.FC<{frame: number; n?: number; color?: string; opacity?: number; seed?: number; area?: [number, number, number, number]}> = ({
	frame,
	n = 40,
	color = '#fff2b0',
	opacity = 1,
	seed = 21,
	area = [0, 0, W, H],
}) => {
	const ps = useMemo(() => {
		const r = rng(seed);
		return Array.from({length: n}, () => ({x: r(), y: r(), s: 1.5 + r() * 3, p: r() * 6.28, v: 0.3 + r() * 0.7}));
	}, [n, seed]);
	return (
		<g>
			{ps.map((p, i) => {
				const x = area[0] + p.x * area[2] + Math.sin(frame * 0.02 * p.v + p.p) * 30;
				const y = area[1] + ((p.y * area[3] - frame * p.v * 0.6) % area[3] + area[3]) % area[3];
				const tw = 0.5 + 0.5 * Math.sin(frame * 0.08 + p.p);
				return (
					<g key={i} opacity={opacity * tw}>
						<circle cx={x} cy={y} r={p.s * 3} fill={color} opacity={0.2} />
						<circle cx={x} cy={y} r={p.s} fill={color} />
					</g>
				);
			})}
		</g>
	);
};

// ---------------------------------------------------------------- overlays

export const Vignette: React.FC<{amount?: number; color?: string}> = ({amount = 0.55, color = '#000'}) => (
	<g>
		<defs>
			<radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
				<stop offset="0.55" stopColor={color} stopOpacity={0} />
				<stop offset="1" stopColor={color} stopOpacity={amount} />
			</radialGradient>
		</defs>
		<rect x={0} y={0} width={W} height={H} fill="url(#vig)" />
	</g>
);

export const Fade: React.FC<{o: number; color?: string}> = ({o, color = '#000'}) =>
	o > 0 ? <rect x={0} y={0} width={W} height={H} fill={color} opacity={Math.min(1, o)} /> : null;

export const Haze: React.FC<{color: string; y0: number; y1: number; o?: number}> = ({color, y0, y1, o = 0.6}) => {
	const id = `hz${Math.round(y0)}${Math.round(y1)}${color.slice(1)}`;
	return (
		<g>
			<defs>
				<linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={color} stopOpacity={0} />
					<stop offset="1" stopColor={color} stopOpacity={o} />
				</linearGradient>
			</defs>
			<rect x={-4000} y={y0} width={14000} height={y1 - y0} fill={`url(#${id})`} />
		</g>
	);
};

export const LightRays: React.FC<{x: number; y: number; o: number; frame: number; color?: string; spread?: number}> = ({
	x,
	y,
	o,
	frame,
	color = '#fff4c8',
	spread = 1,
}) => {
	if (o <= 0) return null;
	return (
		<g opacity={o} style={{mixBlendMode: 'screen'}}>
			{[-30, -16, -4, 9, 22, 36].map((a, i) => {
				const ang = ((a * spread + Math.sin(frame * 0.01 + i) * 2) * Math.PI) / 180;
				const len = 1500;
				const w = 0.04 + (i % 3) * 0.02;
				const x1 = x + Math.sin(ang - w) * len;
				const y1 = y + Math.cos(ang - w) * len;
				const x2 = x + Math.sin(ang + w) * len;
				const y2 = y + Math.cos(ang + w) * len;
				return <polygon key={i} points={`${x},${y} ${x1},${y1} ${x2},${y2}`} fill={color} opacity={0.14 + 0.06 * Math.sin(frame * 0.03 + i * 2)} />;
			})}
		</g>
	);
};
