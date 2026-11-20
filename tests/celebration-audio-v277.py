#!/usr/bin/env python3
"""Validate delivered original PCM cues with standard-library-only checks."""
from array import array
import hashlib
import json
import math
from pathlib import Path
import sys
import wave

root = Path(__file__).resolve().parents[1]
folder = root / "assets/audio/celebration-v277"
manifest = json.loads((folder / "manifest.json").read_text())
assert manifest["version"] == 277
assert len(manifest["cues"]) == 41
assert {p.name for p in folder.glob("*.wav")} == {c["file"] for c in manifest["cues"].values()}
total = 0
peaks = []
hashes = set()
for name, cue in manifest["cues"].items():
    path = folder / cue["file"]
    payload = path.read_bytes()
    assert len(payload) == cue["bytes"], name
    digest = hashlib.sha256(payload).hexdigest()
    assert digest == cue["sha256"], name
    assert digest not in hashes, f"duplicated cue: {name}"
    hashes.add(digest)
    total += len(payload)
    with wave.open(str(path), "rb") as wav:
        assert (wav.getnchannels(), wav.getsampwidth(), wav.getframerate(), wav.getcomptype()) == (2, 2, 44100, "NONE"), name
        duration = wav.getnframes() / 44100
        assert abs(duration - cue["seconds"]) < 0.000001, name
        assert 0.12 <= duration <= 4, name
        pcm = array("h", wav.readframes(wav.getnframes()))
    if sys.byteorder != "little":
        pcm.byteswap()
    assert tuple(pcm[:2]) == (0, 0) and tuple(pcm[-2:]) == (0, 0), f"unfaded edge: {name}"
    peak = max(abs(v) for v in pcm) / 32768
    rms = math.sqrt(sum((v / 32768) ** 2 for v in pcm) / len(pcm))
    peak_db, rms_db = 20 * math.log10(peak), 20 * math.log10(rms)
    assert 0.15 < peak <= 0.8, f"peak/headroom: {name}"
    assert -38 < rms_db < -8, f"RMS/silence: {name}"
    assert abs(peak_db - cue["peakDbFS"]) < 0.001, name
    assert abs(rms_db - cue["rmsDbFS"]) < 0.001, name
    assert max(abs(v) for v in pcm[-88:]) < 0.015 * 32768, f"nonquiet tail: {name}"
    for channel in (pcm[::2], pcm[1::2]):
        assert abs(sum(channel) / len(channel) / 32768) < 0.003, f"DC offset: {name}"
    peaks.append(peak_db)
assert total == manifest["totalBytes"]
durations = [manifest["cues"][f"award-{tier}"]["seconds"] for tier in range(1, 5)]
assert durations == sorted(set(durations)), "award tiers must have distinct increasing phrases"
print(json.dumps({"ok": True, "cues": len(hashes), "bytes": total, "sampleRate": 44100,
                  "stereo": True, "bits": 16, "maxPeakDbFS": round(max(peaks), 3),
                  "fadedEdges": True, "hashesMatched": True, "awardSeconds": durations}))
