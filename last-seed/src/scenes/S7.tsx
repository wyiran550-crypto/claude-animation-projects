import React from 'react';
import {PAL, Sky, Vignette, Fade, LightRays, Motes} from '../components/Env';
import {Title} from '../components/Hud';
import {Bird, Butterfly, Grass, Tree} from '../components/Plant';
import {Robot, RobotProps, robotChest} from '../components/Robot';
import {Cam, Svg} from '../components/Stage';
import {clamp, kf, useF} from '../lib';
import {Park} from './S4';
import {ROBOT_X, TREE_SCALE, restingRobot, useGrass} from './S6';

// Ending: the camera rises over a city turning green; title and credits.
export const S7: React.FC = () => {
	const f = useF();
	const grass = useGrass();
	const pal = PAL.green;
	const wave = f >= 110 && f < 210 ? Math.sin(((f - 110) / 100) * Math.PI) : 0;
	const rp: RobotProps = {
		...restingRobot(f, 1),
		glow: 1,
		antenna: 1,
		moss: 1,
		mood: 'happy',
		look: [kf(f, [80, 120, 220, 260], [-0.3, 0.6, 0.6, 0]), kf(f, [80, 120, 220, 260], [-1, -1, -1, -0.5])],
		headTilt: kf(f, [80, 130], [-4, 6]),
		armR: {s: 6 + wave * 130, e: 6 + wave * 30 + Math.sin(f * 0.5) * 12 * wave},
	};
	const chest = robotChest(rp);
	// the bird hops off the head and circles away
	const bt = clamp((f - 90) / 260);
	const bird = f < 90 ? {x: ROBOT_X - 38, y: 468, flap: false} : {x: ROBOT_X - 38 + Math.sin(bt * 5) * 260 * bt + bt * 900, y: 468 - bt * 520 - Math.sin(bt * 9) * 40, flap: true};
	const flock = [0, 1, 2, 3, 4].map((i) => {
		const t = f - 140 - i * 14;
		return {x: -300 + t * 6 + i * 60, y: 260 - t * 0.6 + (i % 2) * 40 + Math.sin(t * 0.08 + i) * 12};
	});
	const cam = {
		cx: kf(f, [0, 360], [860, 980]),
		cy: kf(f, [0, 360], [590, 380]),
		z: kf(f, [0, 360], [1.4, 0.62]),
	};
	return (
		<Svg>
			<Sky pal={pal} frame={f} sun={{x: 380, y: 170, r: 60, color: '#fff6d8', glow: 1.2}} clouds={0.6} />
			<Cam cam={cam} f={f}>
				<Park f={f} storm={0} pal={pal} green={1} soil={0.3} day={1}>
					{grass.map((gr, i) => (
						<Grass key={i} x={gr.x} y={gr.y} s={gr.s} frame={f} color={i % 3 ? '#5fa64a' : '#4f9440'} flower={gr.fl} />
					))}
					<g transform={`translate(${chest.x + 6} ${chest.y - 20}) scale(${TREE_SCALE})`}>
						<Tree g={0.92} bloom={1} frame={f} sway={0.6} bend={44} />
					</g>
					<Robot {...rp} />
					<g transform={`translate(${chest.x + 4} ${chest.y - 14}) scale(1.1)`}>
						<Tree g={0.17} frame={f} sway={1} />
					</g>
					<Bird x={bird.x} y={bird.y} s={1.4} frame={f} flap={bird.flap} facing={1} />
					{[
						[300, 760, '#ffb347'],
						[1300, 700, '#9fd0ff'],
						[1600, 800, '#ffd1e8'],
						[0, 820, '#fff1a8'],
					].map(([x, y, c], i) => (
						<Butterfly key={i} x={(x as number) + Math.sin(f * 0.03 + i) * 120} y={(y as number) + Math.sin(f * 0.07 + i * 2) * 50} frame={f + i * 7} color={c as string} s={1.3} />
					))}
				</Park>
				<LightRays x={200} y={-300} o={0.45} frame={f} spread={0.7} color="#fff6c8" />
			</Cam>
			{flock.map((b, i) => (f > 140 + i * 14 ? <Bird key={i} x={b.x} y={b.y} s={0.5} frame={f + i * 5} facing={1} color="#3d5a7a" /> : null))}
			<Motes frame={f} n={40} color="#fffbd0" opacity={0.7} seed={6} />
			<Vignette amount={0.4} />
			<g>
				<rect x={0} y={0} width={1920} height={1080} fill="#000" opacity={kf(f, [220, 280, 400, 430], [0, 0.25, 0.25, 0])} />
				<Title text="有些等待，会开出花来。" o={kf(f, [230, 280, 390, 430], [0, 1, 1, 0])} y={560} size={72} spread={kf(f, [230, 430], [0, 0.5])} />
			</g>
			<Fade o={kf(f, [420, 460], [0, 1])} />
			<Title text="最后一颗种子" sub="全片由代码绘制 · 音乐与音效由代码合成" o={kf(f, [455, 475, 520, 540], [0, 1, 1, 1])} y={520} size={84} />
		</Svg>
	);
};
