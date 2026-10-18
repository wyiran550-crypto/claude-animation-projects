import React, {useMemo} from 'react';
import {PAL, Sky, Vignette, Fade, LightRays, Motes} from '../components/Env';
import {LogLine, Subtitle} from '../components/Hud';
import {Bird, Grass, Seed, Tree} from '../components/Plant';
import {Robot, RobotProps, robotChest} from '../components/Robot';
import {Cam, Svg} from '../components/Stage';
import {clamp, easeOut, kf, mixPalette, rng, useF} from '../lib';
import {LOGS} from '../timing';
import {Park} from './S4';

export const ROBOT_X = 790;
export const TREE_SCALE = 1.35;

export const useGrass = () =>
	useMemo(() => {
		const r = rng(123);
		const out: {x: number; y: number; s: number; d: number; fl: string | null}[] = [];
		for (let x = -1600; x < 3600; x += 26 + r() * 40) {
			out.push({
				x,
				y: 884 + r() * 50,
				s: 0.8 + r() * 0.9,
				d: Math.abs(x - ROBOT_X) + r() * 300,
				fl: r() < 0.22 ? ['#ffc2d4', '#fff1a8', '#c8b6ff', '#ffffff'][Math.floor(r() * 4)] : null,
			});
		}
		return out;
	}, []);

export const restingRobot = (f: number, alive: number): RobotProps => ({
	x: ROBOT_X,
	y: 880,
	scale: 1.7,
	crouch: 1,
	lean: -5 * (1 - alive),
	headTilt: -12 + alive * 8,
	look: [kf(alive, [0, 1], [0, -0.3]), kf(alive, [0, 1], [1, -1])],
	open: 0.4 + alive * 0.6,
	armR: {s: 6, e: 6},
	armL: {s: 6, e: 6},
	chestOpen: 1,
	chestSoil: 1,
	glow: 0,
	antenna: 0,
});

// Growth: rain clears, a sprout breaks through, years pass, the robot wakes beneath a tree.
export const S6: React.FC = () => {
	const f = useF();
	const grass = useGrass();
	// day/night time-lapse between 300 and 760
	const tl = clamp((f - 300) / 460);
	const cycles = 5;
	const dayness = f < 300 ? 1 : f > 760 ? 1 : 0.5 + 0.5 * Math.cos(tl * cycles * Math.PI * 2);
	const basePal = f < 300 ? mixPalette([PAL.storm, PAL.dawn], kf(f, [0, 150], [0, 1])) : mixPalette([PAL.dawn, PAL.green], kf(f, [300, 500], [0, 1]));
	const pal = mixPalette([PAL.night, basePal], f < 300 ? 1 : dayness);
	const cycleT = (tl * cycles) % 1;
	const sun = f < 300 ? {x: 1500, y: kf(f, [0, 300], [760, 520]), r: 60, color: '#ffe6b0', glow: 1.2} : {x: 200 + cycleT * 1600, y: 700 - Math.sin(cycleT * Math.PI) * 560, r: 55, color: '#fff3cf', glow: 1};
	const g = f < 150 ? 0 : f < 300 ? kf(f, [150, 300], [0, 0.17], easeOut) : kf(f, [300, 760], [0.17, 0.92]);
	const green = kf(f, [320, 760], [0, 1]);
	const moss = kf(f, [320, 700], [0, 1]);
	const glowOn = (() => {
		if (f < 915) return 0;
		if (f > 950) return 1;
		const r = rng(Math.floor(f / 2) + 3)();
		return r < (f - 915) / 35 + 0.1 ? 0.5 + r * 0.5 : 0.05;
	})();
	const rp: RobotProps = {
		...restingRobot(f, kf(f, [925, 965], [0, 1])),
		glow: glowOn,
		antenna: glowOn,
		moss,
		mood: f >= 925 && f < 960 ? 'surprised' : f >= 960 ? 'happy' : 'neutral',
		tint: '#101833',
		tintAmt: f < 300 ? kf(f, [0, 200], [0.5, 0.1]) : (1 - dayness) * 0.5,
	};
	const chest = robotChest(rp);
	const spread = kf(f, [380, 760], [0, 2600]);
	const bloom = kf(f, [760, 880], [0, 1]);
	const bird = (() => {
		if (f < 790) return null;
		const t = clamp((f - 790) / 70);
		const ex = ROBOT_X - 38;
		const ey = 468;
		const x = kf(t, [0, 1], [ROBOT_X + 1100, ex], easeOut);
		const y = kf(t, [0, 1], [150, ey], (u) => u) - Math.sin(t * Math.PI) * 120;
		return {x, y, flap: t < 1, facing: -1 as const};
	})();
	const cam = {
		cx: kf(f, [0, 120, 260, 300, 760, 800, 1020], [820, 820, chest.x + 20, chest.x + 20, 900, 860, 860]),
		cy: kf(f, [0, 120, 260, 300, 760, 800, 1020], [690, 700, chest.y - 60, chest.y - 60, 470, 600, 590]),
		z: kf(f, [0, 120, 260, 300, 760, 800, 1020], [1.4, 1.5, 2.3, 2.3, 0.78, 1.3, 1.4]),
	};
	// rain drips from the head early on
	const drips = [60, 110, 160, 230].map((d) => {
		const t = f - d;
		if (t < 0 || t > 30) return null;
		return <ellipse key={d} cx={ROBOT_X + 70} cy={560 + t * t * 0.4} rx={4} ry={7} fill="#b9d4ff" opacity={0.8} />;
	});
	return (
		<Svg>
			<Sky pal={pal} frame={f} sun={dayness > 0.3 ? {...sun, glow: dayness} : undefined} moon={{x: 1600 - cycleT * 1400, y: 160, r: 40, o: f > 300 && f < 760 ? 1 - dayness : 0}} stars={f > 300 && f < 760 ? 1 - dayness : 0} clouds={0.4} />
			<Cam cam={cam} f={f}>
				<Park f={f} storm={0} pal={pal} green={green} soil={0.3} day={f < 300 ? kf(f, [0, 200], [0, 0.8]) : dayness}>
					{/* puddles */}
					<g opacity={kf(f, [0, 400], [0.8, 0])}>
						<ellipse cx={1100} cy={905} rx={140} ry={12} fill={pal.mid} opacity={0.6} />
						<ellipse cx={420} cy={915} rx={90} ry={8} fill={pal.mid} opacity={0.5} />
					</g>
					{grass.map((gr, i) => (
						<Grass key={i} x={gr.x} y={gr.y} s={gr.s * clamp((spread - gr.d) / 300)} frame={f} color={i % 3 ? '#5fa64a' : '#4f9440'} flower={bloom > 0.3 ? gr.fl : null} />
					))}
					<g transform={`translate(${chest.x + 6} ${chest.y - 20}) scale(${TREE_SCALE})`}>
						{g >= 0.18 ? <Tree g={g} bloom={bloom} frame={f} sway={0.6} bend={44} /> : null}
					</g>
					<Robot {...rp} />
					{f < 160 ? <Seed x={chest.x + 4} y={chest.y - 18} s={0.8} glow={kf(f, [100, 150], [0.3, 1.2])} frame={f} rot={10} /> : null}
					<g transform={`translate(${chest.x + 4} ${chest.y - 14}) scale(${1.1})`}>
						<Tree g={Math.min(g, 0.17)} frame={f} sway={1} glow={kf(f, [150, 200, 300, 340], [0, 1, 1, 0])} />
					</g>
					{drips}
					{bird ? <Bird x={bird.x} y={bird.y} s={1.4} frame={f} flap={bird.flap} facing={bird.facing} /> : null}
				</Park>
				<LightRays x={300} y={-200} o={kf(f, [840, 920], [0, 0.55])} frame={f} spread={0.6} color="#fff6c8" />
			</Cam>
			<Motes frame={f} n={30} color="#fffbd0" opacity={kf(f, [760, 860], [0, 0.8])} seed={5} />
			<Subtitle f={f} at={560} dur={150} text="很多年以后……" />
			{LOGS.s6.map((l) => (
				<LogLine key={l.at} f={f} {...l} x={110} y={110} />
			))}
			<Vignette amount={0.45} />
			<Fade o={kf(f, [0, 90], [1, 0])} />
			<Fade o={kf(f, [296, 300, 306], [0, 0.6, 0], (t) => t)} color="#ffffff" />
		</Svg>
	);
};

