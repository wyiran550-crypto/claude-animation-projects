"""Synthesizes the full soundtrack (score + sound effects) for the film.

Reads audio/timing.json (a dump of src/timing.ts) so every cue lands on the
same frame as the picture. Writes public/soundtrack.wav (48 kHz stereo).
"""

import json
import math
import os
import sys

import numpy as np
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, "timing.json")))
FPS = T["FPS"]
DUR = T["TOTAL"] / FPS
N = int(DUR * SR) + SR
START = {k: v / FPS for k, v in T["START"].items()}
rng = np.random.default_rng(7)


def sec(scene, frame):
    return START[scene] + frame / FPS


def tvec(d):
    return np.arange(int(d * SR)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


NOTE = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def n2m(name):
    p, o = (name[:-1], int(name[-1]))
    return 12 * (o + 1) + NOTE[p]


class Bus:
    def __init__(self):
        self.b = np.zeros((2, N), dtype=np.float32)

    def add(self, t0, sig, gain=1.0, pan=0.0):
        i = int(t0 * SR)
        if i >= N or len(sig) == 0:
            return
        if i < 0:
            sig = sig[-i:]
            i = 0
        sig = sig[: N - i]
        l = math.cos((pan + 1) * math.pi / 4) * math.sqrt(2)
        r = math.sin((pan + 1) * math.pi / 4) * math.sqrt(2)
        self.b[0, i : i + len(sig)] += sig * gain * l
        self.b[1, i : i + len(sig)] += sig * gain * r


def env_adsr(n, a, d, s, r, sustain_len):
    """Piecewise ADSR envelope of length n samples."""
    e = np.zeros(n, dtype=np.float32)
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    S = max(0, int(sustain_len * SR) - A - D)
    idx = 0
    seg = [np.linspace(0, 1, A, endpoint=False), np.linspace(1, s, D, endpoint=False), np.full(S, s), np.linspace(s, 0, R)]
    for x in seg:
        k = min(len(x), n - idx)
        e[idx : idx + k] = x[:k]
        idx += k
        if idx >= n:
            break
    return e


def lowpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "low")
    return signal.lfilter(b, a, x).astype(np.float32)


def highpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(b, a, x).astype(np.float32)


def bandpass(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    return signal.lfilter(b, a, x).astype(np.float32)


def noise(d):
    return rng.standard_normal(int(d * SR)).astype(np.float32)


def brown(d):
    x = np.cumsum(noise(d))
    x = highpass(x, 20)
    return x / (np.abs(x).max() + 1e-9)


# ---------------------------------------------------------------- instruments


def music_box(f, d=2.5, v=1.0):
    t = tvec(d)
    parts = [(1, 1.0, 2.6), (2.0, 0.28, 4.0), (3.0, 0.1, 6.0), (5.4, 0.06, 9.0)]
    y = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * dk) for k, a, dk in parts)
    y *= np.minimum(1, t / 0.003)
    return (y * v * 0.5).astype(np.float32)


def piano(f, d=3.0, v=1.0):
    t = tvec(d)
    y = np.zeros_like(t)
    for k in range(1, 8):
        inh = k * math.sqrt(1 + 0.0004 * k * k)
        y += (1 / k**1.4) * np.sin(2 * np.pi * f * inh * t + k) * np.exp(-t * (1.1 + 0.9 * k) * (f / 400) ** 0.3)
    y *= np.minimum(1, t / 0.004)
    y *= np.minimum(1, (d - t) / 0.2)
    return (y * v * 0.35).astype(np.float32)


def pluck(f, d=1.0, v=1.0):
    t = tvec(d)
    y = np.zeros_like(t)
    for k in range(1, 6):
        y += (1 / k**1.2) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (5 + 3 * k))
    y *= np.minimum(1, t / 0.002)
    return (y * v * 0.35).astype(np.float32)


def pad_voice(f, d, v=1.0, bright=6, attack=1.4, release=1.6, vib=0.0):
    t = tvec(d + release)
    y = np.zeros_like(t)
    for det in (-0.12, 0.0, 0.12):
        ff = f * 2 ** (det / 12)
        ph = 2 * np.pi * ff * t + (vib * np.sin(2 * np.pi * 5.2 * t) if vib else 0)
        for k in range(1, bright + 1):
            y += (1 / k) * np.sin(k * ph + det * 10)
    e = env_adsr(len(t), attack, 0.3, 0.85, release, d)
    return (y * e * v * 0.06).astype(np.float32)


def bass(f, d, v=1.0):
    t = tvec(d + 0.4)
    y = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    e = env_adsr(len(t), 0.02, 0.4, 0.6, 0.4, d)
    return (y * e * v * 0.25).astype(np.float32)


def chord_notes(name, octave=3):
    roots = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    shapes = {
        "": [0, 4, 7],
        "m": [0, 3, 7],
        "maj7": [0, 4, 7, 11],
        "m7": [0, 3, 7, 10],
        "sus2": [0, 2, 7],
        "add9": [0, 4, 7, 14],
    }
    root = name[0]
    q = name[1:]
    base = 12 * (octave + 1) + roots[root]
    return [base + i for i in shapes[q]]


# ---------------------------------------------------------------- score

pads = Bus()
keys = Bus()  # music box / piano / plucks
strings = Bus()
low = Bus()
perc = Bus()

BEAT = 60 / 72
BAR = BEAT * 4

THEME_MINOR = [
    [("A4", 1), ("C5", 1), ("E5", 2)],
    [("D5", 1), ("C5", 1), ("B4", 2)],
    [("A4", 1), ("C5", 1), ("E5", 1), ("A5", 1)],
    [("G5", 2), ("F5", 1), ("E5", 1)],
    [("D5", 1), ("E5", 1), ("G5", 2)],
    [("E5", 1), ("D5", 1), ("C5", 2)],
    [("D5", 1), ("C5", 1), ("A4", 2)],
    [("B4", 3), ("E4", 1)],
]
THEME_MAJOR = [
    [("C5", 1), ("E5", 1), ("G5", 2)],
    [("F5", 1), ("E5", 1), ("D5", 2)],
    [("C5", 1), ("E5", 1), ("A5", 1), ("G5", 1)],
    [("F5", 2), ("E5", 1), ("D5", 1)],
    [("E5", 1), ("G5", 1), ("C6", 2)],
    [("B5", 1), ("A5", 1), ("G5", 2)],
    [("A5", 1), ("F5", 1), ("D5", 1), ("F5", 1)],
    [("E5", 4)],
]


def play_theme(bus, t0, theme, bars, inst, v=1.0, beat=BEAT, pan=0.15, octave_shift=0):
    t = t0
    for b in bars:
        for name, dur in theme[b]:
            m = n2m(name) + 12 * octave_shift
            d = max(1.5, dur * beat * 1.6)
            bus.add(t, inst(mtof(m), d, v), pan=pan)
            t += dur * beat
    return t


def play_pads(t0, chords, length, v=1.0, octave=3, bright=6, with_bass=True, vib=0.0, bus=None):
    bus = bus or pads
    t = t0
    for c in chords:
        for m in chord_notes(c, octave):
            bus.add(t, pad_voice(mtof(m), length, v, bright=bright, vib=vib), pan=rng.uniform(-0.4, 0.4))
        if with_bass:
            low.add(t, bass(mtof(chord_notes(c, 1)[0]), length, v * 0.8))
        t += length
    return t


def arpeggio(t0, chords, length, step, inst, v=1.0, octave=4, pattern=(0, 1, 2, 1, 3, 2, 1, 2), bus=None):
    bus = bus or keys
    t = t0
    for c in chords:
        ns = chord_notes(c, octave)
        ns = ns + [ns[0] + 12]
        k = 0
        tt = t
        while tt < t + length - 1e-6:
            m = ns[pattern[k % len(pattern)] % len(ns)]
            bus.add(tt, inst(mtof(m), 1.2, v * rng.uniform(0.85, 1.0)), pan=rng.uniform(-0.5, 0.5))
            tt += step
            k += 1
        t += length


def shaker(t0, t1, step, v=1.0):
    t = t0
    k = 0
    while t < t1:
        n = highpass(noise(0.07), 5000) * np.exp(-tvec(0.07) * 60)
        perc.add(t, n, v * (0.6 if k % 2 else 1.0) * 0.08, pan=0.3)
        t += step
        k += 1


def soft_kick(t0, t1, step, v=1.0):
    t = t0
    while t < t1:
        tt = tvec(0.35)
        f = 110 * np.exp(-tt * 18) + 45
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
        perc.add(t, y.astype(np.float32), v * 0.35)
        t += step


# S1 — dusk, the theme on a music box over dark pads
play_pads(0.0, ["A" + "m", "F", "C", "G"], 4.0, v=0.9, bright=4)
play_theme(keys, 2.3, THEME_MINOR, [0, 1, 2, 3], music_box, v=0.55)

# S2 — waking; sparse, then a little routine while sweeping
s2 = START["s2"]
play_pads(s2, ["Am", "F", "C", "G"], 3.75, v=0.7, bright=4)
play_theme(keys, s2 + 2.0, THEME_MINOR, [4, 5, 6, 7], music_box, v=0.35)
sweep_t = sec("s2", 450)
arpeggio(sweep_t, ["C", "G", "Am", "F"], BAR * 0.6, BEAT / 2, pluck, v=0.5, octave=4, pattern=(0, 2, 1, 2))
play_pads(sweep_t, ["C", "G", "Am", "F"], BAR * 0.6, v=0.45, bright=3)
soft_kick(sweep_t, sec("s2", 720), BEAT, v=0.6)
glint_t = sec("s2", 722)
for i, m in enumerate([84, 88, 91, 96]):
    keys.add(glint_t + i * 0.06, music_box(mtof(m), 2.5, 0.35), pan=0.4)
play_pads(glint_t, ["Csus2"], 2.0, v=0.5, bright=3, with_bass=False)

# S3 — wonder: seed, hologram, resolve
s3 = START["s3"]
play_pads(s3, ["Fmaj7", "G"], 4.3, v=0.55, bright=3)
pick = sec("s3", 262)
arpeggio(pick, ["Fmaj7", "Em", "Am", "G", "Fmaj7"], 4.2, BEAT / 3, music_box, v=0.28, octave=5, pattern=(0, 1, 2, 3, 2, 1))
play_pads(pick, ["Fmaj7", "Em", "Am", "G", "Fmaj7"], 4.2, v=0.6, bright=5)
holo = sec("s3", 480)
for m in (76, 83, 88):
    strings.add(holo, pad_voice(mtof(m), 5.5, 0.45, bright=2, attack=0.6), pan=0.5)
resolve = sec("s3", 790)
play_theme(keys, resolve, THEME_MAJOR, [0], piano, v=0.6)
play_pads(resolve, ["C"], 3.6, v=0.6, bright=5)

# S4 — journey montage
s4 = START["s4"]
play_pads(s4, ["C", "G", "Am"], 2.2, v=0.45, bright=4)
walk = sec("s4", 200)
arpeggio(walk, ["C", "G", "Am", "F"] * 5, BAR * 0.5, BEAT / 2, pluck, v=0.5, octave=4, pattern=(0, 2, 1, 3))
shaker(walk, sec("s4", 860), BEAT / 2, v=1.0)
soft_kick(walk, sec("s4", 860), BEAT, v=0.8)
river = sec("s4", 300)
play_theme(keys, river + 0.4, THEME_MINOR, [0, 1, 2, 3], piano, v=0.6)
play_pads(river, ["Am", "F", "C", "G"], BAR, v=0.55, bright=5)
night = sec("s4", 610)
play_pads(night + BAR * 1.2, ["Am", "Em", "F"], 3.0, v=0.4, bright=3)
play_theme(keys, night + 3.0, THEME_MINOR, [4, 5], music_box, v=0.3)
found = sec("s4", 990)
play_pads(found, ["C", "Gsus2"], 2.4, v=0.6, bright=6)
for i, m in enumerate([72, 76, 79, 84, 88]):
    keys.add(found + i * 0.12, music_box(mtof(m), 2.0, 0.35), pan=-0.3 + i * 0.15)

# S5 — storm drone, a lone music box as the power fails
storm0 = sec("s4", 1080)
dt = sec("s5", 640) - storm0
tt = tvec(dt)
drone = (np.sin(2 * np.pi * 55 * tt) + 0.6 * np.sin(2 * np.pi * 82.4 * tt) + 0.3 * np.sin(2 * np.pi * 110.3 * tt + np.sin(tt * 0.7) * 3))
drone *= np.minimum(1, tt / 6) * np.minimum(1, (dt - tt) / 4) * (0.8 + 0.2 * np.sin(tt * 0.5))
low.add(storm0, (drone * 0.22).astype(np.float32))
for b in (40, 255):
    strings.add(sec("s5", b), pad_voice(mtof(58), 3.0, 0.4, bright=4, attack=0.8), pan=-0.3)
    strings.add(sec("s5", b), pad_voice(mtof(59), 3.0, 0.4, bright=4, attack=0.8), pan=0.3)
lone = sec("s5", 440)
play_theme(keys, lone, THEME_MINOR, [0, 1], music_box, v=0.45, beat=BEAT * 1.35)

# S6 — sprout, time-lapse crescendo, morning
sprout = sec("s6", 150)
for i, m in enumerate([76, 79, 84]):
    keys.add(sprout + i * 1.1, piano(mtof(m), 3.5, 0.45), pan=0.1)
tl0 = sec("s6", 300)
tl1 = sec("s6", 760)
chs = ["C", "G", "Am", "F", "C", "G", "F", "G"]
L = (tl1 - tl0) / len(chs)
for i, c in enumerate(chs):
    grow = (i + 1) / len(chs)
    arpeggio(tl0 + i * L, [c], L, L / 8, piano, v=0.25 + 0.3 * grow, octave=4, pattern=(0, 1, 2, 3, 2, 1, 2, 3))
    play_pads(tl0 + i * L, [c], L, v=0.3 + 0.6 * grow, bright=6, with_bass=True, vib=0.004 if i > 3 else 0, bus=strings)
shaker(tl0 + L * 4, tl1, L / 8, v=0.7)
morning = tl1
end_t = play_theme(keys, morning, THEME_MAJOR, list(range(7)), piano, v=0.65)
play_theme(keys, morning + BAR * 2, THEME_MAJOR, list(range(2, 7)), music_box, v=0.22, octave_shift=1)
play_pads(morning, ["C", "G", "Am", "F", "C", "G", "F"], BAR, v=0.75, bright=6, vib=0.004, bus=strings)
arpeggio(morning + BAR * 4, ["C", "G", "F"], BAR, BEAT / 2, pluck, v=0.35, octave=4, pattern=(0, 2, 1, 3))
final_t = end_t
for m in chord_notes("Cadd9", 3) + [n2m("E5"), n2m("G5")]:
    strings.add(final_t, pad_voice(mtof(m), DUR - final_t - 0.5, 0.75, bright=6, attack=0.5, release=2.5, vib=0.003))
keys.add(final_t, piano(mtof(n2m("C4")), 6, 0.7))
keys.add(final_t, piano(mtof(n2m("E5")), 6, 0.6))
low.add(final_t, bass(mtof(36), DUR - final_t - 1, 0.9))

# ---------------------------------------------------------------- sound effects

fx = Bus()
amb = Bus()


def layer(parts):
    """Mix (offset_seconds, signal) pairs into one array."""
    n = max(int(o * SR) + len(x) for o, x in parts)
    out = np.zeros(n, np.float32)
    for o, x in parts:
        i = int(o * SR)
        out[i : i + len(x)] += x
    return out


def beep(f, d, v=1.0, square=0.3):
    t = tvec(d)
    y = np.sin(2 * np.pi * f * t) + square * np.sign(np.sin(2 * np.pi * f * t)) * 0.3
    y *= np.minimum(1, t / 0.004) * np.minimum(1, (d - t) / 0.01)
    return (y * v * 0.25).astype(np.float32)


def glide(f0, f1, d, v=1.0, square=0.25, vib=0.0):
    t = tvec(d)
    f = f0 * (f1 / f0) ** (t / d)
    if vib:
        f = f * (1 + vib * np.sin(2 * np.pi * 9 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) + square * np.sign(np.sin(ph)) * 0.3
    y *= np.minimum(1, t / 0.006) * np.minimum(1, (d - t) / 0.03)
    return (y * v * 0.25).astype(np.float32)


def metal_hit(f0=700, d=0.4, v=1.0):
    t = tvec(d)
    y = sum(a * np.sin(2 * np.pi * f0 * k * t) * np.exp(-t * dk) for k, a, dk in [(1, 1, 14), (1.59, 0.6, 20), (2.41, 0.4, 28), (3.7, 0.25, 40)])
    y += lowpass(noise(d), 3000) * np.exp(-t * 60) * 0.5
    return (y * v * 0.25).astype(np.float32)


def thump(f0=90, d=0.35, v=1.0):
    t = tvec(d)
    f = f0 * (1 + 1.5 * np.exp(-t * 30))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    y += lowpass(noise(d), 900) * np.exp(-t * 40) * 0.6
    return (y * v * 0.4).astype(np.float32)


def footstep(v=1.0):
    return layer([(0, thump(70, 0.25, 0.8 * v)), (0, metal_hit(rng.uniform(380, 460), 0.18, 0.35 * v))])


def servo(d=0.45, v=1.0):
    t = tvec(d)
    f = 260 + 340 * np.sin(np.pi * t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * 0.6 + 0.4 * np.sign(np.sin(ph * 2)) * 0.3 + bandpass(noise(d), 1500, 4000) * 0.15
    y *= np.sin(np.pi * t / d) ** 0.6
    return (y * v * 0.12).astype(np.float32)


def swish(d=0.4, v=1.0, lo=800, hi=5000):
    t = tvec(d)
    y = bandpass(noise(d), lo, hi) * np.sin(np.pi * t / d) ** 2
    return (y * v * 0.5).astype(np.float32)


def bell(f, d=1.5, v=1.0):
    return music_box(f, d, v)


def chirp(v=1.0):
    out = []
    for _ in range(rng.integers(2, 5)):
        d = rng.uniform(0.05, 0.11)
        f0, f1 = rng.uniform(2600, 3600), rng.uniform(3600, 5200)
        if rng.random() < 0.5:
            f0, f1 = f1, f0
        t = tvec(d)
        f = f0 + (f1 - f0) * t / d + 300 * np.sin(2 * np.pi * 45 * t)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d)
        out.append(y)
        out.append(np.zeros(int(rng.uniform(0.03, 0.08) * SR)))
    return (np.concatenate(out) * v * 0.18).astype(np.float32)


def thunder(near=True, v=1.0):
    d = 6.0
    t = tvec(d)
    y = lowpass(brown(d), 300 if near else 160, 2) * 3
    rumble = np.exp(-t * 0.7) * (0.6 + 0.4 * np.abs(np.sin(t * 3.1 + 1) * np.sin(t * 1.3)))
    y *= rumble * np.minimum(1, t / (0.02 if near else 0.4))
    if near:
        crack = highpass(noise(0.4), 1200) * np.exp(-tvec(0.4) * 10) * 0.6
        y[: len(crack)] += crack
    return (y * v * 0.5).astype(np.float32)


SFX = {}
SFX["boot"] = lambda: np.concatenate([glide(120, 400, 0.5, 0.6, vib=0.02)] + [beep(mtof(m), 0.09, 0.8) for m in (72, 76, 79, 84)])
SFX["servo"] = lambda: servo()
SFX["shake"] = lambda: sum_clicks(0.7, 18)
SFX["sad_beep"] = lambda: np.concatenate([glide(700, 520, 0.22), glide(520, 330, 0.35)])
SFX["happy_beep"] = lambda: np.concatenate([glide(600, 900, 0.1), np.zeros(int(0.04 * SR), np.float32), glide(800, 1400, 0.14)])
SFX["surprise"] = lambda: glide(450, 1500, 0.22, vib=0.03)
SFX["warn_beep"] = lambda: np.concatenate([beep(880, 0.12), np.zeros(int(0.08 * SR), np.float32), beep(660, 0.18)])
SFX["clank"] = lambda: metal_hit(520, 0.5)
SFX["sweep"] = lambda: swish(0.45, 0.5, 600, 4000)
SFX["glint"] = lambda: layer([(i * 0.05, bell(f, 1.2, 0.5)) for i, f in enumerate([2093, 2637, 3136, 4186])])
SFX["tink"] = lambda: metal_hit(2600, 0.6, 0.6)
SFX["shimmer"] = lambda: layer([(i * 0.07, bell(mtof(m), 1.6, 0.35)) for i, m in enumerate([84, 88, 91, 95, 96, 100])])
SFX["holo_on"] = lambda: layer([(0, glide(200, 1800, 0.6, 0.6, square=0.6, vib=0.05)), (0, swish(0.6, 0.4, 2000, 8000))])
SFX["holo_off"] = lambda: glide(1600, 150, 0.4, 0.5, square=0.6, vib=0.05)
SFX["knock"] = lambda: thump(85, 0.4, 1.2)
SFX["night_fall"] = lambda: swish(3.0, 0.5, 100, 900)
SFX["dig"] = lambda: (bandpass(noise(0.35), 300, 2500) * (np.abs(np.sin(tvec(0.35) * 60)) ** 2) * np.sin(np.pi * tvec(0.35) / 0.35) * 0.6).astype(np.float32)
SFX["thunder_far"] = lambda: thunder(False, 0.8)
SFX["thunder"] = lambda: thunder(True, 1.0)
SFX["door"] = lambda: layer([(0, glide(320, 210, 0.6, 0.5, square=0.8, vib=0.08)), (0.3, metal_hit(900, 0.3, 0.4))])
SFX["alarm"] = lambda: np.concatenate([np.concatenate([beep(1040, 0.14, 0.8, 1.0), np.zeros(int(0.12 * SR), np.float32)]) for _ in range(4)])
SFX["power_down"] = lambda: glide(900, 50, 1.8, 0.8, square=0.5, vib=0.03)
SFX["drip"] = lambda: (np.sin(2 * np.pi * np.cumsum(700 * (1 + 1.2 * tvec(0.12) / 0.12)) / SR) * np.exp(-tvec(0.12) * 35) * 0.25).astype(np.float32)
SFX["sprout"] = lambda: layer([(0, glide(300, 900, 0.18, 0.5, square=0)), (0.12, bell(mtof(91), 1.0, 0.4))])
SFX["timelapse"] = lambda: (bandpass(noise(2.5), 400, 9000) * (tvec(2.5) / 2.5) ** 3 * 0.5).astype(np.float32)
SFX["chirp"] = lambda: chirp(1.0)
SFX["flutter"] = lambda: np.concatenate([swish(0.06, 0.6, 300, 3000) for _ in range(7)])
SFX["power_up"] = lambda: np.concatenate([glide(80, 900, 0.9, 0.7, vib=0.02)] + [beep(mtof(m), 0.1, 0.7) for m in (76, 79, 84)])
SFX["title_chime"] = lambda: sum(bell(mtof(m), 3.0, 0.35) for m in (72, 76, 79, 84))
SFX["wind_start"] = lambda: np.zeros(1, np.float32)
SFX["storm_start"] = lambda: np.zeros(1, np.float32)
SFX["rain_start"] = lambda: np.zeros(1, np.float32)


def sum_clicks(d, n):
    out = np.zeros(int(d * SR), np.float32)
    for _ in range(n):
        h = metal_hit(rng.uniform(900, 2200), 0.08, rng.uniform(0.2, 0.5))
        i = int(rng.uniform(0, d - 0.1) * SR)
        out[i : i + len(h)] += h
    return out


for scene, cues in T["SFX"].items():
    for cue in cues:
        frame, name = cue[0], cue[1]
        gain = cue[2] if len(cue) > 2 else 1.0
        s = SFX[name]()
        fx.add(sec(scene, frame), s, gain, pan=rng.uniform(-0.25, 0.25))

# footsteps from walk segments, louder for closer shots
STEP_GAIN = {("s4", 300): 0.25}
for scene, segs in T["WALKS"].items():
    for a, b in segs:
        g = STEP_GAIN.get((scene, a), 0.7)
        k = 1
        while True:
            f = a + k * math.pi / T["WALK_SPEED"]
            if f >= b:
                break
            fx.add(sec(scene, f), footstep(g), 1.0, pan=0.15 if k % 2 else -0.15)
            k += 1

# log typing blips
for scene, logs in T["LOGS"].items():
    for lg in logs:
        for i, ch in enumerate(lg["text"]):
            if ch.strip() == "":
                continue
            f = lg["at"] + i * 30 / 12
            fx.add(sec(scene, f), beep(rng.uniform(1700, 2300), 0.025, 0.35, 0.8), 1.0, pan=-0.4)

# ---------------------------------------------------------------- ambience beds


def envelope(points, n):
    xs = np.array([p[0] for p in points]) * SR
    ys = np.array([p[1] for p in points])
    return np.interp(np.arange(n), xs, ys).astype(np.float32)


s5, s6 = START["s5"], START["s6"]
wind_env = envelope(
    [(0, 0), (1.5, 0.45), (15.5, 0.4), (16.5, 0.22), (72, 0.2), (82, 0.28), (92, 0.14), (102, 0.15), (sec("s4", 1060), 0.2), (s5, 0.95), (sec("s5", 470), 0.85), (sec("s5", 640), 0.35), (s6 + 1, 0.15), (s6 + 4, 0.04), (DUR, 0.03)],
    N,
)
w = brown(N / SR)
gust = lowpass(rng.standard_normal(N).astype(np.float32), 0.6, 1)
gust = 0.6 + 0.4 * gust / (np.abs(gust).max() + 1e-9)
wind = bandpass(w, 120, 700) * 3.0 + bandpass(noise(N / SR), 500, 1400) * 0.04 * gust
wind = wind * wind_env * gust
amb.b[0] += wind * 0.4
amb.b[1] += np.roll(wind, 900) * 0.4

rain_env = envelope([(0, 0), (sec("s5", 330), 0), (sec("s5", 380), 1), (sec("s5", 640), 1), (s6 + 2, 0.4), (s6 + 5, 0), (DUR, 0)], N)
r0 = int(sec("s5", 320) * SR)
r1 = int((s6 + 6) * SR)
rn = highpass(rng.standard_normal(r1 - r0).astype(np.float32), 1500) * 0.07
drops = np.zeros(r1 - r0, np.float32)
for i in rng.integers(0, r1 - r0 - 2000, 2500):
    drops[i : i + 600] += np.sin(np.arange(600) * rng.uniform(0.15, 0.4)) * np.exp(-np.arange(600) / 90) * rng.uniform(0.05, 0.2)
rain = (rn + lowpass(drops, 4000)) * rain_env[r0:r1]
amb.b[0, r0:r1] += rain
amb.b[1, r0:r1] += np.roll(rain, 1200)

# birdsong ambience once the world is green again
t = sec("s6", 800)
while t < DUR - 2:
    amb.add(t, chirp(rng.uniform(0.3, 0.6)), 1.0, pan=rng.uniform(-0.8, 0.8))
    t += rng.uniform(1.2, 3.0)

# ---------------------------------------------------------------- mix


def reverb(bus, seconds=2.6, wet=0.3, seed=1):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = np.zeros_like(bus.b)
    for ch in range(2):
        ir = r.standard_normal(n).astype(np.float32) * np.exp(-t * 6.9 / seconds)
        ir = lowpass(ir, 6000)
        ir[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
        ir /= np.sqrt((ir**2).sum())
        out[ch] = signal.fftconvolve(bus.b[ch], ir)[: bus.b.shape[1]]
    return bus.b * (1 - wet) + out * wet * 2.2


pads.b = highpass(lowpass(pads.b, 2400), 150)
strings.b = highpass(lowpass(strings.b, 5000), 120)
music = reverb(pads, 3.2, 0.45, 1) + reverb(keys, 2.4, 0.32, 2) * 1.3 + reverb(strings, 3.0, 0.4, 3) + low.b * 0.6 + reverb(perc, 1.0, 0.2, 4)
effects = reverb(fx, 1.2, 0.18, 5)
ambience = amb.b

mix = music * 0.85 + effects * 1.0 + ambience * 0.9
mix = highpass(mix[:, : int(DUR * SR)], 35, 2)
fade = int(1.5 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade)
# gentle bus compression and peak normalization
peak = np.abs(mix).max()
mix = np.tanh(mix / peak * 1.6) / np.tanh(1.6)
mix *= 0.89

out = os.path.join(HERE, "..", "public", "soundtrack.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
pcm = (mix.T * 32767).astype(np.int16)
import wave

with wave.open(out, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(pcm.tobytes())
print("wrote", out, f"{DUR:.1f}s", "peak", float(np.abs(mix).max()))
