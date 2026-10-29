# 累計深度ボーナス層 — v13

v12の「各ゲーム10mごと」は廃止。盤面の各段の絶対深度 `depth + row` が100の倍数になる位置に、横7列×縦1段を生成する。底に見え始めた時点で配置し、カメラがその深度に到達するまで生成を遅らせない。

| 累計深度 | ケーキ | BET倍率 |
|---|---|---|
|100m|フルーツ|3|
|200m|フルーツ|5|
|300m|フルーツ|10|
|400m|フルーツ|20|
|500m|サファイア|30|
|600m|エメラルド|50|
|700m|トパーズ|75|
|800m|ルビー|100|
|900m|アメジスト|200|
|1000m|ダイヤ|300|
|1100m以降、100mごと|ダイヤ|300固定|

層ごとに独立したIDを持ち、他のケーキと結合しない。複数ドリルの同時HITでも1回のみ加算。既存仕様どおり落下後の着地消去でも獲得し、落下途中は消去しない。全消しアイテムによる消去はボーナスなし。処理済みの深度は次ゲーム・保存・復元でも維持し、再生成による重複獲得を防ぐ。保存形式v7はv2–v6の読み込みも受け付ける。

900mの背景をアメジスト、1000m以降をダイヤに変更。他の深度背景と18%パララックス・40mのクロスフェードは維持。

最初の配当獲得時に金色の「継続確定！」を演出し、当該ゲーム中は盤面とタブの深度付近に「継続確定」を表示。次ゲームの配当は独立に判定。

トロッコの15枠は初回5/4/3/2/1個の順に埋める。16個目以降は最古の枠を順番に置換。クレーンが到着するまでは元の鉱石を保持し、上限後の鉱石にも全てクレーン演出を行う。配当と獲得履歴は表示15個に制限しない。

## 生成画像とプロンプト

内蔵画像生成ツールを使用。洞窟は512×768、ケーキ素材は256×256のWebPとして配置。ケーキは8近傍オートタイル処理で外周・内部・接続面を生成し、横方向の接続面は共通の材質プロファイルにして継ぎ目を防ぐ。6種類それぞれの左右2接続をピクセル比較で検証する。

### `assets/canyon-cakes/sapphire.webp`

Use case: stylized-concept. Asset type: square front-facing 2D game autotile source texture. Create one exquisite luxury royal blue sapphire chocolate layer cake block for a Japanese fantasy mining arcade game. Orthographic straight-on view, a square cake face filling almost all the frame, no perspective side face, no plate, no scene, no text. Multiple delicate chocolate and cream layers, luminous royal blue sapphire crystal candy jewels embedded in glossy ganache, ornate edible gold filigree, rich realistic hand-painted confection texture. A thick flowing icing crown extends down over the upper quarter. Gems and ornate relief concentrated near center and topping; left and right outer 15 percent are simple matching continuous cake material so tiles can join horizontally into a seamless long cake stratum without individual outlines. Soft beveled outer corners but no drawn border or black lines. Entire square opaque cake texture, luxurious colorful polished arcade sprite, clear at small size.

### `assets/canyon-cakes/emerald.webp`

Use case: stylized-concept. Asset type: square front-facing 2D game autotile source texture. Create one exquisite luxury vivid green emerald chocolate layer cake block for a Japanese fantasy mining arcade game. Orthographic straight-on view, a square cake face filling almost all the frame, no perspective side face, no plate, no scene, no text. Multiple delicate chocolate and cream layers, luminous vivid green emerald crystal candy jewels embedded in glossy ganache, ornate edible gold filigree, rich realistic hand-painted confection texture. A thick flowing icing crown extends down over the upper quarter. Gems and ornate relief concentrated near center and topping; left and right outer 15 percent are simple matching continuous cake material so tiles can join horizontally into a seamless long cake stratum without individual outlines. Soft beveled outer corners but no drawn border or black lines. Entire square opaque cake texture, luxurious colorful polished arcade sprite, clear at small size.

### `assets/canyon-cakes/topaz.webp`

Use case: stylized-concept. Asset type: square front-facing 2D game autotile source texture. Create one exquisite luxury honey gold topaz chocolate layer cake block for a Japanese fantasy mining arcade game. Orthographic straight-on view, a square cake face filling almost all the frame, no perspective side face, no plate, no scene, no text. Multiple delicate chocolate and cream layers, luminous honey gold topaz crystal candy jewels embedded in glossy ganache, ornate edible gold filigree, rich realistic hand-painted confection texture. A thick flowing icing crown extends down over the upper quarter. Gems and ornate relief concentrated near center and topping; left and right outer 15 percent are simple matching continuous cake material so tiles can join horizontally into a seamless long cake stratum without individual outlines. Soft beveled outer corners but no drawn border or black lines. Entire square opaque cake texture, luxurious colorful polished arcade sprite, clear at small size.

### `assets/canyon-cakes/ruby.webp`

Use case: stylized-concept. Asset type: square front-facing 2D game autotile source texture. Create one exquisite luxury crimson red ruby chocolate layer cake block for a Japanese fantasy mining arcade game. Orthographic straight-on view, a square cake face filling almost all the frame, no perspective side face, no plate, no scene, no text. Multiple delicate chocolate and cream layers, luminous crimson red ruby crystal candy jewels embedded in glossy ganache, ornate edible gold filigree, rich realistic hand-painted confection texture. A thick flowing icing crown extends down over the upper quarter. Gems and ornate relief concentrated near center and topping; left and right outer 15 percent are simple matching continuous cake material so tiles can join horizontally into a seamless long cake stratum without individual outlines. Soft beveled outer corners but no drawn border or black lines. Entire square opaque cake texture, luxurious colorful polished arcade sprite, clear at small size.

### `assets/canyon-cakes/amethyst.webp`

Use case: stylized-concept. Asset type: square front-facing 2D game autotile source texture. Create one exquisite luxury violet purple amethyst chocolate layer cake block for a Japanese fantasy mining arcade game. Orthographic straight-on view, a square cake face filling almost all the frame, no perspective side face, no plate, no scene, no text. Multiple delicate chocolate and cream layers, luminous violet purple amethyst crystal candy jewels embedded in glossy ganache, ornate edible gold filigree, rich realistic hand-painted confection texture. A thick flowing icing crown extends down over the upper quarter. Gems and ornate relief concentrated near center and topping; left and right outer 15 percent are simple matching continuous cake material so tiles can join horizontally into a seamless long cake stratum without individual outlines. Soft beveled outer corners but no drawn border or black lines. Entire square opaque cake texture, luxurious colorful polished arcade sprite, clear at small size.

### `assets/canyon-cakes/diamond.webp`

Use case: stylized-concept. Asset type: square front-facing 2D game autotile source texture. Create one exquisite luxury iridescent translucent white diamond chocolate layer cake block for a Japanese fantasy mining arcade game. Orthographic straight-on view, a square cake face filling almost all the frame, no perspective side face, no plate, no scene, no text. Multiple delicate chocolate and cream layers, luminous iridescent translucent white diamond crystal candy jewels embedded in glossy ganache, ornate edible gold filigree, rich realistic hand-painted confection texture. A thick flowing icing crown extends down over the upper quarter. Gems and ornate relief concentrated near center and topping; left and right outer 15 percent are simple matching continuous cake material so tiles can join horizontally into a seamless long cake stratum without individual outlines. Soft beveled outer corners but no drawn border or black lines. Entire square opaque cake texture, luxurious colorful polished arcade sprite, clear at small size.

### `assets/canyon-depth/amethyst.webp`

Use case: stylized-concept. Create one polished raster background for a cute Japanese fantasy chocolate mining arcade game. Scene: amethyst chocolate cave interior, deep chocolate stone embedded with luminous violet purple amethyst crystals. Portrait composition, detailed sculpted chocolate formations along both sides, coherent gently receding rounded arch opening, atmospheric distant center kept spacious, quiet and lower contrast for a game board overlay. Hand-painted premium game art, tasteful glossy material, warm gold accents, soft volumetric light, no characters, no cart, no UI, no text, no numbers, no borders. One complete environment, not a collage. Foreground side walls, recessed unobstructed middle, frontal viewpoint. Full opaque background.

