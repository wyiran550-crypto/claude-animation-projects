import React from 'react';
import {Dust, PAL, Rain, Sky, Vignette, Fade} from '../components/Env';
import {Battery, LogLine} from '../components/Hud';
import {Seed} from '../components/Plant';
import {Robot, RobotProps, robotChest} from '../components/Robot';
import {Cam, Svg} from '../components/Stage';
import {clamp, kf, rng, useF} from '../lib';
import {LOGS} from '../timing';
import {Park} from './S4';

const BOLTS = [40, 255, 600];

const Bolt: React.FC<{f: number; at: number; x: number}> = ({f, at, x}) => {
	const t = f - at;
	if (t < 0 || t > 8) return null;
	const r = rng(at);
	let px = x;
	let py = 0;
	const pts = [`${px},${py}`];
	while (py < 620) {
		px += (r() - 0.5) * 90;
		py += 40 + r() * 50;
		pts.push(`${px},${py}`);
	}
	return <polyline points={pts.join(' ')} stroke="#f2f5ff" strokeWidth={6 - t * 0.5} fill="none" opacity={1 - t / 8} strokeLinejoin="round" />;
};

const Debris: React.FC<{f: number; amount: number}> = ({f, amount}) => {
	const r = rng(9);
	const items = Array.from({length: 12}, () => ({y: 200 + r() * 700, v: 18 + r() * 20, p: r() * 3000, kind: r() < 0.5, s: 0.6 + r() * 0.8}));
	return (
		<g opacity={amount}>
			{items.map((it, i) => {
				const x = ((it.p + f * it.v) % 2600) - 300;
				const y = it.y + Math.sin(f * 0.1 + i) * 40;
				return (
					<g key={i} transform={`translate(${x} ${y}) rotate(${f * (8 + i)}) scale(${it.s})`}>
						{it.kind ? <rect x={-18} y={-12} width={36} height={24} fill="#b8b2a6" opacity={0.8} /> : <path d="M 0 -10 Q 10 0 0 10 Q -10 0 0 -10" fill="#6b5a40" />}
					</g>
				);
			})}
		</g>
	);
};

// Storm: the robot plants the seed in its own chest and runs out of power.
export const S5: React.FC = () => {
	const f = useF();
	const pal = PAL.storm;
	const S = 1.7;
	const scoop = (a: number) => {
		const t = (f - a) / 30;
		return t >= 0 && t < 1 ? Math.sin(t * Math.PI) : 0;
	};
	const sc = scoop(200) + scoop(240);
	const hugR = {s: 18, e: 55};
	const armR = f < 140 ? hugR : f < 200 ? {s: kf(f, [140, 170], [20, 30]), e: kf(f, [140, 170], [120, 40])} : f < 275 ? {s: 30 + sc * 20, e: 40 - sc * 30} : {s: kf(f, [380, 480, 540], [30, 18, 6]), e: kf(f, [380, 480, 540], [40, 30, 6])};
	const seedToChest = kf(f, [275, 300], [0, 1]);
	const armL = f < 275 ? {s: 20, e: 115} : f < 330 ? {s: 20 + seedToChest * 10, e: 115 + seedToChest * 25} : {s: kf(f, [380, 480, 540], [30, 18, 6]), e: kf(f, [380, 480, 540], [140, 60, 6])};
	const powerOff = (() => {
		if (f < 480) return 1;
		if (f > 560) return 0;
		const r = rng(Math.floor(f / 3))();
		const base = 1 - (f - 480) / 80;
		return r < 0.35 ? base * 0.2 : base;
	})();
	const gust = Math.sin(f * 0.07) * 0.5 + Math.sin(f * 0.19) * 0.5;
	const rp: RobotProps = {
		x: 790,
		y: 880,
		scale: S,
		crouch: kf(f, [380, 440], [0.85, 1]),
		lean: -5 + gust * 3 * (f < 480 ? 1 : 0.3),
		look: [kf(f, [130, 150, 300, 330], [0.6, 0, 0, 0.2]), kf(f, [130, 150, 380, 440], [0, 1, 1, 1])],
		headTilt: kf(f, [380, 460], [0, -12]),
		mood: f > 330 && f < 470 ? 'sad' : f >= 470 ? 'closed' : 'neutral',
		open: f > 440 ? kf(f, [440, 480], [1, 0.4]) : 1,
		glow: powerOff,
		antenna: powerOff * 0.8,
		armR,
		armL,
		holdL: f < 300 ? <Seed x={0} y={0} s={0.75} glow={0.9} frame={f} /> : undefined,
		chestOpen: kf(f, [160, 192], [0, 1]),
		chestSoil: kf(f, [205, 230, 245, 270], [0, 0.5, 0.5, 1]),
		tint: '#141a2a',
		tintAmt: 0.5,
	};
	const chest = robotChest(rp);
	const flash = Math.max(...BOLTS.map((b) => kf(f, [b - 1, b + 1, b + 6, b + 14], [0, 0.85, 0.25, 0], (t) => t)));
	const rain = kf(f, [330, 380], [0, 1]);
	const cam = {
		cx: kf(f, [0, 140, 200, 330, 440, 600], [900, 860, 830, 830, 800, 800]),
		cy: kf(f, [0, 140, 200, 330, 440, 600], [620, 700, 700, 680, 690, 690]),
		z: kf(f, [0, 140, 200, 330, 440, 600], [1.2, 1.6, 1.6, 1.45, 1.75, 1.9]),
		shake: BOLTS.some((b) => f >= b && f < b + 8) ? 7 : 1.5,
	};
	const chestLight = f >= 300 ? 1 - clamp((f - 560) / 60) * 0.5 : 0;
	return (
		<Svg>
			<Sky pal={pal} frame={f} clouds={1} cloudColor="#2a2e38" />
			{BOLTS.map((b, i) => (
				<Bolt key={b} f={f} at={b} x={[1500, 400, 1200][i]} />
			))}
			<Cam cam={cam} f={f}>
				<Park f={f} storm={1} pal={pal} soil={kf(f, [205, 270], [1, 0.3])}>
					<Robot {...rp} />
					{f >= 300 ? (
						<Seed x={chest.x + 4} y={chest.y + kf(f, [300, 310], [-20, 0]) - 18} s={0.8} glow={chestLight} frame={f} rot={10} />
					) : null}
					{f >= 290 && f < 300 ? <Seed x={chest.x} y={chest.y - 40} s={0.8} glow={1} frame={f} /> : null}
				</Park>
			</Cam>
			<Debris f={f} amount={kf(f, [0, 30, 480, 560], [0.6, 1, 1, 0.3])} />
			<Dust frame={f} n={110} color="#bdb8c8" opacity={0.45 * (1 - rain * 0.6)} wind={7} seed={8} />
			<Rain frame={f} amount={rain} slant={0.35} />
			<Fade o={flash} color="#e9eeff" />
			{LOGS.s5.map((l) => (
				<LogLine key={l.at} f={f} {...l} x={110} y={110} color={l.at === 350 ? '#ff8f8f' : '#8ff4ff'} />
			))}
			<Battery level={kf(f, [340, 480, 500], [0.03, 0.03, 0])} x={1730} y={60} o={kf(f, [340, 350, 500, 520], [0, 1, 1, 0])} f={f} />
			<Vignette amount={0.75} />
			<Fade o={kf(f, [0, 15], [1, 0])} />
			<Fade o={kf(f, [610, 650], [0, 1])} />
		</Svg>
	);
};
