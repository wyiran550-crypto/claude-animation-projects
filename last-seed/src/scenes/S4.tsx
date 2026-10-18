import React from 'react';
import {City, Dust, Ground, Haze, Lamp, PAL, Rubble, Sign, Sky, Vignette, Fade, Car} from '../components/Env';
import {Battery, LogLine} from '../components/Hud';
import {Seed} from '../components/Plant';
import {Robot, RobotProps, Mood, eyePos} from '../components/Robot';
import {Cam, PL, Svg, walkAt, stepPx} from '../components/Stage';
import {backOut, clamp, kf, mix, mixPalette, rng, useF} from '../lib';
import {LOGS, WALKS} from '../timing';

const seedInHand = (f: number) => <Seed x={0} y={0} s={0.75} glow={0.7} frame={f} />;

// ---------------------------------------------------------------- 4a: concrete
const Concrete: React.FC<{f: number}> = ({f}) => {
	const pal = PAL.noon;
	const S = 1.6;
	const {phase, walked} = walkAt(f, WALKS.s4);
	const rx = 760 + walked * stepPx(S);
	const knocks = [55, 72, 89];
	let raise = 0;
	for (const k of knocks) {
		const t = f - (k - 10);
		if (t >= 0 && t < 12) raise = t < 10 ? Math.sin((t / 10) * Math.PI * 0.5) : 0;
	}
	const kneeling = kf(f, [10, 40, 185, 205], [0, 1, 1, 0], backOut);
	const sad = f > 140 && f < 200;
	const rp: RobotProps = {
		x: rx,
		y: 880,
		scale: S,
		walk: phase,
		crouch: kneeling,
		mood: sad ? 'sad' : 'neutral',
		look: [kf(f, [10, 40, 185, 205], [0.3, 0.9, 0.9, 0.4]), kf(f, [10, 40, 120, 140, 185, 205], [0, 1, 1, 0.6, 0.6, 0])],
		headTilt: kf(f, [10, 40, 185, 205], [0, 10, 10, 0]),
		armR: f < 200 ? {s: 6 + kneeling * (24 + raise * 60), e: 8 + raise * 40} : undefined,
		armL: {s: 14, e: 70},
		holdL: seedInHand(f),
	};
	const shake = knocks.some((k) => f >= k && f < k + 5) ? 4 : 0;
	const cam = {cx: Math.max(960, rx + 120), cy: 640, z: 1.3, shake};
	const crackX = 1010;
	return (
		<>
			<Sky pal={pal} frame={f} sun={{x: 1500, y: 150, r: 55, color: '#fff6dc'}} clouds={0.5} />
			<Cam cam={cam} f={f}>
				<PL cam={cam} k={0.25}>
					<City seed={31} baseY={880} color={mix(pal.haze, '#7c8b9a', 0.35)} windowColor={mix(pal.haze, '#7c8b9a', 0.5)} minH={260} maxH={520} gap={20} detail={false} />
					<Haze color={pal.haze} y0={600} y1={890} o={0.55} />
				</PL>
				<PL cam={cam} k={0.55}>
					<City seed={32} baseY={890} color="#9e9a93" windowColor="#78746e" minH={180} maxH={380} gap={120} />
				</PL>
				<Ground y={880} color="#8a8377" line="#6f675d" />
				<path d={`M ${crackX - 90} 884 l 30 14 l 20 -6 l 26 18 l 30 -10 l 24 12 l 30 -4`} stroke="#4f4840" strokeWidth={5} fill="none" />
				<Car x={260} y={905} color="#7a6f66" dark="#4f4741" s={1} flip />
				<Robot {...rp} />
				{knocks.map((k) => {
					const t = f - k;
					if (t < 0 || t > 20) return null;
					return (
						<g key={k} opacity={1 - t / 20} fill="#d8cdb6">
							<circle cx={crackX - 30 - t * 2} cy={878 - t} r={6 + t} />
							<circle cx={crackX + 10 + t * 2} cy={878 - t * 0.7} r={5 + t * 0.8} />
						</g>
					);
				})}
			</Cam>
			<Dust frame={f} n={40} color="#fffbe8" opacity={0.35} wind={0.8} />
		</>
	);
};

// ---------------------------------------------------------------- 4b: dry river at sunset
const River: React.FC<{f: number}> = ({f}) => {
	const pal = PAL.sunset;
	const S = 0.75;
	const {phase, walked} = walkAt(f, WALKS.s4);
	const w0 = 100 * stepPx(1.6); // distance walked in 4a
	const rx = 380 + (walked - 100) * stepPx(S);
	const deckY = 640;
	const cam = {cx: kf(f, [300, 600], [900, 1250]), cy: 560, z: 1};
	void w0;
	const r = rng(77);
	const cracks = Array.from({length: 40}, () => ({x: r() * 3000 - 400, y: 820 + r() * 240, w: 40 + r() * 140}));
	return (
		<>
			<Sky pal={pal} frame={f} sun={{x: 1050, y: kf(f, [300, 600], [560, 640]), r: 150, color: '#ffd28a', glow: 1.2}} clouds={0.4} cloudColor="#ef9a7a" />
			<Cam cam={cam} f={f}>
				<PL cam={cam} k={0.15}>
					<City seed={41} baseY={760} color={mix(pal.haze, pal.top, 0.45)} windowColor={mix(pal.haze, pal.top, 0.55)} minH={160} maxH={380} gap={30} detail={false} />
					<Haze color={pal.haze} y0={520} y1={770} o={0.65} />
				</PL>
				{/* riverbanks and bed */}
				<path d="M -1000 760 L 3500 760 L 3500 1400 L -1000 1400 Z" fill="#7a4a48" />
				<path d="M -1000 760 Q 200 800 400 900 Q 900 1000 1600 980 Q 2200 960 2600 860 Q 3000 790 3500 770 L 3500 1400 L -1000 1400 Z" fill="#9b5f50" />
				{cracks.map((c, i) => (
					<path key={i} d={`M ${c.x} ${c.y} l ${c.w * 0.3} 10 l ${c.w * 0.3} -8 l ${c.w * 0.4} 6`} stroke="#6d3e3a" strokeWidth={3} fill="none" opacity={0.7} />
				))}
				<path d="M 700 1010 q 30 -6 60 0 M 1900 960 q 40 -8 80 0" stroke="#6d3e3a" strokeWidth={4} fill="none" />
				{/* bridge */}
				<g fill="#3a2433">
					<rect x={-600} y={deckY} width={2260} height={26} />
					<path d={`M 1660 ${deckY} l 30 0 l -14 26 l -16 0 Z`} />
					<rect x={1760} y={deckY + 8} width={1700} height={26} transform={`rotate(4 1760 ${deckY})`} />
					{[-200, 300, 800, 1300, 2100, 2600].map((x) => (
						<g key={x}>
							<rect x={x} y={deckY + 20} width={46} height={420} />
							<path d={`M ${x - 120} ${deckY + 26} Q ${x + 23} ${deckY + 170} ${x + 166} ${deckY + 26}`} stroke="#3a2433" strokeWidth={14} fill="none" />
						</g>
					))}
					{Array.from({length: 44}, (_, i) => (
						<rect key={i} x={-600 + i * 52} y={deckY - 40} width={5} height={40} opacity={i % 7 === 3 ? 0 : 1} />
					))}
					<rect x={-600} y={deckY - 44} width={2260} height={6} />
				</g>
				<Robot x={rx} y={deckY} scale={S} walk={phase} tint="#2a1828" tintAmt={0.78} glow={1} armL={{s: 14, e: 70}} holdL={seedInHand(f)} />
			</Cam>
			<Dust frame={f} n={50} color="#ffd9b0" opacity={0.35} wind={1.4} />
		</>
	);
};

// ---------------------------------------------------------------- 4c: night walk
const NightWalk: React.FC<{f: number}> = ({f}) => {
	const pal = mixPalette([PAL.sunset, PAL.night], kf(f, [600, 660], [0, 1]));
	const S = 1.3;
	const {phase, walked} = walkAt(f, WALKS.s4);
	const rx = 400 + (walked - 400) * stepPx(S);
	const cam = {cx: rx + 220, cy: 600, z: 1.1};
	const rp: RobotProps = {x: rx, y: 880, scale: S, walk: phase, tint: '#16204a', tintAmt: 0.5, armL: {s: 14, e: 70}, holdL: seedInHand(f), look: [1, 0.1]};
	const eye = eyePos(rp);
	const n = clamp((f - 600) / 60);
	return (
		<>
			<Sky pal={pal} frame={f} stars={n} moon={{x: 1500, y: 200, r: 50, o: n}} />
			<Cam cam={cam} f={f}>
				<PL cam={cam} k={0.2}>
					<City seed={51} baseY={880} color={mix(pal.bottom, pal.top, 0.2)} windowColor={mix(pal.bottom, pal.top, 0.4)} minH={260} maxH={560} gap={20} detail={false} from={-1200} to={9000} />
				</PL>
				<PL cam={cam} k={0.5}>
					<City seed={52} baseY={890} color={mix('#1d2147', pal.top, 0.2)} windowColor="#141838" minH={200} maxH={440} gap={70} from={-1200} to={9000} />
				</PL>
				<Ground y={880} color="#1b1f3a" line="#2a2f55" to={12000} />
				{[700, 1400, 2300, 3000].map((x, i) => (
					<Lamp key={x} x={x} y={884} color="#0f1230" bent={i % 2 ? 0.5 : 0} />
				))}
				<Rubble x={1900} y={892} color="#141836" s={1} seed={61} />
				<Car x={2700} y={905} color="#1a1e3c" dark="#0c0e22" />
				{/* eye flashlight */}
				<polygon points={`${eye.x + 40},${eye.y} ${eye.x + 900},${eye.y + 360} ${eye.x + 900},${eye.y - 120}`} fill="#9ff6ff" opacity={0.08 * n} />
				<ellipse cx={eye.x + 620} cy={884} rx={160} ry={14} fill="#9ff6ff" opacity={0.08 * n} />
				<Robot {...rp} />
			</Cam>
			<Battery level={kf(f, [620, 880], [0.36, 0.23])} x={1730} y={60} o={kf(f, [620, 640, 870, 890], [0, 1, 1, 0])} f={f} />
		</>
	);
};

// ---------------------------------------------------------------- 4d: the old park, storm coming
export const Park: React.FC<{f: number; storm: number; pal: typeof PAL.night; green?: number; children?: React.ReactNode; soil?: number; day?: number}> = ({
	storm,
	pal,
	green = 0,
	children,
	soil = 1,
	day = 0,
}) => {
	const dead = mix('#2c2a3a', '#4a7a3c', green);
	const midC = mix(mix('#24263f', '#8e9fa8', day), pal.top, 0.2);
	const groundC = mix(mix('#22243a', '#7a756a', day), '#5a8f45', green);
	const lineC = mix(mix('#30324d', '#5e5a50', day), '#4f8a3e', green);
	const farC = day > 0 ? mix(mix(pal.bottom, pal.top, 0.25), mix(pal.haze, pal.top, 0.4), day) : mix(pal.bottom, pal.top, 0.25);
	return (
		<g>
			<PL cam={{cx: 960, cy: 540, z: 1}} k={1}>
				<City seed={71} baseY={880} color={farC} windowColor={mix(farC, pal.top, 0.3)} minH={240} maxH={540} gap={20} detail={false} green={green * 0.8} />
			</PL>
			<Haze color={pal.haze} y0={600} y1={890} o={0.45 + storm * 0.2} />
			<City seed={72} baseY={890} color={midC} windowColor={mix(midC, '#000000', 0.3)} minH={160} maxH={360} gap={160} green={green} />
			<Ground y={880} color={groundC} line={lineC} cracks={green < 0.5} />
			{/* broken fence */}
			<g stroke={mix('#15172b', '#3a4a30', green)} strokeWidth={7}>
				<line x1={-200} y1={810} x2={420} y2={810} />
				<line x1={1380} y1={810} x2={2400} y2={818} />
				{[-160, -60, 40, 140, 240, 340, 1420, 1520, 1620, 1720, 1820, 1920, 2020].map((x, i) => (
					<line key={x} x1={x} y1={880} x2={x + (i % 4 === 1 ? 14 : 0)} y2={i % 5 === 2 ? 820 : 780} />
				))}
			</g>
			<Sign x={520} y={884} color={mix('#15172b', '#3a4a30', green)} text="中央公园" tilt={-4} />
			{/* dead stumps */}
			{[200, 1650].map((x, i) => (
				<g key={x} fill={dead}>
					<path d={`M ${x - 26} 880 L ${x - 18} ${780 - i * 30} L ${x + 18} ${790 - i * 30} L ${x + 26} 880 Z`} />
					<path d={`M ${x} ${800 - i * 30} l -30 -50 M ${x + 6} ${820 - i * 30} l 26 -40`} stroke={dead} strokeWidth={8} />
				</g>
			))}
			{/* exposed soil patch */}
			<g opacity={soil}>
				<path d="M 860 884 Q 960 870 1080 884 L 1070 900 Q 960 912 870 900 Z" fill="#4a2f1f" />
				<path d="M 850 884 l -16 -8 l 10 -4 Z M 1080 882 l 18 -6 l -4 10 Z" fill="#3a3d55" />
			</g>
			{children}
		</g>
	);
};

const FoundSoil: React.FC<{f: number}> = ({f}) => {
	const storm = kf(f, [1060, 1200], [0, 1]);
	const pal = mixPalette([PAL.night, PAL.storm], storm);
	const S = 1.5;
	const {phase, walked} = walkAt(f, WALKS.s4);
	const rx = 480 + (walked - 700) * stepPx(S);
	const kneel = kf(f, [1020, 1035], [0, 0.85], backOut);
	const dig = (t: number) => Math.max(0, Math.sin(((t - 1030) / 30) * Math.PI * 2));
	const digging = f >= 1030 && f < 1100;
	const mood: Mood = f >= 985 && f < 1005 ? 'surprised' : f >= 1005 && f < 1110 ? 'happy' : f >= 1110 ? 'neutral' : 'neutral';
	const rp: RobotProps = {
		x: rx,
		y: 880,
		scale: S,
		walk: phase,
		crouch: kneel,
		mood,
		tint: '#16204a',
		tintAmt: 0.5 - storm * 0.1,
		look: [kf(f, [985, 1000, 1110, 1130], [0.4, 0.9, 0.9, 0.3]), kf(f, [985, 1000, 1110, 1130], [0, 1, 1, -0.6])],
		headTilt: kf(f, [1110, 1130], [0, -6]),
		armR: digging ? {s: 40 + dig(f) * 40, e: 20 + dig(f) * 30} : kneel > 0.1 ? {s: 30, e: 20} : undefined,
		armL: {s: 14, e: 70},
		holdL: seedInHand(f),
		lean: storm * -4 + Math.sin(f * 0.2) * storm * 1.5,
	};
	const cam = {cx: 920, cy: kf(f, [900, 1030], [600, 650]), z: kf(f, [900, 1030, 1200], [1.0, 1.25, 1.15]), shake: f >= 1185 && f < 1195 ? 6 : storm * 1.2};
	const r = rng(4);
	const clods = Array.from({length: 10}, () => ({vx: (r() - 0.3) * 6, vy: -6 - r() * 6}));
	const flash = kf(f, [1183, 1186, 1192, 1200], [0, 0.9, 0.2, 0]);
	return (
		<>
			<Sky pal={pal} frame={f} stars={1 - storm} moon={{x: 1500, y: 200, r: 50, o: 1 - storm * 1.2}} clouds={storm} cloudColor="#2b2f3a" />
			<Cam cam={cam} f={f}>
				<Park f={f} storm={storm} pal={pal}>
					{digging
						? [1040, 1070].map((d) =>
								f >= d && f < d + 30
									? clods.map((c, i) => {
											const t = f - d;
											return <circle key={`${d}${i}`} cx={1000 + c.vx * t} cy={882 + c.vy * t + 0.5 * t * t} r={5} fill="#4a2f1f" />;
										})
									: null,
							)
						: null}
					<Robot {...rp} />
				</Park>
			</Cam>
			<Dust frame={f} n={90} color="#c8c3d8" opacity={0.25 + storm * 0.35} wind={1 + storm * 6} />
			<Fade o={flash} color="#eef2ff" />
		</>
	);
};

// Search montage: hard ground, a dry river, a long night, and finally soil.
export const S4: React.FC = () => {
	const f = useF();
	let body: React.ReactNode;
	if (f < 300) body = <Concrete f={f} />;
	else if (f < 600) body = <River f={f} />;
	else if (f < 900) body = <NightWalk f={f} />;
	else body = <FoundSoil f={f} />;
	const dip = (c: number) => kf(f, [c - 12, c, c + 12], [0, 1, 0], (t) => t);
	return (
		<Svg>
			{body}
			{LOGS.s4.map((l) => (
				<LogLine key={l.at} f={f} {...l} x={110} y={110} />
			))}
			<Vignette amount={f >= 600 ? 0.65 : 0.45} />
			<Fade o={Math.max(kf(f, [0, 20], [1, 0]), dip(300), dip(600), dip(900))} />
		</Svg>
	);
};
