# v255 — ストリーミング版とダウンロード版

ゲームを開くと、ストリーミング版とダウンロード版を選べます。ストリーミング版は共有抽選機の映像・番号を受け取りながら進みます。ダウンロード版はサーバーが先に抽選とゲームを計算し、端末が受け取った記録を再生します。

ダウンロード版のルーレットは、サーバーで計算した球・装置の位置と抽選時刻を保存した記録から描画します。記録には実際の物理計算を使い、MP4 ファイルの生成は必須にしていません。端末が新しい抽選結果を作る構成ではありません。

## Windows でダウンロード版サーバーを起動

Node.js 20 以上と、既存の Named Tunnel 設定を使います。リポジトリを更新したあと、次のファイルをダブルクリックします。

    start-download-server.cmd

この起動方法は版の選択を追加で尋ねません。Node.js が録画処理を管理し、ルーレット用のブラウザウィンドウは開きません。管理画面も自動では開かず、必要なときに表示された管理 URL を開けます。

起動順序は次のとおりです。

1. Node.js と依存関係を確認します。Playwright が不足していれば、リポジトリの依存関係をインストールします。
2. SWEETS_SERVER_EDITION=download と SWEETS_DOWNLOAD_ENABLED=1 を設定してサーバーを起動します。
3. サーバーが管理するヘッドレス録画処理の準備を待ちます。
4. Named Tunnel または明示した Quick Tunnel 経由でも health を確認します。
5. DOWNLOAD SERVER READY と、プレイヤー URL・任意の管理 URL を表示します。

起動に使う PowerShell ウィンドウは開いたままにします。終了すると、このランチャーが起動した Node.js とその子プロセスを停止します。既に起動していた個人用 Edge / Chrome は終了対象にしません。

既存の起動ファイルはストリーミング版を標準にしています。

    start-shared-machine-tunnel.cmd

PowerShell から指定する場合は、次のように実行できます。

    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-shared-machine-v205.ps1 -Edition Download

-Port、-Machine、-PublicHost、-QuickTunnel は既存ランチャーと共通です。既存の -NoDownload は cloudflared 自動取得を止める設定で、ダウンロード版の選択には使いません。

## 録画ブラウザの準備

サーバーの録画処理は、Windows の Edge / Chrome、明示したブラウザ実行ファイル、または Playwright のインストール済み Chromium を利用します。ブラウザの選択と起動は Node.js の録画処理が行います。

使用する実行ファイルを指定する場合は、起動前に環境変数を設定します。

    $env:SWEETS_DOWNLOAD_BROWSER_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
    .\start-download-server.cmd

利用可能なブラウザがない環境では、リポジトリのフォルダーで次を実行してから再起動します。

    npm install --ignore-scripts --no-audit --no-fund
    npx playwright install chromium

HTTP サーバーが応答していても、録画処理が準備できていなければ READY にはなりません。起動エラーと .runtime のサーバーログで原因を確認してください。

## 管理画面

ダウンロード版の管理 URL には edition=download が付きます。

    http://127.0.0.1:3000/monitor.html?machine=public-01&adminToken=...&edition=download

この画面は物理抽選 host と旧精算用 iframe を起動しません。サーバーの health が Download 専用であると返した場合も、管理専用の表示になります。

ダウンロード版の欄では、次を確認できます。

- 録画処理の準備状態、処理中の録画数。
- プレイヤーの名前、サーバー保存済みの CREDIT。
- 録画の準備中・再生可能・失敗・完了の状態と BET / WIN。
- 保存された球数、再生時間、保存回数、更新日時。
- プレイヤー ID、アバター設定、ダウンロード版の累計成績とゲーム別成績。

一覧は管理用 API を読み取って更新します。管理 URL と管理トークンはプレイヤーに配布しません。プレイヤーにはランチャーが別途表示する PLAYER GAME URL を渡します。

## 記録、クレジット、再開

ダウンロードした記録は、サーバーで確定した BET とゲーム状態に結び付きます。CREDIT、プロフィール、成績、精算の確定値はサーバー側の記録を基準にします。再取得や再開で、新しい抽選や同じ WIN の二重加算を作らないことが検証対象です。

ダウンロード版のダンゴデビンゴは、サーバーが最初の 5 球の配置を自動で確定します。記録を受け取ったあとに配置を変えて精算結果を変える操作はありません。端末には確定済みの配置と抽選経過を再生します。

端末は取得済み記録と再生位置を保存し、通信が途切れたときも保存済みの再生を続けられるようにします。次の録画の準備やサーバーへの進行同期には通信が必要です。再接続時には同じ録画 ID と保存位置を照合します。

サーバーを更新するときは .runtime、.tools、data の保存内容を残してください。端末に保存した記録を削除した場合、未同期の再生位置も失われる可能性があります。

### 配信データの確認

記録のハッシュや署名を確認する場合も、サーバーの精算記録を基準にします。署名検証が成功することと、未消化の BET や二重精算を管理することは別の検証事項です。署名・ハッシュ処理には [Node.js 20 の crypto](https://nodejs.org/docs/latest-v20.x/api/crypto.html) と [Web Cryptography API](https://www.w3.org/TR/2017/REC-WebCryptoAPI-20170126/) の標準機能を利用できます。

Service Worker を利用するキャッシュは origin と scope ごとに管理します。GitHub Pages の /cookie-link/ と Named Tunnel の / は別の保存領域です。[Service Workers の仕様](https://w3c.github.io/ServiceWorker/)に従い、HTTPS または開発用 localhost で登録します。ゲーム API や管理トークン付き URL を静的アプリのキャッシュに含めません。

## 動作確認

GitHub Actions の Download v255 server recording and offline playback は main と feature/v255-download の関連変更で実行します。

| 検証 | 実行ファイル |
|---|---|
| Windows PowerShell 5.1 の構文・文字コード、起動版、ブラウザ抑止、録画未準備の拒否 | tests/download-v255-launcher.ps1 |
| プレイヤー所有権、残高、重複要求、再起動からの復元 | tests/download-v255-server.mjs |
| 物理抽選の再現性、記録の適用順序、再開位置 | tests/download-v255-recording.mjs、tests/recorded-round-v255.mjs |
| 実際の物理計算・ゲーム計算を行うヘッドレス録画 | tests/download-v255-compute.mjs |
| 版の選択、ダウンロード、通信切断中の再生、再開、管理画面 | tests/download-v255-browser.mjs |

ブラウザ検証は隔離したローカルサーバーで実行し、公開ゲームの BET や精算には触れません。画面・結果・診断は Actions artifact download-v255-verification に保存します。
