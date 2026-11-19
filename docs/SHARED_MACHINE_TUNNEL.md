# SWEETS LINK 共有サーバー — Windows と Named Tunnel

Windows PC は Node.js の共有サーバーを起動し、プレイヤーのクレジット、プロフィール、ラウンドを保存します。起動方法にはストリーミング版とダウンロード版があります。

| 起動ファイル | サーバー側の動作 |
|---|---|
| start-shared-machine-tunnel.cmd | ストリーミング版。管理画面内の物理抽選機を起動し、映像と番号を配信します。 |
| start-download-server.cmd | ダウンロード版。Node.js がヘッドレスの録画処理を管理します。ルーレットのブラウザウィンドウは開きません。 |

ダウンロード版の準備、ブラウザの指定、再生・再開、検証は [v255 ダウンロード版](download-v255.md) を参照してください。

## 起動

Node.js 20 以上を用意し、リポジトリを展開して起動ファイルをダブルクリックします。初回は依存関係と cloudflared を準備し、Named Tunnel の設定がなければ setup-named-tunnel.cmd を実行します。

標準は固定ホスト名を持つ Named Tunnel です。公開ホスト名は .runtime の設定から読み込みます。設定ファイルがなければ shared-endpoint.json から回復を試みます。

ランチャーはサーバーの /api/health と公開 tunnel の到達性を確認してから、次を表示します。

- PLAYER GAME URL：プレイヤーに渡す URL。クリップボードにもコピーします。
- SERVER MANAGEMENT：管理トークンを含む管理用 URL。
- Local monitor fallback：この PC で使うローカル管理 URL。

管理 URL と管理トークンはプレイヤーに渡さないでください。Named Tunnel のプレイヤー URL は固定で、通常はパラメーターの手入力が不要です。

-QuickTunnel を指定した場合は一時 URL を利用します。起動し直すと URL が変わるため、毎回ランチャーに表示された PLAYER GAME URL を使ってください。

## ストリーミング版の抽選

サーバー PC の管理画面は、物理抽選用の host iframe を1つ保持します。物理計算で確定した8球の番号を共有サーバーへ送り、サーバーがプレイヤーへ配信します。プレイヤー端末は共有番号を各ゲームの盤面へ反映し、ルーレットはサーバーからの映像を表示します。

ホストが接続していない間は、物理抽選を待ちます。管理画面にはホストの接続状態とラウンドの進行を表示します。

## ダウンロード版の抽選

ダウンロード版はサーバーが抽選とゲームを事前計算し、記録を端末へ渡します。Node.js が計算用ブラウザをヘッドレスで管理します。録画処理が準備できていなければランチャーは READY を表示しません。

管理画面は任意で開けます。edition=download が付いた管理 URL は物理抽選 host と旧精算用 iframe を起動せず、録画状態・保存済み CREDIT・成績・再生位置を表示します。

## 管理画面と保存

管理画面ではプレイヤーごとの BET、WIN、CREDIT、P/O 設定、進行を確認します。ダウンロード版の欄では録画の準備状況、プロフィール、成績、保存位置を確認できます。

サーバー状態は .runtime と data の保存先に残します。ソースを更新するときは .runtime、.tools、data を削除しないでください。再接続時の残高と精算状態はサーバーの保存値に従います。

ダウンロード版の再開は同じ録画 ID と保存位置を使います。再取得や再開で BET や WIN を二重に計上しないことを専用テストで確認します。

## サーバーを停止するとき

起動用 PowerShell ウィンドウを終了すると共有サーバーを停止します。Quick Tunnel を同時に起動した場合は、そのプロセスも停止します。Named Tunnel の Windows サービス自体は残ります。

ダウンロード版の終了処理は、このランチャーが起動した Node.js とその子プロセスを対象にします。別に開いている個人用の Edge / Chrome は対象にしません。

## 別ルーム

PowerShell の -Machine でルーム名を指定できます。利用可能な文字は英数字、アンダースコア、ハイフン、長さは1〜64文字です。

    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-shared-machine-v205.ps1 -Machine room-02

## 過去の変更記録

以下は初期バージョンの記録です。現在の起動手順と構成は上記、および v255 の説明に従ってください。

## 初期版の実装範囲（当時の記録）

サーバーが権威的に管理するもの:

- 抽選番号と順番
- ラウンド進行
- 接続プレイヤー
- BET情報
- チェックポイント
- クレジット/ROUND WINの監視値
- 精算の一意性

各ゲームの配当計算そのものは、まだプレイヤー端末の既存ゲームエンジンで行います。

したがって通常のリロード・再接続・再抽選・二重精算対策には使えますが、改造クライアントによる不正を完全に防ぐには、将来的に配当計算とクレジット台帳もサーバー側へ移す必要があります。


## v183 接続・リセット保護

- クライアントはWebSocketが実際にOPENになるまで接続成功扱いにしません。
- Cloudflare経由のhealth/session/WebSocketには長めのタイムアウトと自動再試行を使用します。
- サーバー未接続時は「すぐ開始」を無効化し「SERVER待機」と表示します。
- 接続失敗画面には実際の接続先SERVER URLを表示します。
- 即リセット時は現在の共有ラウンドからleaveし、その旧ラウンドの残り球を再受信・再加算しません。


## v184 サーバー管理URL

- `https://xxxxx.trycloudflare.com/?machine=public-01&adminToken=...` はサーバーPC側で開く管理画面です。
- この管理画面に現行3D物理抽選機、接続プレイヤー、BET、CREDIT、ROUND WIN、8球結果をまとめて表示します。
- プレイヤー端末へ渡すのは GitHub Pages + `sharedServer=https://xxxxx.trycloudflare.com` のクライアントURLです。
- ランチャーはサーバー管理URLを自動でサーバーPCに開き、クライアントURLをクリップボードへコピーします。


## v185 クライアント自動接続

- クライアント側は通常のゲームURL `https://naokingu123-cloud.github.io/cookie-link/` を開くだけで接続します。
- `sharedServer=` パラメータは通常不要です。
- サーバー起動時、ランチャーが現在の Quick Tunnel URL を `shared-endpoint.json` へ書き込み、`main` へ自動pushします。
- ランチャーは GitHub Pages 上の `shared-endpoint.json` が現在のTunnel URLへ更新されたことを確認してからREADY表示します。
- クライアントはゲーム起動時に `shared-endpoint.json` を読み、現在のサーバーURLを自動取得します。
- サーバー側は従来どおり `trycloudflare.com/?machine=...&adminToken=...` の管理画面を使用します。
- この自動公開には、サーバーPC上のリポジトリがGit cloneであり、`origin/main` へpushできるGit認証が必要です。


## v186 ZIP展開版

- ZIP展開した `cookie-link-main` でもランチャーは停止しません。
- Git clone / pushが利用できない場合、`shared-endpoint.json` の自動公開だけをスキップし、Nodeサーバー、Quick Tunnel、サーバー管理画面は起動を継続します。
- Git公開できる環境では通常ゲームURLだけでの自動発見を使用します。
- ZIP環境かつQuick Tunnelではホスト名が毎回変わるため、完全なゼロ設定自動発見には固定ホスト名（Named Tunnel等）または公開可能なランデブー先が必要です。


## v187 Named Tunnel fixed-host mode

Named Tunnel is now the default launcher mode.

One-time Cloudflare setup:
1. In Cloudflare Dashboard, go to Networking > Tunnels and create a remotely-managed tunnel.
2. Add a Published application with a fixed public hostname such as `sweets.example.com`.
3. Set its Service URL to `http://localhost:3000`.
4. Copy the tunnel token from the cloudflared run/install command.
5. Run `setup-named-tunnel.cmd` once and enter the fixed hostname and token.

After that:
- Run `start-shared-machine-tunnel.cmd`.
- The launcher runs `cloudflared tunnel run --token-file ...` using the saved token.
- Player URL is the fixed hostname itself, for example `https://sweets.example.com/`.
- Player devices only open that game URL. No `sharedServer` parameter is needed.
- Server management uses the same fixed hostname with an admin token in the query string and is opened automatically on the server PC.
- The physical roulette remains server-authoritative and player devices never run a local 8-ball result source.

The token and hostname are stored under `.runtime`, which is ignored by Git.
Quick Tunnel remains available only as an explicit temporary fallback with `-QuickTunnel`.


## v188 fixed Named Tunnel client discovery

- The active server discovery endpoint now points to `https://sweets.sweetslink-game.com`.
- GitHub Pages clients accept the fixed HTTPS Named Tunnel hostname, not only temporary `trycloudflare.com` hosts.
- Opening the normal client game URL can therefore connect automatically to the fixed Named Tunnel.
