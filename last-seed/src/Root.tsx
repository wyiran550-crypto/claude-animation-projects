import React from 'react';
import {CalculateMetadataFunction, Composition} from 'remotion';
import {Film, PARTS} from './Film';
import {FPS, SCENES, TOTAL} from './timing';

// Scenes are authored at 30fps; pass --props='{"fps":60}' to render at 60fps.
type Props = {fps: number};
const meta =
	(storyFrames: number): CalculateMetadataFunction<Props> =>
	({props}) => ({fps: props.fps, durationInFrames: Math.round((storyFrames * props.fps) / FPS)});

export const Root: React.FC = () => (
	<>
		<Composition id="Film" component={Film} defaultProps={{fps: FPS}} calculateMetadata={meta(TOTAL)} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
		{SCENES.filter((s) => PARTS[s.id]).map((s) => (
			<Composition key={s.id} id={s.id} component={PARTS[s.id]} defaultProps={{fps: FPS}} calculateMetadata={meta(s.dur)} durationInFrames={s.dur} fps={FPS} width={1920} height={1080} />
		))}
	</>
);
