# 小盤面・ロゴ・ドロップ速度の更新

- クッキーリンク: 簡易色矩形を廃止。本盤面と同じSVG素材・数字・ハンマー・シュガーを640pxの描画面に描き、小盤面へ縮小転写。選択中のタブも盤面表示。HIT点滅・落下・亀裂も反映。
- チョコレートキャニオン: マスと溶解等を透明レイヤーに一度描画し、本盤面と小盤面で共有。小盤面には背景・計器を描かず7列12段のみ表示。BETデモも背景なしの例示部分を縮小。深度表示はシュガーの3px上。
- シックスドロップ: 補充の行間隔200→130ms、飛行620→450ms、着地200→120ms。落下後から消去予告まで180→50ms。落下・点滅を省略せず、早送りも維持。
- ロゴ: 画像生成（組み込みimage_gen）で文字主体の透明ロゴを制作。透過維持でWebP化。
  - `assets/canyon-title-v2.webp`
  - `assets/six-drop-title-v2.webp`

## 生成プロンプト

共通:
> Use case: logo-brand. Create a lavish handcrafted Japanese arcade medal game title logo as a transparent PNG asset, wide compact composition. Main text exactly [Japanese title] and a small subordinate English subtitle [English title]. [Material specification]. Typography must dominate 90 percent of the occupied area: very large thick legible Japanese characters, strong clear silhouette readable when reduced to 130 pixels wide, tight spacing. For Chocolate Canyon arrange Japanese in two balanced lines, for Six Drop one strong line. Intricate polished dimensional confectionery finish inside the letterforms, crisp highlights and an outer pale cream sticker rim. Decorations are tiny accents attached to letters, never a background scene. Absolutely no landscape, buildings, big candy backdrop, plaque, rectangular panel, characters, extra wording, watermark. Real transparent background, close crop with small safe margin. Original premium amusement game logo.

キャニオン:
- Japanese title: チョコレート（改行）キャニオン
- English title: CHOCOLATE CANYON
- Material specification: warm ivory and caramel lettering with thick dark cocoa outlines, golden beveled edges, a few tiny jewel chips and chocolate drips

シックス:
- Japanese title: シックスドロップ
- English title: SIX DROP
- Material specification: luminous pastel rainbow candy lettering with thick deep plum outlines, pearly bevels and a few tiny shiny round candy drops

## キャニオン20秒デモ

実際の素材による7列×8段の簡易盤面を使用し、5秒×4場面で表示。
1. Lv.1〜5を並列表示し、1〜5地層を連続掘削。終了後LvUP（Lv.5はMAX）。
2. ケーキ内の鉱石を露出させ、真上を空けてクレーン回収→GET・継続確定。
3. 全消し（鉱石は残る）、3セクション消去、1セクション鉱石化、鉱石ランクアップを並列で紹介。
4. 98→100mで横7列×1段のボーナスケーキが登場し、掘削→3倍のBET換算WIN表示。

本番盤面・乱数・配当は変更しない独立した描画。小盤面も同じ透明レイヤーを縮小使用。
