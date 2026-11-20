#!/usr/bin/env python3
"""Build the v281 casino palette from attributed public-domain layers.

Run: python3 scripts/generate-casino-audio-v281.py
Requires numpy and ffmpeg. Originals and license notes live in the sound bank's
sources/ directory. No network access or game randomness is used by this build.
Each multi-instrument phrase is rendered to one voice, not layered at runtime.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import math
import subprocess
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets/audio/casino-v281'
SOURCES = DEST / 'sources'
SR = 44100
TAU = math.tau
SEED = 28120261120
RNG = np.random.default_rng(SEED)

# Retain the old foley's timing vocabulary while rebuilding its musical body.
# Capture its synth buffers in memory; no v277 file is written or modified.
spec = importlib.util.spec_from_file_location('sweets_audio_v277', ROOT / 'scripts/generate-celebration-audio-v277.py')
old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)
BASE = {}
old.save = lambda name, cue, description, peak=.78, wet=.12: BASE.update({name: (cue.samples.copy(), description, peak, wet)})
old.build()

SOURCE_INFO = json.loads((SOURCES / 'provenance.json').read_text())
SOURCE_PCM = {}
for key, info in SOURCE_INFO['sources'].items():
    path = SOURCES / info['file']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == info['sha256'], key
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f64le', '-acodec', 'pcm_f64le', '-ac', '1', '-ar', str(SR), '-'])
    pcm = np.frombuffer(raw, dtype='<f8').copy()
    pcm -= pcm.mean()
    maximum = np.max(np.abs(pcm))
    onset = np.flatnonzero(np.abs(pcm) >= maximum * .018)
    trim = max(0, int(onset[0]) - int(.002 * SR)) if len(onset) else 0
    pcm = pcm[trim:]
    pcm /= max(.01, np.max(np.abs(pcm)))
    SOURCE_PCM[key] = pcm
    info['decodedTrimLeadingSeconds'] = round(trim / SR, 6)
    info['decodedSeconds'] = round(len(pcm) / SR, 6)

THEMES = {
    'cookie': dict(root=72, timbre='mallet', hit='hit-cookie', material='stack', label='warm mallet, cookie crunch and gold chips'),
    'choco': dict(root=60, timbre='brass', hit='hit-canyon', material='collide', label='low brass, mining impact and heavy chips'),
    'candy': dict(root=84, timbre='bell', hit='hit-candy', material='coin', label='bright glass candy, coin sparkle and rapid arpeggios'),
    'gelato': dict(root=88, timbre='crystal', hit='hit-prism', material='coin', label='high crystalline facets and wide frozen sparkle'),
    'winery': dict(root=67, timbre='brass', hit='hit-water', material='handle', label='rounded bottle pop and swinging brass'),
    'popcorn': dict(root=79, timbre='pluck', hit='hit-popcorn', material='dice', label='explosive short pops and syncopated chip showers'),
    'jelly': dict(root=81, timbre='bell', hit='hit-jelly', material='chip', label='elastic liquid pings and rising triplets'),
    'stick': dict(root=74, timbre='mallet', hit='hit-waffle', material='chip', label='dry wafer clicks and precise cascading scale'),
    'castella': dict(root=76, timbre='brass', hit='hit-castella', material='collide', label='warm toasted impact, fizz and golden brass'),
    'dango': dict(root=81, timbre='pluck', hit='hit-dango', material='stack', label='springy mochi plucks and bright pentatonic glints'),
}
GENERIC = dict(root=71, timbre='brass', material='collide', label='casino brass and coin cascade')


def env(n, attack=.002, release=.045):
    return old.envelope(n, attack, release)


def bright_bell(note, seconds=.38):
    t = np.arange(round(seconds * SR)) / SR
    f = old.hz(note)
    x = np.zeros_like(t)
    for ratio, amplitude, decay in [(1, 1, .31), (2.006, .42, .21), (3, .16, .13), (4.03, .09, .085), (6.01, .025, .055)]:
        if f * ratio < SR * .42:
            x += amplitude * np.sin(TAU * f * ratio * t) * np.exp(-t / min(decay, seconds * .65))
    return x * env(len(t), .0018, min(.05, seconds / 3))


def horn(note, seconds=.35):
    t = np.arange(round(seconds * SR)) / SR
    f = old.hz(note)
    x = np.zeros_like(t)
    for detune in [.9982, 1.0018]:
        phase = TAU * f * detune * t + .015 * np.sin(TAU * 5.6 * t)
        for h in range(1, min(11, int(SR * .4 / f))):
            x += np.sin(h * phase) / h ** 1.22 * (.45 + .55 * np.exp(-t * h * .65))
    return x * .42 * env(len(t), .009, min(.075, seconds / 3))


def instrument(name):
    if name == 'brass':
        return horn
    if name == 'crystal':
        return lambda note, seconds: .7 * bright_bell(note, seconds) + .25 * old.bell(note + 12, seconds)
    if name == 'mallet':
        return lambda note, seconds: .8 * old.pluck(note, seconds) + .25 * bright_bell(note + 12, seconds)
    if name == 'pluck':
        return lambda note, seconds: old.pluck(note, seconds) + .18 * bright_bell(note + 12, seconds)
    return bright_bell


def kick(seconds=.23, note=39):
    t = np.arange(round(seconds * SR)) / SR
    f = old.hz(note)
    phase = TAU * (f * t + f * .045 * (1 - np.exp(-t / .018)))
    body = (np.sin(phase) + .3 * np.sin(2 * phase)) * np.exp(-t / .075)
    return body * env(len(t), .0012, .035)


def snare(seconds=.1):
    n = round(seconds * SR)
    bins = np.fft.rfftfreq(n, 1 / SR)
    noise = RNG.standard_normal(n)
    spectrum = np.fft.rfft(noise) * (1 - np.exp(-(bins / 650) ** 2)) * np.exp(-(bins / 7200) ** 8)
    x = np.fft.irfft(spectrum, n=n)
    return x * np.exp(-np.arange(n) / SR / .026) * env(n, .001, .018)


class Cue(old.Cue):
    def __init__(self, seconds, description=''):
        super().__init__(seconds)
        self.layers = []
        self.description = description

    def source(self, key, at=0, *, seconds=.22, start=0, rate=1, level=.3, pan=0):
        pcm = SOURCE_PCM[key]
        begin = min(len(pcm) - 1, max(0, round(start * SR)))
        count = min(len(pcm) - begin, max(2, round(seconds * SR * rate)))
        chunk = pcm[begin:begin + count]
        if len(chunk) < 2:
            return self
        index = np.arange(0, len(chunk) - 1, rate)
        clip = np.interp(index, np.arange(len(chunk)), chunk)
        clip *= env(len(clip), .002, min(.03, len(clip) / SR / 4))
        self.add(clip, at, pan, level)
        self.layers.append(dict(source=key, sourceStartSeconds=round(begin / SR, 6), sourceDurationSeconds=round(count / SR, 6), rate=rate, atSeconds=at, gain=level, pan=pan))
        return self

    def arp(self, notes, at=0, step=.055, seconds=.28, level=.25, timbre='bell'):
        return self.run(notes, at, step, seconds, level, instrument(timbre))

    def brass(self, notes, at=0, seconds=.35, level=.14):
        return self.chord(notes, at, seconds, level, horn)

    def roll(self, at, duration, pulses=8, level=.11):
        for i in range(pulses):
            self.add(snare(.09), at + duration * i / pulses, (-1 if i % 2 else 1) * .22, level * (.45 + .55 * i / max(1, pulses - 1)))
        return self

    def shower(self, at, duration=.55, pulses=7, level=.14):
        for i in range(pulses):
            self.source('coin' if i % 3 == 0 else 'shower', at + duration * i / pulses, seconds=.15 if i % 3 else .25, start=(i % 4) * .085, rate=1 + i % 3 * .11, level=level, pan=(-.65 if i % 2 else .65))
        return self


CUES = {}


def master_award(cue, peak, wet, tier):
    """Bound crest factor before export; do not raise the PCM peak ceiling."""
    dry=cue.samples.copy();mix=dry.copy()
    for delay,amount in [(.047,.34),(.083,.24),(.131,.18),(.197,.13),(.293,.085)]:
        offset=round(delay*SR)
        if offset<len(dry):mix[offset:]+=dry[:-offset,::-1]*amount*wet
    mix-=mix.mean(axis=0);mix*=env(len(mix),.0015,.05)[:,None]
    target={1:-16.7,2:-15.1,3:-14.4,4:-13.7}.get(tier,-15)
    for drive in [.85,1.2,1.6,2.1,2.7]:
        out=np.tanh(mix*drive)
        out-=out.mean(axis=0);out*=env(len(out),.0015,.025)[:,None]
        out*=peak/max(.00001,np.max(np.abs(out)))
        rms=20*np.log10(max(.00001,np.sqrt(np.mean(out**2))))
        if rms>=target:break
    return np.round(out*32767).astype('<i2'),drive


def save(name, cue, *, peak=.78, wet=.15, category='action', game=None, tier=None):
    # One nonlinear, band-limited musical mix; host voice limits remain unchanged.
    cue.samples *= 1.1 if category in ['award', 'jackpot'] else .95
    if category in ['award','jackpot','jpc','multiplier']:
        pcm,drive=master_award(cue,peak,wet,tier)
    else:
        pcm,drive=cue.finish(peak,wet),.85
    path = DEST / (name + '.wav')
    with wave.open(str(path), 'wb') as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        wav.writeframes(pcm.tobytes())
    data = pcm.astype(float) / 32768
    CUES[name] = dict(file=path.name, description=cue.description, category=category, game=game, tier=tier,
                      seconds=round(len(pcm) / SR, 6), peakDbFS=round(20 * np.log10(np.max(np.abs(data))), 3),
                      rmsDbFS=round(20 * np.log10(np.sqrt(np.mean(data ** 2))), 3), bytes=path.stat().st_size,
                      sha256=hashlib.sha256(path.read_bytes()).hexdigest(), masteringDrive=drive, sourceLayers=cue.layers)


def hit(theme, index):
    seconds=.30 + (index % 4) * .045
    c = Cue(seconds, theme['label'] + '; one compact real HIT')
    r = theme['root']
    c.source(theme['material'], seconds=.12, level=.38, rate=.92 + index * .035)
    c.add(instrument(theme['timbre'])(r, seconds * .8), .004, level=.48)
    c.add(kick(.16, 46 + index % 5), level=.14 if index not in [1, 5] else .32)
    if theme['timbre'] in ['bell', 'crystal']:
        c.add(bright_bell(r + 7, seconds * .65), .035, .25, .23)
    if index in [4, 6]:
        c.add(old.sine_slide(430 + index * 35, 1200, .14), level=.22)
    return c


def chain(theme, index):
    r=theme['root'];steps=[0, 4, 7, 12] if index != 9 else [0, 2, 7, 12]
    c = Cue(.62, theme['label'] + '; rising four-step chain with coin punctuation')
    c.arp([r + n for n in steps], .005, .056, .29, .29, theme['timbre'])
    c.source('stack', .005, seconds=.12, level=.21).source('coin', .18, seconds=.28, start=.11, rate=1.15, level=.18, pan=.35)
    c.add(kick(.17, 48 + index % 4), .002, level=.18)
    return c


def award(theme, tier, index=0):
    duration={1:1.16, 2:1.86, 3:2.48, 4:3.06}[tier]
    # The small HIT may be very high; keep long fanfares in a musical register
    # instead of extending their harmonics into a piercing top octave.
    r=theme['root']-12 if theme['root']>=81 else theme['root'];bass=r-24 if r>=76 else r-12
    c = Cue(duration, theme['label'] + '; '+['', 'role / bingo stamp', 'high-win brass and coin response', 'super-win roll and ascending fanfare', 'all-clear climax with rolling coin payout'][tier])
    c.source('collide', seconds=.20, rate=.94 + index * .015, level=.3)
    c.add(kick(.28, 36 + index % 6), level=.28 + .025 * tier)
    c.arp([r, r+4, r+7, r+12], .022, .045, .34, .29, theme['timbre'])
    c.brass([bass, bass+7, bass+12], .04, .18, .13)
    if tier == 1:
        c.brass([r-12, r-8, r-5], .22, .38, .14)
        c.arp([r+12, r+16, r+19], .28, .055, .43, .21, theme['timbre'])
        c.source('coin', .29, seconds=.44, start=.08, level=.22, pan=.2)
    else:
        c.roll(.13, .31, 7 if tier==2 else 10, .105)
        c.brass([r-12, r-8, r-5, r], .39, .34, .15)
        c.add(kick(.26, 36 + index % 4), .39, level=.23)
        c.arp([r+7, r+12, r+16, r+19], .43, .065, .43, .23, theme['timbre'])
        c.source('jingle', .385, seconds=.16, rate=1.08, level=.055)
        if tier == 2:
            c.brass([r-12, r-8, r-5, r], .83, .49, .14)
            c.shower(.84, .50, 6, .14)
        else:
            c.brass([r-7, r-3, r, r+5], .83, .29, .14)
            c.arp([r+12, r+16, r+19, r+24], .87, .05, .37, .18, theme['timbre'])
            c.roll(1.07, .27, 8, .12)
            c.brass([r-5, r-1, r+2, r+7], 1.14, .24, .14)
            arrival=1.43 if tier==3 else 1.61
            if tier==4:
                c.add(old.air(.49, 4200, 2600, rising=True), 1.14, level=.23)
                c.roll(1.30, .31, 10, .13)
            c.add(kick(.4, 36), arrival, level=.30)
            c.brass([bass, r-12, r-8, r-5, r, r+7], arrival, .63 if tier==3 else .88, .16)
            c.arp([r+12, r+16, r+19, r+24, r+28], arrival+.025, .055, .5, .20, theme['timbre'])
            c.shower(arrival+.09, .62 if tier==3 else .92, 8 if tier==3 else 12, .16)
            if tier==4:
                c.add(bright_bell(r+24, .51), 2.4, .2, .22)
    return c


def build():
    DEST.mkdir(parents=True, exist_ok=True)
    # Existing 41 keys remain valid, including fallback and worker entry gates.
    for name,(data,description,peak,wet) in BASE.items():
        if name.startswith('hit-') or name.startswith('award-') or name in ['chain','count','multiplier','jpc-qualified']:
            continue
        c=Cue(len(data)/SR, 'Casino remix: '+description)
        c.samples=data*.65
        if name in ['drop','hammer-launch','launch','transform','transfer','sweep','scroll']:
            c.source('shuffle', seconds=min(.40,len(data)/SR*.6), rate=1.25, level=.27)
            c.add(old.air(min(.4,len(data)/SR*.7), 3800, 2200, rising=True), level=.14)
        elif name in ['land','drill','hammer-impact','arrival']:
            c.source('collide' if name!='arrival' else 'chip', seconds=.20, level=.31)
            c.add(kick(.18,42 if name in ['drill','hammer-impact'] else 55),level=.22)
        elif name in ['refill','ore','count-done','sugar','level','round','finish']:
            c.source('handle',seconds=.31,level=.22)
            c.source('coin',min(.28,len(data)/SR/3),seconds=.28,start=.08,rate=1.18,level=.22,pan=.3)
        elif name in ['reach','reach-high']:
            c.roll(.02,min(.46,len(data)/SR*.4),6 if name=='reach' else 10,.09)
            c.source('chip',seconds=.12,level=.19)
        elif name in ['ui','confirm','miss']:
            c.source('chip',seconds=.09,rate=1.25,level=.12)
        else:
            c.source('coin',seconds=.18,start=.16,level=.13)
        save(name,c,peak=min(.79,peak+.025),wet=wet,category='ui' if name in ['ui','confirm','miss'] else 'reach' if name.startswith('reach') else 'action')
    for i,(game,theme) in enumerate(THEMES.items()):
        save(theme['hit'],hit(theme,i),peak=.74,wet=.08,category='hit',game=game)
        save('chain-'+game,chain(theme,i),peak=.76,wet=.12,category='chain',game=game)
        for tier in range(1,5):
            save('award-'+game+'-'+str(tier),award(theme,tier,i),peak=.79,wet=.15+tier*.01,category='award',game=game,tier=tier)
    for tier in range(1,5):
        save('award-'+str(tier),award(GENERIC,tier,11),peak=.79,wet=.16,category='award',tier=tier)
    save('chain',chain(GENERIC,11),peak=.75,category='chain')
    c=Cue(.15,'Short physical coin-counter click with bright tuned transient')
    c.source('chip',seconds=.075,rate=1.45,level=.45).add(old.pluck(96,.14),.003,level=.3)
    save('count',c,peak=.53,wet=.025,category='counter')
    c=Cue(.13,'Mechanical reel tooth: real casino chip attack and high-frequency spring')
    c.source('stack',seconds=.065,rate=1.9,level=.5).add(old.pluck(88,.11),level=.14)
    save('reel-tick',c,peak=.51,wet=.02,category='counter')
    for key,tier in [('multiplier',1),('multiplier-high',2),('multiplier-galaxy',3)]:
        c=award(dict(root=79+tier,timbre='crystal',material='coin',label='multiplier '+str(tier)+' reveal'),tier,3+tier)
        c.description='Multiplier reveal '+str(tier)+': reel stop, '+('compact brass stamp' if tier==1 else 'coin cascade and rising crystal fanfare')
        save(key,c,peak=.77,category='multiplier',tier=tier)
    c=award(dict(root=76,timbre='crystal',material='coin',label='JPC ticket earned'),3,12)
    c.description='Actual JPC qualification: accelerating reel roll, broad brass, crystal climb and coin shower'
    save('jpc-qualified',c,peak=.79,category='jpc',tier=3)
    c=Cue(1.62,'24/25 JPC reach: urgent rolling suspense and unresolved suspended brass')
    c.roll(0,.86,14,.11).brass([62,67,74],.24,.53,.15).arp([79,86,91,98],.34,.13,.46,.21,'crystal')
    c.source('shuffle',.02,seconds=.42,rate=1.5,level=.2).source('chip',.91,seconds=.11,level=.22)
    save('jpc-reach',c,peak=.77,category='reach')
    c=Cue(3.96,'JACKPOT: two-stage brass victory, heavy drum accents, stereo coin payout and final crystal crown')
    main=award(dict(root=72,timbre='brass',material='coin',label='jackpot'),4,14)
    c.samples[:len(main.samples)]=main.samples;c.layers.extend(main.layers)
    c.add(kick(.45,36),2.74,level=.32).brass([48,60,64,67,72,76,79],2.75,.91,.15)
    c.arp([84,88,91,96,100,103],2.79,.065,.48,.22,'crystal').shower(2.85,.72,12,.18)
    save('jackpot',c,peak=.79,wet=.20,category='jackpot',tier=4)


if __name__=='__main__':
    build()
    assert len(CUES)==97, len(CUES)
    manifest=dict(version=281,format=dict(sampleRate=SR,channels=2,bitsPerSample=16),seed=SEED,
                  generator='scripts/generate-casino-audio-v281.py',
                  generatorSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  synthesisBase='scripts/generate-celebration-audio-v277.py',
                  provenance='Kenney Casino Audio / Music Jingles (CC0), Willem Hunt Coin Drop / SoundBible (Public Domain), combined with original procedural composition and synthesis. Source files, licenses and per-cue layers are preserved.',
                  sources=SOURCE_INFO,themes=THEMES,cues=CUES,totalBytes=sum(v['bytes'] for v in CUES.values()),
                  limits=dict(maxCueSeconds=4,maxHitSeconds=.5,maxChainSeconds=.7,maxPcmPeak=.8,maxRuntimeVoices=8),
                  runtime='One pre-rendered multi-layer cue per voice. Existing AudioContext, limiter, mute/pause, event ownership and deterministic game state remain unchanged.')
    (DEST/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(dict(cues=len(CUES),bytes=manifest['totalBytes'],destination=str(DEST),sourceSites=['kenney.nl','soundbible.com'])))
