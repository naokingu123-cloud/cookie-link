#!/usr/bin/env python3
"""Validate the delivered v281 PCM and the actual licensed layers it uses."""
from array import array
from pathlib import Path
import hashlib
import json
import math
import sys
import wave

root=Path(__file__).resolve().parents[1]
folder=root/'assets/audio/casino-v281'
manifest=json.loads((folder/'manifest.json').read_text())
assert manifest['version']==281
assert len(manifest['cues'])==97
assert {p.name for p in folder.glob('*.wav')}=={c['file'] for c in manifest['cues'].values()}
assert hashlib.sha256((root/manifest['generator']).read_bytes()).hexdigest()==manifest['generatorSha256']
sources=manifest['sources']['sources']
for key,entry in sources.items():
    data=(folder/'sources'/entry['file']).read_bytes()
    assert len(data)==entry['bytes'] and hashlib.sha256(data).hexdigest()==entry['sha256'],key
    assert entry['license'] in ['CC0-1.0','Public Domain (specific asset declaration)'],key
hashes=set();used_sources=set();total=0;largest_peak=-100
for name,cue in manifest['cues'].items():
    path=folder/cue['file'];payload=path.read_bytes()
    assert len(payload)==cue['bytes']
    digest=hashlib.sha256(payload).hexdigest()
    assert digest==cue['sha256'] and digest not in hashes,name
    hashes.add(digest);total+=len(payload)
    with wave.open(str(path),'rb') as wav:
        assert (wav.getnchannels(),wav.getsampwidth(),wav.getframerate(),wav.getcomptype())==(2,2,44100,'NONE'),name
        duration=wav.getnframes()/44100
        assert abs(duration-cue['seconds'])<.000001 and .12<=duration<=4,name
        if cue['category']=='hit':assert duration<=.5,name
        if cue['category']=='chain':assert duration<=.7,name
        pcm=array('h',wav.readframes(wav.getnframes()))
    if sys.byteorder!='little':pcm.byteswap()
    assert tuple(pcm[:2])==(0,0) and tuple(pcm[-2:])==(0,0),name
    peak=max(abs(v) for v in pcm)/32768
    rms=math.sqrt(sum((v/32768)**2 for v in pcm)/len(pcm))
    peak_db=20*math.log10(peak);rms_db=20*math.log10(rms)
    largest_peak=max(largest_peak,peak_db)
    assert .15<peak<=.8 and -38<rms_db<-8,name
    assert abs(peak_db-cue['peakDbFS'])<.001 and abs(rms_db-cue['rmsDbFS'])<.001,name
    assert max(abs(v) for v in pcm[-88:])<.015*32768,name
    for channel in [pcm[::2],pcm[1::2]]:
        assert abs(sum(channel)/len(channel)/32768)<.003,name
    for layer in cue['sourceLayers']:
        assert layer['source'] in sources and layer['sourceDurationSeconds']>0,name
        assert 0<=layer['atSeconds']<duration and layer['gain']>0,name
        assert layer['sourceStartSeconds']+layer['sourceDurationSeconds']<=sources[layer['source']]['decodedSeconds']+.000002,name
        used_sources.add(layer['source'])
assert used_sources==set(sources),'every preserved source is used by a delivered cue'
assert total==manifest['totalBytes']
for game,theme in manifest['themes'].items():
    assert manifest['cues'][theme['hit']]['game']==game
    assert manifest['cues']['chain-'+game]['game']==game
    awards=[manifest['cues']['award-'+game+'-'+str(tier)] for tier in range(1,5)]
    assert [x['seconds'] for x in awards]==sorted(set(x['seconds'] for x in awards)),game
    assert all(x['sourceLayers'] for x in awards),game
    # Every high tier has the staged composition and no louder PCM peak than
    # the normal tier. Texture/density, not an unbounded gain, adds intensity.
    assert all(abs(x['peakDbFS']-awards[0]['peakDbFS'])<.001 for x in awards),game
assert manifest['cues']['jackpot']['seconds']>manifest['cues']['award-4']['seconds']
print(json.dumps(dict(ok=True,version=281,cues=len(hashes),games=len(manifest['themes']),licensedSources=len(used_sources),sourceSites=2,bytes=total,maxPeakDbFS=round(largest_peak,3),fadedEdges=True,sourceAndOutputHashesMatched=True)))
