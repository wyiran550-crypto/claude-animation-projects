import React from 'react';
import {City, Dust, Ground, Haze, PAL, Rubble, Sky, Vignette, Fade, LightRays, Motes} from '../components/Env';
import {Hologram, LogLine} from '../components/Hud';
import {Seed} from '../components/Plant';
import {Robot, Mood, RobotProps, handPos, eyePos} from '../components/Robot';
import {Cam, PL, Svg, walkAt, stepPx} from '../components/Stage';
import {backOut, kf, mix, useF} from '../lib';
import {LOGS, WALKS} from '../timing';

const GX = 1180; // greenhouse center
const GY = 880;
const PED = {x: 1000, top: 772};

const Greenhouse: React.FC<{front: boolean}> = ({front}) => {
	const R = 360;
	const ribs = [-80, -55, -30, -5, 20, 45, 70];
	if (!front) {
		return (
			<g>
				<path d={`M ${GX - R} ${GY} A ${R} ${R} 0 0 1 ${GX + R} ${GY} Z`} fill="#cfe4e6" opacity={0.25} />
				{/* dead plants inside */}
				{[-250, -190, 150, 210, 260].map((dx, i) => (
					<g key={i} stroke="#7d6a55" strokeWidth={4} fill="none" strokeLinecap="round">
						<path d={`M ${GX + dx} ${GY} q ${-10 + i * 4} -60 ${8} -120 q 10 -30 -6 -50`} />
						<path d={`M ${GX + dx} ${GY - 50} q 20 -10 26 -34`} />
					</g>
				))}
				<rect x={GX + 120} y={GY - 40} width={170} height={40} rx={6} fill="#7a6a5c" />
				<rect x={GX + 120} y={GY - 40} width={170} height={8} rx={4} fill="#8f7e6d" />
			</g>
		);
	}
	return (
		<g>
			{ribs.map((a, i) => {
				const t = (a * Math.PI) / 180;
				return (
					<line
						key={i}
						x1={GX + Math.sin(t) * R}
						y1={GY - Math.cos(t) * R}
						x2={GX + Math.sin(t) * R * (i % 2 ? 1 : 1)}
						y2={GY}
						stroke="#4d5a5f"
						strokeWidth={7}
						opacity={0.85}
					/>
				);
			})}
			<path d={`M ${GX - R} ${GY} A ${R} ${R} 0 0 1 ${GX - 40} ${GY - R + 2}`} stroke="#4d5a5f" strokeWidth={12} fill="none" />
			<path d={`M ${GX + 60} ${GY - R + 6} A ${R} ${R} 0 0 1 ${GX + R} ${GY}`} stroke="#4d5a5f" strokeWidth={12} fill="none" />
			<path d={`M ${GX - R * 0.94} ${GY - 120} H ${GX + R * 0.94}`} stroke="#4d5a5f" strokeWidth={6} />
			<path d={`M ${GX - R * 0.75} ${GY - 230} H ${GX + R * 0.75}`} stroke="#4d5a5f" strokeWidth={6} />
			{/* remaining glass panes with glare */}
			<path d={`M ${GX - 330} ${GY - 120} L ${GX - 270} ${GY - 230} L ${GX - 180} ${GY - 230} L ${GX - 205} ${GY - 120} Z`} fill="#d9f3f5" opacity={0.35} />
			<path d={`M ${GX + 205} ${GY - 120} L ${GX + 180} ${GY - 230} L ${GX + 270} ${GY - 230} L ${GX + 330} ${GY - 120} Z`} fill="#d9f3f5" opacity={0.3} />
			<path d={`M ${GX + 210} ${GY} L ${GX + 210} ${GY - 120} L ${GX + 345} ${GY - 120} L ${GX + 360} ${GY} Z`} fill="#d9f3f5" opacity={0.25} />
			<path d={`M ${GX - 290} ${GY - 150} l 40 -50 M ${GX + 240} ${GY - 150} l 30 -40`} stroke="#ffffff" strokeWidth={5} opacity={0.5} strokeLinecap="round" />
			{/* broken shards on the ground */}
			{[-300, -120, 260, 330].map((dx, i) => (
				<path key={i} d={`M ${GX + dx} ${GY + 6} l 14 -12 l 10 12 Z`} fill="#d9f3f5" opacity={0.6} />
			))}
		</g>
	);
};

const Pedestal: React.FC = () => (
	<g>
		<rect x={PED.x - 34} y={PED.top + 32} width={68} height={GY - PED.top - 32} fill="#8a8178" />
		<rect x={PED.x - 46} y={PED.top + 26} width={92} height={14} rx={4} fill="#9d948a" />
		<rect x={PED.x - 46} y={GY - 14} width={92} height={14} rx={4} fill="#776f67" />
		{/* cracked pot */}
		<path d={`M ${PED.x - 36} ${PED.top - 16} L ${PED.x + 36} ${PED.top - 16} L ${PED.x + 28} ${PED.top + 26} L ${PED.x - 28} ${PED.top + 26} Z`} fill="#b86b45" />
		<rect x={PED.x - 40} y={PED.top - 22} width={80} height={12} rx={4} fill="#c97b52" />
		<path d={`M ${PED.x + 6} ${PED.top - 10} l -6 12 l 8 8 l -4 12`} stroke="#7d4428" strokeWidth={3} fill="none" />
		<ellipse cx={PED.x} cy={PED.top - 18} rx={34} ry={5} fill="#5b3b25" />
	</g>
);

const TreeIcon: React.FC<{f: number}> = ({f}) => {
	const grow = kf(f, [480, 540], [0, 1]);
	return (
		<g>
			<g transform={`translate(110 250) scale(${grow})`} stroke="#bff9ff" strokeWidth={3} fill="none">
				<path d="M -8 0 Q -4 -60 -6 -100 M 8 0 Q 4 -60 6 -100" />
				<path d="M -5 -70 Q -30 -90 -40 -120 M 5 -80 Q 30 -100 36 -128" />
				<circle cx={0} cy={-150} r={58} fill="#8ff4ff" fillOpacity={0.15} />
				<circle cx={-44} cy={-118} r={34} fill="#8ff4ff" fillOpacity={0.12} />
				<circle cx={46} cy={-124} r={36} fill="#8ff4ff" fillOpacity={0.12} />
				<path d="M -60 0 H 60" />
			</g>
			<g fontFamily="WenQuanYi Zen Hei" opacity={kf(f, [520, 545], [0, 1])}>
				<text x={225} y={70} fontSize={34} fill="#dffcff">树</text>
				<text x={225} y={102} fontSize={16} fill="#8ff4ff" letterSpacing={3}>TREE · 植物</text>
				<text x={225} y={150} fontSize={16} fill="#8ff4ff">高度：可达 30 米</text>
				<text x={225} y={176} fontSize={16} fill="#8ff4ff">寿命：数百年</text>
				<g opacity={kf(f, [560, 575], [0, 1])}>
					<rect x={218} y={205} width={150} height={38} rx={6} fill="#ff6b6b" opacity={0.25} />
					<text x={230} y={231} fontSize={20} fill="#ffb3b3">状态：已灭绝</text>
				</g>
			</g>
		</g>
	);
};

// Discovery: a ruined greenhouse, a glowing seed, and a hologram of what it could become.
export const S3: React.FC = () => {
	const f = useF();
	const pal = PAL.noon;
	const S = 1.5;
	const {phase, walked} = walkAt(f, WALKS.s3);
	const rx = 230 + walked * stepPx(S);
	const reach = kf(f, [215, 250], [0, 1]);
	const lift = kf(f, [262, 300], [0, 1]);
	const hug = kf(f, [700, 760], [0, 1]);
	const armR =
		f < 262
			? {s: 6 + reach * 58, e: 8 + reach * 22}
			: {s: 64 + lift * 66 - hug * 100, e: 30 + lift * 70 + hug * 40};
	const holding = f >= 262;
	const mood: Mood = f >= 330 && f < 470 ? 'surprised' : (f >= 600 && f < 690) || f >= 790 ? 'happy' : 'neutral';
	const lookX = kf(f, [130, 145, 160, 215, 262, 300, 470, 490, 590, 610, 700, 720], [0.3, 1, 1, 0.9, 0.9, 1, 1, 1, 1, 0.9, 0.9, 0.3]);
	const lookY = kf(f, [130, 145, 200, 240, 262, 300, 470, 490, 590, 610], [0, 0.4, 0.4, 1, 1, 0.3, 0.3, -0.3, -0.3, 0.3]);
	const nod = f > 790 && f < 850 ? Math.sin((f - 790) * 0.32) * 6 : 0;
	const rp: RobotProps = {
		x: rx,
		y: GY,
		scale: S,
		walk: phase,
		crouch: kf(f, [215, 250, 262, 300], [0, 0.55, 0.55, 0], backOut),
		look: [lookX, lookY],
		headTilt: kf(f, [300, 330, 460, 470], [0, 8, 8, 0]) + nod,
		mood,
		armR,
		armL: hug > 0 ? {s: 6 + hug * 14, e: 8 + hug * 100} : undefined,
		open: [100, 420, 640, 860].some((b) => f >= b && f < b + 6) ? 0.05 : 1,
	};
	const hand = handPos(rp, 1);
	const eye = eyePos(rp);
	const seedX = holding ? hand.x : PED.x;
	const seedY = holding ? hand.y : PED.top - 26;
	const seedGlow = kf(f, [0, 262, 290, 330], [0.45, 0.6, 1.6, 1]);
	const cam = {
		cx: kf(f, [0, 215, 290, 330, 470, 510, 680, 760, 900], [rx + 280, 940, 960, eye.x + 60, eye.x + 60, eye.x + 230, eye.x + 230, rx + 250, rx + 250]),
		cy: kf(f, [0, 215, 290, 330, 470, 510, 680, 760, 900], [600, 640, 660, eye.y + 60, eye.y + 60, eye.y + 30, eye.y + 30, 620, 600]),
		z: kf(f, [0, 215, 290, 330, 470, 510, 680, 760, 900], [1.05, 1.15, 1.3, 2.1, 2.1, 1.55, 1.55, 1.15, 1.05]),
	};
	const holoO = kf(f, [480, 495, 640, 655], [0, 1, 1, 0]);
	return (
		<Svg>
			<Sky pal={pal} frame={f} sun={{x: 300, y: 160, r: 60, color: '#fff6dc', glow: 1}} clouds={0.5} />
			<Cam cam={cam} f={f}>
				<PL cam={cam} k={0.2}>
					<City seed={21} baseY={880} color={mix(pal.haze, '#7c8b9a', 0.35)} windowColor={mix(pal.haze, '#7c8b9a', 0.5)} minH={260} maxH={520} gap={20} detail={false} />
					<Haze color={pal.haze} y0={560} y1={890} o={0.6} />
				</PL>
				<PL cam={cam} k={0.5}>
					<City seed={22} baseY={890} color="#a0a39f" windowColor="#7b807e" minH={180} maxH={380} gap={140} />
				</PL>
				<Ground y={880} color="#8e877b" line="#6f675d" />
				<Rubble x={-80} y={892} color="#6f675d" s={1.1} seed={5} />
				<Greenhouse front={false} />
				<defs>
					<clipPath id="above">
						<rect x={-2000} y={-2000} width={8000} height={2000 + GY} />
					</clipPath>
				</defs>
				<g clipPath="url(#above)">
					<LightRays x={PED.x + 60} y={GY - 560} o={kf(f, [0, 60], [0.6, 0.8])} frame={f} spread={0.45} color="#fff6d0" />
				</g>
				<Pedestal />
				<Robot {...rp} />
				<Seed x={seedX} y={seedY} s={holding ? 0.9 : 0.8} glow={seedGlow} frame={f} />
				<Motes frame={f} n={18} color="#e8ffd0" opacity={kf(f, [262, 300], [0.4, 0.9])} seed={31} area={[seedX - 120, seedY - 200, 240, 260]} />
				<Greenhouse front />
				<Hologram x={eye.x + 30} y={eye.y} tx={eye.x + 420} ty={eye.y - 40} w={400} h={290} o={holoO} f={f}>
					<TreeIcon f={f} />
				</Hologram>
			</Cam>
			<Dust frame={f} n={40} color="#fffbe8" opacity={0.35} wind={0.6} />
			{LOGS.s3.map((l) => (
				<LogLine key={l.at} f={f} {...l} x={110} y={110} />
			))}
			<Vignette amount={0.45} />
			<Fade o={kf(f, [0, 25], [1, 0])} color="#ffffff" />
			<Fade o={kf(f, [870, 900], [0, 1])} />
		</Svg>
	);
};
