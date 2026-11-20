# v281 音声改修前の監査

2026-11-20。v277を基準に、公開される音声経路とPCM情報を調査した。聴感の推測と実装上の事実を区別する。

## 基準実装

- `assets/celebration-audio-v277.js` が共通AudioContextで55の旧scene名を41種類の独自合成WAVへ接続している。
- `scripts/generate-celebration-audio-v277.py` がnumpyでbell/pluck/brass/impact/noise/sweepを合成。元41音は44.1kHz・16bit・stereo、6,461,572 bytes。
- 実ページの基底 `sceneSound` は `optimized/app-01.js` に含まれる。`assets/scene-audio.js`だけの変更は配信runtimeに反映されない。
- 全10ゲームの確定成立は `assets/award-presentation-v277.js` の実イベント→`SweetsAudioV277.award`。通常/3倍以上/10倍以上/最高役の4tierに同じ4WAVを使用していた。
- Sugar開始後の実入賞によるJPC獲得、倍率リール停止、JPCの24/25到達・JP獲得には専用の重複防止境界がある。

## ゲーム別の境界

|ゲーム|HIT・動作|確定した成立イベント|
|---|---|---|
|クッキー|cookie-hit、drop/land/refill、chain、hammer|link、allclear|
|キャニオン|drill、stratum、melt、ore、scroll、transform|canyonCollect、canyonBonus|
|シックス|six-hit、six-miss、refill、sweep|pyramidAward、pyramidAllClear|
|ジェラート|glass|gelatoFill|
|ワイナリー|glass、transfer、level/rank|wineryAward|
|ポップコーン|pop、color-burst、sweep、transform、chain|popcornDrawの配当増分。最終waveへ同期|
|ジェリー|glass、transfer、rank|jellyPour。ライン出現へ同期|
|ワッフル|landing、反転ごとのpay-step、drop/land|flippingの実配当増分。反転後へ同期|
|カステラ|cookie-hit、line|最終球のsettled。焼成後へ同期|
|ダンゴ|cookie-hit、FREE進化、line、land|実入賞またはFREE確定のsettled|

## 強化余地

設計が柔らかなベルと短いpluck中心で、実際の金属・コイン・チップのアタックがない。全ゲームが同じ4成立音を共有し、倍率5/10も通常倍率と同じ音。音色・フレーズ・段階の差を付ける余地がある。

旧sceneのceilingとhostのvolumeが乗算される。カステラ/ダンゴの通常HITは`.45 × .3 = .135`、連打はさらに減衰する。新WAVへ替えてもこの前段は残る。

SFX出力はgain1.35→compressor→tanh ceiling .28→output .34で、理論的な最大絶対値は約.0952。BGMは別経路で通常gain .15。単なるpeak引上げより、明確なアタック、倍音、短いリズム、コイン払い出し、階層差で改善する方針とする。

## 必ず保つ制御

共通AudioContext、8voice上限、award同時1つ、高tier優先、選択ゲーム限定、ゲームtokenと一意keyによる重複抑止、旧scene/tickerの成立音抑止、mute/pause/menu/hidden時停止、復元時無音、trusted gestureによる解錠、worker無音を保持する。BGM、番号音声、ゲームRNG・ルール・配当・待機時間は変更しない。

新音は事前に多層合成し、一つの成立を一つのWAVとして再生する。新sample名を追加する際はpreload集合も同時に更新する。元v277音源はネットワーク/キャッシュ不整合時のfallbackとして保持する。
