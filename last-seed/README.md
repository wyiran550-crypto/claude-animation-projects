# 最后一颗种子 · The Last Seed

一部约 3 分钟的代码动画短片。画面全部用 React + SVG 绘制（Remotion 渲染），配乐和音效全部由 Python 合成，没有用到任何外部素材。

## 故事

城市荒废多年。一台小机器人每天醒来，独自清扫空无一人的街道。某天，它在破温室里发现了一颗还在发光的种子。为了给种子找到土壤、水和阳光，它穿过干涸的河床、走过漫长的夜晚，最后在暴风雨中把种子种进了自己的胸腔，自己耗尽电量停止运转。很多年以后，一棵开满花的树从它身上长了出来，阳光照下来，它的眼睛重新亮起。

| 场次 | 时长 | 内容 |
|---|---|---|
| S1 开场 | 16s | 黄昏的废城，片名 |
| S2 苏醒 | 26s | 开机、抖掉灰尘、扫街，发现远处的闪光 |
| S3 发现 | 30s | 温室、种子、全息投影“树·已灭绝” |
| S4 寻找 | 40s | 敲水泥地、日落的断桥、夜行、找到土壤 |
| S5 风暴 | 22s | 打开胸舱种下种子，电量耗尽 |
| S6 生长 | 34s | 发芽，日夜延时，长成大树，鸟儿落下，重新开机 |
| S7 结尾 | 18s | 城市变绿，结尾字幕 |

## 在 Mac 上渲染（推荐）

需要 Node.js 18 以上（`brew install node`）。配乐 `public/soundtrack.wav` 已经包含在仓库里，不需要装 Python。

```bash
cd last-seed
npm install

# 1. 先跑 10 秒基准测试（4K 60fps，全片最复杂的镜头），会打印整部片的预计渲染时间
node render.mjs --test

# 2. 渲染全片：4K 60fps，HEVC，按场景分段，可断点续渲
node render.mjs
#   成片：out/最后一颗种子-2160p60.mp4

# 只重渲某一场（例如改了 S3），会自动重新拼接
node render.mjs --only s3

# 1080p30 快速预览
node render.mjs --fps 30 --scale 1

# 实时预览、拖动时间轴
npx remotion studio src/index.ts
```

可选参数：`--codec h264|h265`（默认 h265）、`--bitrate 40M`、`--concurrency 6`（16GB 内存建议不超过 6）。
渲染时请插电源。中断后直接重新运行 `node render.mjs`，已完成的场景会跳过。

## 项目结构

```
src/
  timing.ts          分镜时间轴、日志字幕、音效时间点（画面和声音共用的唯一数据源，按 30fps 编写）
  lib.ts             插值、缓动、随机数、颜色混合、帧率无关的时间 useF()
  components/
    Robot.tsx        机器人角色（姿态、表情、走路、胸舱、青苔）
    Env.tsx          天空、城市、地面、道具、粒子、光线
    Plant.tsx        种子、生长的树、草、鸟、蝴蝶
    Hud.tsx          机器人日志、电量、标题、全息投影
    Stage.tsx        镜头、视差层、走路相位
  scenes/S1…S7.tsx   七个场景
  Film.tsx           串联场景并挂上音轨
render.mjs           分段渲染 + 拼接 + 合成音轨
audio/make_audio.py  合成配乐与音效 -> public/soundtrack.wav
```

## 重新合成音轨（改了 timing.ts 之后）

```bash
python3 -m venv .venv && .venv/bin/pip install numpy==2.1.3 scipy==1.14.1
node_modules/.bin/esbuild src/timing.ts --bundle --format=esm --platform=node --outfile=audio/timing.mjs
node -e "import('./audio/timing.mjs').then(m=>require('fs').writeFileSync('audio/timing.json',JSON.stringify(m)))"
.venv/bin/python audio/make_audio.py
```

## 接入配音

`src/timing.ts` 里的 `LOGS` 就是全片的台词表。接入配音 API 时，按每条台词生成音频，放进 `public/`，再在对应场景里用 `<Audio>` 按 `at` 帧放置即可。
