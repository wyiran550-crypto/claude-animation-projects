import React from 'react';
import {Audio, Series, staticFile, useVideoConfig} from 'remotion';
import {S1} from './scenes/S1';
import {S2} from './scenes/S2';
import {S3} from './scenes/S3';
import {S4} from './scenes/S4';
import {S5} from './scenes/S5';
import {S6} from './scenes/S6';
import {S7} from './scenes/S7';
import {FPS, SCENES} from './timing';

export const PARTS: Record<string, React.FC<{fps: number}>> = {s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6, s7: S7};

export const Film: React.FC<{fps: number}> = () => {
	const {fps} = useVideoConfig();
	return (
		<>
			<Audio src={staticFile('soundtrack.wav')} />
			<Series>
				{SCENES.map((s) => {
					const C = PARTS[s.id];
					return (
						<Series.Sequence key={s.id} durationInFrames={Math.round((s.dur * fps) / FPS)}>
							<C fps={fps} />
						</Series.Sequence>
					);
				})}
			</Series>
		</>
	);
};
