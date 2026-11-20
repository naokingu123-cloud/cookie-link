# v281 — カジノ系の効果音と10ゲーム別のファンファーレ

2026-11-20。先行するシックスドロップ修正に加え、ユーザー指定の「より激しいカジノ系の効果音」を各ゲームとシチュエーションへ組み込んだ。改修前の音声経路と弱さの分析は [監査記録](audio-audit-v281.md)。

## 実装

新音源は97種類、24,110,208 bytes、44.1kHz・16bit・ステレオWAV。実際のコイン・カジノチップ・カードの動作音と、独自の明るいブラス、ベル、上昇アルペジオ、低音インパクト、ドラムロールを事前合成する。複数の楽器が一つのWAVとなるため、成立時に多数の音声voiceを追加しない。

通常のHITは0.30〜0.435秒、連鎖は0.62秒。通常役／高額／超高額／全消し・最高役のフレーズを1.16／1.86／2.48／3.06秒に分け、長さだけでなく、リズム、和音、ロール、払い出し音の密度を増やした。JPは専用の3.96秒のクライマックス。ゲームの進行待ち時間は延長していない。

|ゲーム|固有のHIT・連鎖・成立音の方向|
|---|---|
|クッキーリンク|暖かいマレット、クッキーのアタック、チップが積み上がる音|
|チョコレートキャニオン|低めのブラス、掘削の重いインパクト、硬いチップ|
|シックスドロップ|透明なキャンディベル、コインのきらめき、速いアルペジオ|
|ジェラートプリズム|高いクリスタル音、広がる氷のきらめき|
|ワイナリーピラミッド|瓶の丸いポップ音、低めの明るいブラス|
|ポップコーンスプラッシュ|短く強いポップ、弾けるリズム、チップの連打|
|ジェリービンゴ|弾力のある液体のピン音、上昇する短いフレーズ|
|ワッフルリバーシ|乾いたチップ音、歯切れのよいマレット、連続反転の音階|
|パーティカステラ|暖かいアタック、焼ける粒感、金色のブラス|
|ダンゴデビンゴ|弾む短い弦の音、明るい五音音階のきらめき|

10ゲームに固有HIT10種、固有連鎖10種、4段階×10ゲームの成立音40種を割り当てた。共通の動作音・リーチ・カウンター等も新しい素材の混合へ更新した。個別ゲームにその種類のイベントが存在するとき、既存の実イベント境界で鳴る。ゲームへ新しい判定や架空の成立を追加する仕組みではない。

倍率リールは専用の短い機械的なtick。倍率確定は通常／5倍以上／10倍の3段階。JPC権利獲得、JPCの24/25リーチ、JP獲得にそれぞれ別の音を使用する。通常リーチの未解決和音と、実際に成立したファンファーレを区別する。

## 音量と動作

新WAVの最大peakは−2.048dBFS（約0.79）。ゲーム別を含む成立音のtier平均RMSは−15.93／−14.40／−13.63／−12.62dBFS。元の低い出力上限を上げず、事前合成とクレストファクターの調整で上位ほど密度を増やした。高いHIT音のregisterを長いファンファーレへそのまま延長せず、旋律は下のoctaveへ戻している。

HITとゲーム別連鎖のみ、旧sceneの強い前段減衰に対する1.35倍の限定補正を使用する。非awardの最終voice gain上限は0.9。全音共通のcompressor、tanh出力上限、BGMの音源・通常音量・フェード、番号読上げ音声は変更しない。

- 共通AudioContextと8voice上限、award同時1つ、高tier優先を維持。
- 選択ゲームだけを鳴らし、ゲーム切替・新round・mute・pause・menu・hidden・pagehideで音と保留を停止。
- 一意な成立key、旧scene/tickerの抑止、Sugar復元snapshotの基準化により重複再生を防ぐ。
- trusted gestureによるモバイル音声解錠を維持。計算用workerは音源ロードも再生もしない。
- ゲームRNG、入賞、配当、ルール、精算、演出待ち時間は変更しない。

既存のAPI名 `SweetsAudioV277` は互換性のため維持し、`describe().version` は281、`soundBank` は `assets/audio/casino-v281/`。新bankを読み込めない場合は同じイベントとvoice所有権のまま元v277の対応音へfallbackする。元41音を変更・削除していない。fallback発生数は `fallbackLoads` に記録する。

### v282の初回ロード補正

公開v281の [CI run 44756910214](https://github.com/naokingu123-cloud/cookie-link/actions/runs/44756910214) では、15ブラウザーケース中13件が成功した。最初のcookieとcandyのみ、最初の並列ロード6音が旧bankへfallbackし、通常公開ではfallbackを不要とする検査に失敗した。後続ケースは97音decode・fallback0・音声error0だった。元のloaderが最初の例外を捨てていたため、原因は確定できない。初期の重い読み込みにhostの8秒fetch期限が重なった可能性があるという推定に留める。

v282では、primary bankの失敗時だけ一度再試行し、最大2回の試行後に従来のfallbackへ移る。明確なHTTP 404/410は再試行せず直ちにfallbackする。4worker上限、既存hostの8秒期限とdecode cache、音声再生・mute/pause・award所有権は変えない。`primaryRetries` と `lastEvents` のretry/fallback記録に、対象sample・試行回数・最初と最後の例外名／メッセージを保存する。新WAVの内容は変えない。

単体fixtureでは、初回6音のAbortErrorからprimary再試行で97音すべて復帰しfallback0になること、404/410のprimary試行が各1回で旧音へ移ること、継続するAbortErrorでもprimary最大2回・legacy1回に収まること、再ロード自体が音を鳴らさないことを検証した。通常公開のfallback0検査は維持する。

## 実素材・ライセンス

公式配布から取得した原音9点を [sources](../assets/audio/casino-v281/sources/) に未変更で保存した。Kenneyの同梱License.txt、SoundBibleの対象素材の権利表示、原音のSHA-256・byte数・取得元・作者を [出典記録](../assets/audio/casino-v281/sources/provenance.json) に残す。

|提供元|素材|権利表示・使用|
|---|---|---|
|[Kenney Casino Audio](https://kenney.nl/assets/casino-audio)|チップ配置・衝突・積上げ・扱う音、ダイス、カードshuffleの7点|同梱のCC0。商用利用・変更・再配布可、クレジット任意|
|[Kenney Music Jingles](https://kenney.nl/assets/music-jingles)|Hit JinglesのHIT03|同梱のCC0。短いアタック部分を低いレベルで重ねる|
|[SoundBible Coin Drop](https://soundbible.com/2081-Coin-Drop.html)|Willem HuntのCoin Drop|この素材ページのPublic Domain表示。コイン音を区間ごとに切り出し、speed/pitch/panを変えて使用|

クレジットは任意の素材でも作者と出典を保持している。原音はgenerator内でffmpegにより44.1kHz monoへdecode、先頭無音を除去、DC除去、level調整を行う。その後、必要区間を切り出してspeed/pitch、fade、panを付け、独自合成のフレーズへ混合する。実際に使った原音ID、区間、再生速度、配置時刻、gain、panを各cueの `sourceLayers` に記録している。

## 再生成・検証

生成スクリプトは [generate-casino-audio-v281.py](../scripts/generate-casino-audio-v281.py)。numpyとffmpegを使用し、保存済みの原音だけで再生成する。外部接続は不要。合成用の固定seedはゲームRNGと独立している。元v277の音色bufferをメモリー内で参照するが、旧WAVへ書き込まない。

```bash
python3 scripts/generate-casino-audio-v281.py
node tests/celebration-audio-v277.mjs
python3 tests/celebration-audio-v277.py
```

音声JS単体では、55scene経路、97音のpreload、全10HIT・10連鎖・40成立音、倍率3段階、JPC／JPの実transitionと重複抑止、旧bank fallbackを確認した。さらに従来の8voice・award所有権・mute/pause・古いround/選択の破棄・復元時無音・trusted unlock・worker無音を確認し、すべて成功した。

PCM検査は旧41音のhash不変と新97音を両方検査する。形式・全出力／原音hash・重複fileなし・最大peak・RMS・始終端fade・DC offset・区間の実在・10ゲームの全tierと順序を確認した。原音9点すべてが生成cueへ実際に混合されていることも確認した。

## 最終公開版での確認

新音源は最終ビルド `20261120-v282-sixdrop-compact-long-amounts`、runtime commit `7d81f7440eb73fb046f5a59b51f6f2d83b6508c1` に含まれる。[最終 CI 44759129889](https://github.com/naokingu123-cloud/cookie-link/actions/runs/44759129889) は音声・PCM・契約、実 Chromium 3 shard、公開照合の全5 jobが成功した。

- 実ブラウザー15/15ケースで、新97音をすべてdecode、旧bankへのfallback 0、音声error 0。10ゲーム、390px、動きを減らす設定、mute、非選択mini、pauseを含む。
- 選択・非muteの13ケースでは、本物の役成立イベントのkey・game・tierと専用音源が一致し、各イベントにつき1回だけ開始した。mute・非選択miniの2ケースはaward開始0。復元時は全ケースでaward再生0。
- pause後はactive voiceとpending awardがともに0。同時voiceの観測最大は5で、上限8以内だった。
- chocoの初回だけ6音で `AbortError: signal is aborted without reason` を記録した。各音を一度再試行して97音すべて新bankから取得し、fallback 0で回復した。他14ケースはretry 0。初回v281では失われていた例外と回復経路を、この検証では実際に取得できた。Abortの背景にある負荷の要因までは計測していない。
- 公開先の175/175ファイルでbytes・SHA-256が一致。新97音、旧41音、原音9点、ライセンス・出典、関連runtime・画像を含む。完了は2026-11-21 00:07:33 JST。

原本対応・ZIP digest照合・3本の全ケースreportの可逆圧縮は [音声検証記録](qa-v282/audio/manifest.json)、集計は [CI summary](qa-v282/audio/ci-summary-v282.json)、公開照合は [public report](qa-v282/audio/public-report.json) に保存した。初回v281の2失敗を含む履歴は [初回記録](qa-v281/verification-summary.json) に残す。

これらは仮CREDITの隔離環境で、実ルールの保存状態と実際の番号入力を使った検証である。Windows稼働サーバーの更新・再起動と、実機スピーカーの聴感確認は未実施。
