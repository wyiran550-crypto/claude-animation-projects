import React from 'react';
import {Car, City, Dust, Ground, Haze, Lamp, PAL, Rubble, Sign, Sky, Vignette, Fade} from '../components/Env';
import {Title} from '../components/Hud';
import {Cam, PL, Svg} from '../components/Stage';
import {kf, mix, useF} from '../lib';

// Opening: a slow pan across the abandoned city at dusk, title card.
export const S1: React.FC = () => {
	const f = useF();
	const pal = PAL.dusk;
	const cam = {cx: kf(f, [0, 480], [900, 2100]), cy: kf(f, [0, 480], [520, 580]), z: kf(f, [0, 480], [1, 1.12])};
	const far = mix(pal.haze, pal.top, 0.42);
	const mid = mix('#6a5068', pal.top, 0.15);
	const near = '#3f3247';
	const ground = '#2f2636';
	return (
		<Svg>
			<Sky pal={pal} frame={f} sun={{x: 1250, y: kf(f, [0, 480], [470, 540]), r: 70, color: '#ffd9a0', glow: 1.1}} clouds={0.35} cloudColor="#e79a86" />
			<Cam cam={cam} f={f}>
				<PL cam={cam} k={0.15}>
					<City seed={1} baseY={860} color={far} windowColor={mix(far, '#000000', 0.12)} minH={260} maxH={560} gap={10} detail={false} />
				</PL>
				<PL cam={cam} k={0.15}>
					<Haze color={pal.haze} y0={500} y1={870} o={0.55} />
				</PL>
				<PL cam={cam} k={0.4}>
					<City seed={2} baseY={880} color={mid} windowColor={mix(mid, '#000000', 0.25)} minH={200} maxH={460} gap={60} />
				</PL>
				<PL cam={cam} k={0.4}>
					<Haze color={pal.haze} y0={700} y1={890} o={0.35} />
				</PL>
				<PL cam={cam} k={0.7}>
					<City seed={3} baseY={900} color={near} windowColor={mix(near, '#000000', 0.3)} minH={140} maxH={360} gap={260} />
				</PL>
				<Ground y={880} color={ground} line="#4a3d4c" />
				<Lamp x={1150} y={884} color="#251d2b" bent={0.6} />
				<Car x={1550} y={900} color="#3a2d40" dark="#1d1622" />
				<Rubble x={2050} y={892} color="#2a2130" s={1.2} seed={4} />
				<Sign x={2500} y={890} color="#251d2b" text="中央公园 →" tilt={-8} />
				<Lamp x={2850} y={884} color="#251d2b" />
			</Cam>
			<Dust frame={f} n={60} color="#ffe3c0" opacity={0.45} wind={1.2} />
			<Title text="最后一颗种子" sub="THE LAST SEED" o={kf(f, [70, 130, 330, 390], [0, 1, 1, 0])} y={470} spread={kf(f, [70, 390], [0, 1])} />
			<Vignette amount={0.5} />
			<Fade o={kf(f, [0, 40], [1, 0])} />
			<Fade o={kf(f, [455, 480], [0, 1])} />
		</Svg>
	);
};
