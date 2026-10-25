"""Build local announcement clips; no runtime TTS service or browser speech ducking."""
from pathlib import Path
from urllib.request import urlopen
import array, hashlib, json, math, subprocess, tempfile, wave

OUT=Path('assets/audio/numbers');OUT.mkdir(parents=True,exist_ok=True)
REF='95e3a0b389be60d5c8fd0215684f82512cb81d36'
BASE=f'https://raw.githubusercontent.com/mmdagent-ex/example/{REF}/voice/mei/'
def download(name,sha):
    with urlopen(BASE+name,timeout=45) as r:b=r.read()
    actual=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
    assert actual==sha,(name,actual)
    return b
voice=download('mei_normal.htsvoice','edcb095075784ff19f072b8af8a491eeedaabd47')
license_bytes=download('COPYRIGHT.txt','1d9ecb2bac579e65db7871d0503e833f97d4c595')
(OUT/'LICENSE-Mei.txt').write_bytes(license_bytes)
dictionaries=list(Path('/var/lib/mecab/dic/open-jtalk').glob('*/sys.dic'))
assert dictionaries,'Open JTalk Japanese dictionary missing'
manifest={'voice':'HTS Voice Mei (Normal), MMDAgent Project Team','copyright':'Copyright (c) 2009-2013 Nagoya Institute of Technology, Department of Computer Science','license':'CC BY 3.0','source':BASE,'voice_git_blob':'edcb095075784ff19f072b8af8a491eeedaabd47','engine':'Open JTalk','changes':'Synthetic numbered phrases; speed 1.12; pitch +1 semitone; trimmed external silence; constant per-clip gain; mono 24 kHz PCM','clips':[]}
with tempfile.TemporaryDirectory() as d:
    d=Path(d);model=d/'mei.htsvoice';model.write_bytes(voice)
    for n in range(1,26):
        text=f'{n}番です。';txt=d/'text.txt';txt.write_text(text,encoding='utf-8');wav=d/'voice.wav';resampled=d/'mono.wav'
        subprocess.run(['open_jtalk','-x',str(dictionaries[0].parent),'-m',str(model),'-r','1.12','-fm','1.0','-ow',str(wav),str(txt)],check=True)
        subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(wav),'-ar','24000','-ac','1','-c:a','pcm_s16le',str(resampled)],check=True)
        with wave.open(str(resampled),'rb') as w:
            rate=w.getframerate();samples=array.array('h',w.readframes(w.getnframes()))
        active=[i for i,x in enumerate(samples) if abs(x)>100];assert active,text
        first=max(0,active[0]-int(rate*.015));last=min(len(samples),active[-1]+int(rate*.08))
        samples=samples[first:last];peak=max(abs(x) for x in samples);rms=math.sqrt(sum(x*x for x in samples)/len(samples))
        gain=min(32767*.84/peak,32767*.14/max(1,rms))
        samples=array.array('h',(round(x*gain) for x in samples));duration=len(samples)/rate
        assert .45<duration<2.5,(n,duration)
        file=OUT/f'{n:02}.wav'
        with wave.open(str(file),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(samples.tobytes())
        data=file.read_bytes();manifest['clips'].append({'number':n,'text':text,'file':file.name,'duration':round(duration,4),'sha256':hashlib.sha256(data).hexdigest(),'peak':round(max(abs(x) for x in samples)/32768,5)})
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
Path('docs/NUMBER_VOICE_CREDITS.html').write_text('''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>番号音声のクレジット</title><body style="font:16px/1.7 system-ui;max-width:48em;margin:2em auto;padding:1em"><h1>番号音声のクレジット</h1><p>「1番です」〜「25番です」は Open JTalk と HTS Voice “Mei” (Normal) による合成音声です。</p><p>HTS Voice “Mei”, released by MMDAgent Project Team.<br>Copyright (c) 2009–2013 Nagoya Institute of Technology, Department of Computer Science.</p><p><a href="https://creativecommons.org/licenses/by/3.0/">Creative Commons Attribution 3.0</a>。生成した番号音声も同ライセンスで提供します。</p><p>変更内容：番号文の合成、話速・音高の調整、前後の無音除去、音量調整、24 kHzモノラルWAVへの変換。</p><p><a href="https://github.com/mmdagent-ex/example/tree/95e3a0b389be60d5c8fd0215684f82512cb81d36/voice/mei">音声モデルの配布元</a> · <a href="../assets/audio/numbers/LICENSE-Mei.txt">原著作権表示</a></p><p>音声モデルの提供者による本ゲームの推奨・公認を意味しません。既存のBGM・効果音にはこのライセンスは適用されません。</p><p><a href="../">ゲームに戻る</a></p></body></html>''',encoding='utf-8')
print('NUMBER_CLIPS_READY',len(manifest['clips']),sum((OUT/c['file']).stat().st_size for c in manifest['clips']))
print('CLIP_DURATIONS',[(c['number'],c['duration']) for c in manifest['clips']])
