// One-command film render: per-scene segments (resumable), hardware encoding, concat + soundtrack.
//
//   node render.mjs                 4K 60fps, whole film
//   node render.mjs --test          10s benchmark of the heaviest shot, prints a full-film estimate
//   node render.mjs --only s3       re-render a single scene, then re-assemble
//   node render.mjs --fps 30 --scale 1   1080p30 preview
//
// Other flags: --codec h264|h265 (default h265), --bitrate 40M, --concurrency N
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);

const fps = Number(opt('fps', 60));
const scale = Number(opt('scale', 2));
const codec = opt('codec', 'h265');
const concurrency = Number(opt('concurrency', Math.max(1, Math.min(os.cpus().length - 2, scale >= 2 ? 6 : 8))));
const bitrate = opt('bitrate', scale >= 2 ? (codec === 'h265' ? '40M' : '60M') : '12M');
const only = opt('only', null);
const test = flag('test');

const timing = JSON.parse(fs.readFileSync('audio/timing.json', 'utf8'));
const tag = `${1080 * scale}p${fps}`;
const partsDir = path.join('out', `parts-${tag}`);
fs.mkdirSync(partsDir, {recursive: true});

const browserExecutable = process.env.REMOTION_BROWSER || undefined;
console.log(`Bundling…  (${tag}, ${codec}, ${bitrate}, concurrency ${concurrency})`);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const inputProps = {fps};
const composition = await selectComposition({serveUrl, id: 'Film', inputProps, browserExecutable});
const k = fps / timing.FPS;

const render = async (from, to, output) => {
	const t0 = Date.now();
	let last = -1;
	await renderMedia({
		serveUrl,
		composition,
		inputProps,
		codec,
		outputLocation: output,
		frameRange: [from, to],
		scale,
		muted: true,
		concurrency,
		videoBitrate: bitrate,
		hardwareAcceleration: 'if-possible',
		browserExecutable,
		onProgress: ({progress}) => {
			const p = Math.floor(progress * 100);
			if (p !== last && p % 5 === 0) {
				last = p;
				process.stdout.write(`\r  ${path.basename(output)}  ${p}%   `);
			}
		},
	});
	const sec = (Date.now() - t0) / 1000;
	const frames = to - from + 1;
	console.log(`\r  ${path.basename(output)}  done: ${frames} frames in ${sec.toFixed(0)}s (${(frames / sec).toFixed(1)} fps)`);
	return frames / sec;
};

if (test) {
	// 10 seconds of the time-lapse in S6: the busiest shot in the film.
	const from = Math.round((timing.START.s6 + 320) * k);
	const to = from + fps * 10 - 1;
	const speed = await render(from, to, path.join('out', `test-${tag}.mp4`));
	const total = composition.durationInFrames;
	const min = total / speed / 60;
	console.log(`\nFull film: ${total} frames → about ${min.toFixed(0)} min at this speed (lighter scenes render faster).`);
	console.log(`Test clip: out/test-${tag}.mp4`);
	process.exit(0);
}

const segs = [];
for (const s of timing.SCENES) {
	const from = Math.round(timing.START[s.id] * k);
	const to = Math.round((timing.START[s.id] + s.dur) * k) - 1;
	segs.push({id: s.id, from, to, file: path.join(partsDir, `${s.id}.mp4`)});
}

const t0 = Date.now();
for (const s of segs) {
	const done = `${s.file}.done`;
	if (only ? s.id !== only : fs.existsSync(done)) {
		if (!only) console.log(`  ${s.id}.mp4  already rendered, skipping`);
		continue;
	}
	fs.rmSync(done, {force: true});
	await render(s.from, s.to, s.file);
	fs.writeFileSync(done, '');
}

const missing = segs.filter((s) => !fs.existsSync(`${s.file}.done`));
if (missing.length) {
	console.log(`Not assembling yet; missing: ${missing.map((s) => s.id).join(', ')}`);
	process.exit(0);
}

console.log('Assembling…');
const list = path.join(partsDir, 'list.txt');
fs.writeFileSync(list, segs.map((s) => `file '${path.resolve(s.file)}'`).join('\n'));
const final = path.join('out', `最后一颗种子-${tag}.mp4`);
const ffmpeg = (a) => execFileSync('npx', ['remotion', 'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', ...a], {stdio: 'inherit'});
ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-i', 'public/soundtrack.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', ...(codec === 'h265' ? ['-tag:v', 'hvc1'] : []), final]);
console.log(`\nDone in ${((Date.now() - t0) / 60000).toFixed(1)} min → ${final}`);
