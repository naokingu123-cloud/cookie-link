#!/usr/bin/env python3
"""Render the original SWEETS LINK v277 sound palette, without source recordings.

Run: python scripts/generate-celebration-audio-v277.py
The fixed seed is for offline noise synthesis only; game RNG is never involved.
numpy is the only nonstandard dependency. WAVs are stereo, 44.1 kHz, 16-bit PCM.
"""
from pathlib import Path
import hashlib
import json
import math
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/audio/celebration-v277"
SR = 44100
TAU = 2 * math.pi
RNG = np.random.default_rng(27702112026)


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def envelope(n, attack=.004, release=.035):
    out = np.ones(n)
    a, r = min(n, round(attack * SR)), min(n, round(release * SR))
    if a:
        out[:a] *= np.sin(np.linspace(0, math.pi / 2, a)) ** 2
    if r:
        out[-r:] *= np.cos(np.linspace(0, math.pi / 2, r)) ** 2
    return out


def bell(note, seconds=.55, level=1):
    t = np.arange(round(seconds * SR)) / SR
    f = hz(note)
    x = sum(amp * np.sin(TAU * f * ratio * t) * np.exp(-t / decay)
            for ratio, amp, decay in [(1, .76, seconds / 4), (2.003, .22, seconds / 6),
                                      (3.97, .065, seconds / 9), (5.05, .018, seconds / 11)])
    return x * envelope(len(t), .0025, .035) * level


def pluck(note, seconds=.25, level=1):
    t = np.arange(round(seconds * SR)) / SR
    f = hz(note)
    x = (np.sin(TAU * f * t) + .27 * np.sin(TAU * f * 2 * t)
         + .10 * np.sin(TAU * f * 3 * t)) * np.exp(-t / (seconds / 5))
    return x * envelope(len(t), .002, .022) * level


def brass(note, seconds=.55, level=1):
    t = np.arange(round(seconds * SR)) / SR
    # Softened harmonic reed/brass body, with a slight delayed vibrato.
    phase = TAU * hz(note) * t + .028 * np.sin(TAU * 5.2 * t) * np.minimum(1, t / .22)
    x = sum(np.sin(h * phase) / h ** 1.6 * np.exp(-t * h * .17) for h in range(1, 9))
    x *= .85 + .15 * np.exp(-t / .04)
    return x * envelope(len(t), .027, min(.14, seconds / 3)) * level


def sine_slide(f0, f1, seconds=.24, level=1):
    t = np.arange(round(seconds * SR)) / SR
    frequency = f0 * (f1 / f0) ** (t / seconds)
    phase = TAU * np.cumsum(frequency) / SR
    x = np.sin(phase) + .12 * np.sin(2 * phase)
    return x * np.exp(-t / (seconds / 2)) * envelope(len(t), .005, .035) * level


def air(seconds=.3, center=2400, width=2100, level=1, rising=False):
    n = round(seconds * SR)
    noise = RNG.standard_normal(n)
    bins = np.fft.rfftfreq(n, 1 / SR)
    mask = np.exp(-((bins - center) / width) ** 2)
    mask *= (1 - np.exp(-(bins / 320) ** 2)) * np.exp(-(bins / 7600) ** 8)
    x = np.fft.irfft(np.fft.rfft(noise) * mask, n=n)
    t = np.linspace(0, 1, n)
    body = (np.sin(math.pi * t) ** 1.8 if rising else np.exp(-t * 6))
    return x * body * envelope(n, .012, .055) * level


def impact(note=48, seconds=.38, level=1):
    x = sine_slide(hz(note) * 1.7, hz(note), seconds, .55)
    grit = air(seconds, 1300, 1400, .15)
    return (x + grit) * level


class Cue:
    def __init__(self, seconds):
        self.samples = np.zeros((round(seconds * SR), 2), dtype=np.float64)

    def add(self, waveform, at=0, pan=0, level=1):
        begin = round(at * SR)
        length = min(len(waveform), len(self.samples) - begin)
        if length <= 0:
            return self
        angle = (np.clip(pan, -.85, .85) + 1) * math.pi / 4
        self.samples[begin:begin + length, 0] += waveform[:length] * math.cos(angle) * level
        self.samples[begin:begin + length, 1] += waveform[:length] * math.sin(angle) * level
        return self

    def chord(self, notes, at, seconds=.55, level=.2, instrument=brass):
        for i, note in enumerate(notes):
            self.add(instrument(note, seconds), at, (i / max(1, len(notes) - 1) - .5) * .85, level)
        return self

    def run(self, notes, at=0, step=.065, seconds=.4, level=.4, instrument=bell):
        for i, note in enumerate(notes):
            self.add(instrument(note, seconds), at + i * step,
                     -.42 + .84 * i / max(1, len(notes) - 1), level)
        return self

    def finish(self, peak=.78, wet=.12):
        dry = self.samples.copy()
        # Small, asymmetric early reflections: spacious but intelligible on phone speakers.
        for delay, amount in [(.047, .34), (.083, .24), (.131, .18), (.197, .13), (.293, .085)]:
            offset = round(delay * SR)
            if offset < len(dry):
                self.samples[offset:] += dry[:-offset, ::-1] * amount * wet
        self.samples -= self.samples.mean(axis=0)
        self.samples *= envelope(len(self.samples), .0015, .022)[:, None]
        self.samples = np.tanh(self.samples * .85)
        maximum = np.max(np.abs(self.samples))
        if maximum:
            self.samples *= peak / maximum
        return np.round(self.samples * 32767).astype('<i2')


CUES = {}


def save(name, cue, description, peak=.78, wet=.12):
    pcm = cue.finish(peak, wet)
    path = DEST / (name + '.wav')
    with wave.open(str(path), 'wb') as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        wav.writeframes(pcm.tobytes())
    data = pcm.astype(float) / 32768
    CUES[name] = {
        'file': path.name,
        'description': description,
        'seconds': round(len(pcm) / SR, 6),
        'peakDbFS': round(20 * np.log10(np.max(np.abs(data))), 3),
        'rmsDbFS': round(20 * np.log10(np.sqrt(np.mean(data ** 2))), 3),
        'bytes': path.stat().st_size,
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def build():
    DEST.mkdir(parents=True, exist_ok=True)
    # Tactile hits share a small tuned core; each material has its own attack/body.
    c = Cue(.38).add(pluck(79, .3), level=.6).add(air(.12, 1500, 1300), level=.12)
    save('hit-cookie', c, 'Round baked-cookie knock with golden mallet tail', .69)
    c = Cue(.44).add(impact(45, .28), level=.48).add(pluck(67, .34), .018, level=.5)
    save('hit-canyon', c, 'Soft chocolate-rock impact and low wooden body', .72)
    c = Cue(.47).run([84, 91], step=.032, seconds=.35, level=.45).add(pluck(60, .16), level=.15)
    save('hit-candy', c, 'Two tiny glassy candy lights', .7)
    c = Cue(.52).run([88, 95], step=.04, seconds=.4, level=.36).add(air(.16, 3300, 1800), level=.06)
    save('hit-prism', c, 'Crystal chime with airy facets', .69)
    c = Cue(.46).add(sine_slide(480, 1060, .14), level=.38).add(bell(86, .35), .045, level=.35)
    save('hit-water', c, 'Juice bubble pop and light celesta', .7)
    c = Cue(.34).add(sine_slide(270, 100, .11), level=.46).add(pluck(84, .25), .014, level=.42)
    save('hit-popcorn', c, 'Springy popcorn snap with a tuned kernel', .72)
    c = Cue(.33).add(pluck(74, .25), level=.6).add(pluck(86, .17), .018, level=.2)
    save('hit-waffle', c, 'Dry waffle-stone click with a soft upper overtone', .65)
    c = Cue(.4).add(pluck(76, .3), level=.55).add(air(.18, 1700, 1500), level=.085)
    save('hit-castella', c, 'Soft cake tap and fine crumb sparkle', .68)
    c = Cue(.42).run([81, 88], step=.032, seconds=.3, level=.4).add(sine_slide(280, 230, .13), level=.18)
    save('hit-dango', c, 'Elastic mochi pluck and a small bell', .68)

    c = Cue(.62).add(sine_slide(900, 240, .42), level=.32).add(air(.42, 2400, 2500, rising=True), level=.12)
    save('drop', c, 'A short descending airy fall', .63)
    c = Cue(.44).add(impact(48, .24), level=.28).add(pluck(72, .28), .025, level=.5)
    save('land', c, 'Rounded landing with a clean tuned click', .68)
    c = Cue(.74).run([72, 79, 84], step=.085, seconds=.38, level=.38).add(air(.4, 3100, 2200, rising=True), level=.09)
    save('refill', c, 'Fresh sweets dropping in three ascending notes', .68)
    c = Cue(.55).add(impact(43, .36), level=.38)
    for i in range(4):
        c.add(pluck(62 + i * 2, .15), i * .038, level=.22)
    c.add(air(.25, 1400, 1700), level=.14)
    save('drill', c, 'Four short rhythmic chocolate drill taps', .7)
    c = Cue(.66).add(sine_slide(580, 260, .44), level=.36).add(air(.48, 1600, 1800), level=.1)
    c.run([79, 76], .06, .14, .3, .18)
    save('melt', c, 'Melting low sweep with liquid droplets', .65)
    c = Cue(.65).run([84, 88, 91], .015, .05, .45, .4).add(pluck(60, .17), level=.2)
    save('ore', c, 'Three small gold glints', .7)
    c = Cue(.7).add(air(.53, 2900, 2200, rising=True), level=.2).add(sine_slide(190, 740, .48), level=.26)
    save('hammer-launch', c, 'Elastic rising hammer windup', .7)
    c = Cue(.88).add(impact(36, .45), level=.65).add(air(.3, 1800, 2100), level=.16)
    c.chord([60, 67, 72], .032, .46, .12, bell)
    save('hammer-impact', c, 'Firm low impact with a brief golden chord', .8)
    c = Cue(.93).run([72, 76, 79, 84, 88], .02, .065, .44, .28)
    c.add(air(.65, 3800, 1800, rising=True), .02, level=.14)
    save('transform', c, 'Magical turning sweep and celesta staircase', .73)
    c = Cue(.6).add(sine_slide(350, 1100, .3), level=.25).add(bell(88, .35), .13, level=.42)
    save('transfer', c, 'A bright arc arriving on a bell', .65)
    c = Cue(.58).add(air(.43, 1600, 1900, rising=True), level=.28).run([67, 72], .09, .12, .26, .3, pluck)
    save('scroll', c, 'Soft terrain movement and two wooden steps', .65)
    c = Cue(.83).add(air(.58, 2700, 2200, rising=True), level=.15).run([72, 76, 79, 84], .04, .08, .39, .32)
    save('sweep', c, 'Full-board sweep that opens into four bright notes', .72)
    c = Cue(.59).run([79, 84, 88], 0, .055, .36, .36).add(impact(55, .2), level=.17)
    save('chain', c, 'Three-note positive link accent, short enough for cascades', .72)

    c = Cue(.2).add(pluck(91, .17), level=.65)
    save('ui', c, 'Small rounded user-interface marimba tick', .48, .06)
    c = Cue(.36).run([79, 86], 0, .065, .24, .4, pluck)
    save('confirm', c, 'Two-note selection confirmation', .58, .08)
    c = Cue(.19).add(pluck(91, .15), level=.6).add(bell(103, .13), .008, level=.11)
    save('count', c, 'Short coin-counter tick with no long overlapping tail', .49, .04)
    c = Cue(.88).run([79, 84, 88, 91], 0, .075, .44, .33).chord([60, 72, 76], .22, .44, .12)
    save('count-done', c, 'Coin count resolves with a warm major chord', .7)
    c = Cue(.94).add(impact(40, .29), level=.31).add(air(.6, 2700, 2300, rising=True), level=.23)
    c.add(sine_slide(170, 1050, .59), .01, level=.27).add(bell(79, .35), .48, level=.2)
    save('launch', c, 'Roulette launch spring, airy sweep and compact lift', .74)
    c = Cue(.39).add(pluck(84, .29), level=.55).add(bell(91, .31), .025, level=.22)
    save('arrival', c, 'Precise soft pocket chime leaving room for the spoken number', .61)
    c = Cue(.51).run([67, 64], 0, .12, .29, .4, pluck)
    save('miss', c, 'Gentle two-note landing; quiet and clearly separate from awards', .53)
    c = Cue(1.0).run([72, 79, 84, 88, 91], 0, .068, .5, .31).chord([60, 64, 67], .32, .45, .12)
    save('level', c, 'Short upward level-change flourish', .72)
    c = Cue(1.18).run([84, 88, 91, 96, 100], .01, .082, .58, .31).add(air(.7, 4200, 1700, rising=True), .07, level=.11)
    save('sugar', c, 'Sugar crystal collection with bright falling star reflections', .73, .18)
    c = Cue(1.16).run([67, 72, 76, 79], .03, .11, .45, .29).chord([60, 64, 67, 72], .4, .52, .13)
    save('round', c, 'Fresh round begins with an open uplifting cadence', .73)
    c = Cue(.94).run([79, 76, 72], 0, .10, .4, .3).chord([48, 60, 64], .26, .5, .13)
    save('finish', c, 'A warm completed-round cadence without a jackpot flourish', .65)

    # Reach has an open suspended ending; only actual awards resolve to C major.
    c = Cue(.94).run([79, 86, 91], 0, .145, .48, .32).chord([62, 67, 74], .23, .51, .095)
    save('reach', c, 'Three measured sparkle steps and an unresolved suspended chord', .69)
    c = Cue(1.57).run([74, 79, 86, 91, 98], .025, .12, .53, .29)
    c.chord([55, 62, 69, 74], .2, .75, .13).add(air(.85, 3600, 2300, rising=True), .11, level=.12)
    c.add(bell(98, .58), .78, level=.33)
    save('reach-high', c, 'High-reach rising shimmer and open bright suspense', .75, .17)

    for tier, seconds in [(1, 1.48), (2, 2.13), (3, 2.84), (4, 3.68)]:
        c = Cue(seconds).add(impact(36 if tier >= 3 else 48, .4), level=.3)
        c.add(air(.42 + tier * .07, 3300, 2400), .02, level=.11)
        c.run([72, 76, 79, 84], .035, .07, .48, .3)
        if tier == 1:
            c.chord([60, 64, 67, 72], .27, .64, .16)
            c.run([88, 91, 96], .37, .065, .55, .2)
        elif tier == 2:
            c.run([72, 76, 79, 84], .14, .135, .34, .18, brass)
            c.chord([48, 60, 64, 67, 72], .57, .85, .14)
            c.run([84, 88, 91, 96], .69, .092, .61, .24)
        elif tier == 3:
            c.run([67, 72, 76, 79], .12, .145, .38, .19, brass)
            c.chord([53, 60, 65, 69], .67, .4, .15)
            c.chord([55, 62, 67, 71], 1.03, .37, .15)
            c.chord([48, 60, 64, 67, 72], 1.38, .9, .16)
            c.run([84, 88, 91, 96, 100], 1.4, .095, .65, .22)
            c.add(air(.68, 4000, 2500), 1.39, level=.1)
        else:
            c.run([67, 72, 76, 79, 84], .15, .145, .39, .19, brass)
            c.chord([53, 60, 65, 69], .89, .43, .16)
            c.run([91, 88, 84, 79], .91, .09, .45, .19)
            c.chord([55, 62, 67, 71], 1.33, .45, .17)
            c.add(air(.53, 3700, 2200, rising=True), 1.2, level=.16)
            c.add(impact(36, .55), 1.79, level=.29)
            c.chord([48, 60, 64, 67, 72, 76], 1.78, 1.22, .16)
            c.run([84, 88, 91, 96, 100, 103], 1.82, .09, .72, .21)
            c.add(bell(96, .88), 2.55, level=.22)
        save('award-' + str(tier), c,
             ['Bingo / role: bell pickup and one warm resolved brass chord',
              'High win: rhythmic brass call, bright chime response',
              'Super win: staged IV–V–I brass cadence and sparkle cascade',
              'Highest win / all clear: full original three-stage fanfare, impact and long gold resolution'][tier - 1],
             .79, .18)

    c = Cue(2.48).add(impact(43, .4), level=.3).run([72, 76, 79, 84, 88, 91], .02, .085, .58, .3)
    c.chord([55, 62, 67], .36, .52, .15).chord([48, 60, 64, 67, 72], .91, .99, .16)
    c.run([91, 96, 100, 103], 1.02, .105, .7, .22)
    save('jpc-qualified', c, 'Earned JPC ticket: original ascending crystal call and major fanfare', .79, .18)
    c = Cue(1.22).run([76, 79, 84, 88], .015, .077, .47, .28).chord([60, 64, 67], .29, .55, .15)
    c.add(impact(48, .28), .29, level=.18)
    save('multiplier', c, 'Multiplier reveal: four sparkling notes and a crisp affirmative stamp', .73)


if __name__ == '__main__':
    build()
    manifest = {
        'version': 277,
        'format': {'sampleRate': SR, 'channels': 2, 'bitsPerSample': 16},
        'provenance': 'Original procedural composition and synthesis; no recordings, third-party samples, reference audio, or game audio were used.',
        'generator': 'scripts/generate-celebration-audio-v277.py',
        'seed': 27702112026,
        'cues': CUES,
        'totalBytes': sum(v['bytes'] for v in CUES.values()),
    }
    (DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'cues': len(CUES), 'bytes': manifest['totalBytes'], 'destination': str(DEST)}))
