import React from 'react';
import {Car, City, Dust, Ground, Haze, Lamp, PAL, Rubble, Sign, Sky, Vignette, Fade} from '../components/Env';
import {LogLine} from '../components/Hud';
import {Robot, Mood} from '../components/Robot';
import {Cam, PL, Svg, walkAt, stepPx} from '../components/Stage';
import {backOut, clamp, kf, mix, rng, useF} from '../lib';
import {LOGS, WALKS} from '../timing';

const Broom: React.FC = () => (
	<g transform="rotate(-28)">
		<line x1={0} y1={-40} x2={0} y2={150} stroke="#8a6440" strokeWidth={7} strokeLinecap="round" />
		<path d="M -6 146 L 6 146 L 22 196 L -22 196 Z" fill="#c9a25a" />
		<path d="M -14 170 L 14 170" stroke="#a07c3c" strokeWidth={3} />
	</g>
);

const flicker = (f: number, a: number, b: number) => {
	if (f < a) return 0;
	if (f >= b) return 1;
	const r = rng(Math.floor(f / 2) + 7)();
	return r < (f - a) / (b - a) + 0.15 ? 0.6 + r * 0.4 : 0.05;
};

// Wake-up: the robot boots, shakes off the dust, and begins its daily sweep.
export const S2: React.FC = () => {
	const f = useF();
	const pal = PAL.day;
	const S = 1.5;
	const {phase, walked} = walkAt(f, WALKS.s2);
	const rx = 620 + walked * stepPx(S);
	const glow = flicker(f, 40, 78);
	const crouch = kf(f, [0, 200, 238], [1, 1, 0], backOut);
	const lookY = kf(f, [80, 110], [0.9, 0]);
	const lookX = kf(f, [110, 128, 148, 168, 185, 330, 350, 420, 432, 450, 700, 712], [0, -1, -1, 1, 0, 0, 0, 0, 0.8, 0.4, 0.4, 0.9]);
	const lookUp = kf(f, [330, 350, 415, 430, 708, 722], [0, 0.8, 0.8, 0, 0, -0.8]);
	const shakeT = f - 235;
	const lean = shakeT > 0 && shakeT < 45 ? Math.sin(shakeT * 1.3) * 7 * (1 - shakeT / 45) : 0;
	const sad = f > 340 && f < 425;
	const blink = [150, 300, 455, 610].some((b) => f >= b && f < b + 6);
	let mood: Mood = 'neutral';
	if (sad) mood = 'sad';
	if (f >= 726) mood = 'surprised';
	const hasBroom = f >= 432;
	const sweep = phase !== null ? Math.sin(((f - 470) / 50) * Math.PI * 2) : 0;
	const armR = hasBroom
		? {s: 26 + sweep * 18 + kf(f, [700, 715], [0, -10]), e: 30 + sweep * 10}
		: {s: kf(f, [415, 432], [6, 52]), e: kf(f, [415, 432], [8, 10])};
	const armL = sad ? {s: 2, e: 4} : undefined;
	const camX = Math.max(960, rx + 200);
	const cam = {cx: camX, cy: kf(f, [0, 200, 700, 760], [600, 560, 560, 520]), z: kf(f, [0, 200, 700, 760], [1.35, 1.15, 1.15, 1.22])};
	const dust = kf(f, [235, 270], [1, 0]);

	// falling dust specks during the shake
	const r = rng(3);
	const specks = Array.from({length: 26}, () => ({dx: (r() - 0.5) * 220, dy: -380 + r() * 300, v: 3 + r() * 4}));
	// sweep puffs at broom bristles
	const puffs = [470, 520, 570, 620, 670].map((p) => {
		const t = f - p - 8;
		if (t < 0 || t > 40) return null;
		const k = t / 40;
		return (
			<g key={p} opacity={0.5 * (1 - k)} fill="#d8cdb6">
				<circle cx={rx + 150 + k * 60} cy={872 - k * 40} r={14 + k * 30} />
				<circle cx={rx + 120 + k * 90} cy={878 - k * 20} r={10 + k * 22} />
			</g>
		);
	});
	return (
		<Svg>
			<Sky pal={pal} frame={f} sun={{x: 380, y: 230, r: 55, color: '#fff3d6', glow: 0.9}} clouds={0.5} />
			<Cam cam={cam} f={f}>
				<PL cam={cam} k={0.2}>
					<City seed={11} baseY={880} color={mix(pal.haze, '#7d8a99', 0.35)} windowColor={mix(pal.haze, '#7d8a99', 0.5)} minH={260} maxH={540} gap={20} detail={false} />
					<Haze color={pal.haze} y0={560} y1={890} o={0.6} />
				</PL>
				<PL cam={cam} k={0.5}>
					<City seed={12} baseY={890} color="#a39c95" windowColor="#7b7570" minH={200} maxH={420} gap={80} />
					<Haze color={pal.haze} y0={760} y1={900} o={0.3} />
				</PL>
				<Ground y={880} color="#8d8478" line="#6f675d" />
				<rect x={-2000} y={940} width={10000} height={14} fill="#a59b8d" opacity={0.6} />
				<Rubble x={420} y={890} color="#6f675d" s={1.4} seed={9} />
				<Car x={1150} y={905} color="#7a6f66" dark="#4f4741" s={1.1} />
				{!hasBroom ? (
					<g transform="translate(760 880) rotate(14) translate(0 -190)">
						<Broom />
					</g>
				) : null}
				<Lamp x={1700} y={884} color="#5c554e" bent={0.4} />
				<Sign x={2050} y={890} color="#5c554e" text="请勿乱扔垃圾" tilt={6} />
				<Rubble x={2400} y={895} color="#6f675d" s={0.9} seed={14} />
				{puffs}
				<Robot
					x={rx}
					y={880}
					scale={S}
					walk={phase}
					crouch={crouch}
					lean={lean}
					glow={glow}
					antenna={glow}
					open={blink ? 0.05 : f < 90 ? 0.55 : 1}
					look={[lookX, f < 110 ? lookY : lookUp]}
					headTilt={kf(f, [0, 80, 110, 340, 360, 415, 430], [-14, -14, 0, 0, -8, -8, 0])}
					mood={mood}
					armR={armR}
					armL={armL}
					holdR={hasBroom ? <g transform="translate(-10 -40) rotate(-30)"><Broom /></g> : undefined}
					dust={dust}
				/>
				{f > 235 && f < 300
					? specks.map((s, i) => {
							const t = f - 235;
							return <circle key={i} cx={rx + s.dx} cy={880 + s.dy + t * s.v * 0.7 + t * t * 0.06} r={3} fill="#cfc4b4" opacity={clamp(1 - t / 60)} />;
						})
					: null}
				{f >= 712 ? (
					<g transform={`translate(${rx + 700} ${420}) rotate(${f * 3}) scale(${1.6 + 0.4 * Math.sin(f * 0.4)})`} opacity={kf(f, [712, 722, 760, 780], [0, 1, 1, 0.6])}>
						<path d="M 0 -26 L 5 -5 L 26 0 L 5 5 L 0 26 L -5 5 L -26 0 L -5 -5 Z" fill="#f4ffd8" />
						<circle r={30} fill="#d6ffb0" opacity={0.25} />
					</g>
				) : null}
			</Cam>
			<Dust frame={f} n={50} color="#fff8e6" opacity={0.4} wind={0.8} />
			{LOGS.s2.map((l) => (
				<LogLine key={l.at} f={f} {...l} x={110} y={110} />
			))}
			<Vignette amount={0.45} />
			<Fade o={kf(f, [0, 30], [1, 0])} />
			<Fade o={kf(f, [760, 780], [0, 1])} color="#ffffff" />
		</Svg>
	);
};
