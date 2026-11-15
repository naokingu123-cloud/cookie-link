# SWEETS LINK 共有抽選機 — Windows＋Cloudflare Quick Tunnel

この構成では、Windows PCは**ゲームを実行しません**。Node.jsの共有サーバーだけを起動し、サーバーが重複なしの8球の抽選結果を管理・配信します。

プレイヤー端末だけがSWEETS LINKの各ゲームを実行し、サーバーから届いた番号を自分の盤面へ反映します。

## 起動

リポジトリを展開して、ルートの次のファイルをダブルクリックします。

```text
start-shared-machine-tunnel.cmd
```

初回はNode.js依存関係とcloudflaredを準備し、その後、

1. 共有サーバー
2. Cloudflare Quick Tunnel
3. サーバー専用モニター

を起動します。

サーバーPCではゲーム画面ではなく、次のようなローカル管理画面だけが開きます。

```text
http://127.0.0.1:3000/monitor.html?machine=public-01&adminToken=...
```

プレイヤーへ渡す標準URLは、Cloudflare Quick Tunnel自身からゲームを開く同一オリジンURLです。

```text
https://xxxxx.trycloudflare.com/?machine=public-01
```

ランチャーはこの公開URLの `/api/health` が外部から実際に応答するまでREADYにしません。ゲーム・API・WebSocketがすべて同じ `trycloudflare.com` になるため、このURLを標準で使用してください。プレイヤーURLはクリップボードにもコピーされます。

GitHub Pages版は代替URLとして表示しますが、標準接続には上記Direct Tunnel URLを使います。

## 抽選方式

オンライン時、プレイヤー端末はローカルルーレットを開始しません。

共有サーバーがラウンドごとに1〜25から重複なしの8番号を管理し、順番にWebSocketで全プレイヤーへ配信します。

```text
Server
  1球目 -> 17
  2球目 -> 5
  3球目 -> 21
       |
       +--> Player A game
       +--> Player B game
       +--> Player C game
```

ゲームロジック・演出・盤面描画は各プレイヤー端末で動作します。サーバー側では各ゲームエンジンを起動しません。

各球は、接続中プレイヤーのチェックポイント保存を待ってから次へ進みます。一定時間応答しない端末がある場合はタイムアウト後に進行します。

## サーバーモニター

サーバーPCの管理画面では次を監視できます。

- 25番号の抽選盤
- 1〜8球目の確定番号
- 現在ラウンド番号
- 接続中プレイヤー数
- プレイヤー名
- BET
- 現在クレジット
- 今回のROUND WIN
- 何球目まで保存済みか
- PLAYING / SETTLED
- 接続 / 切断状態

サーバーへ接続しているがまだBETしていないプレイヤーも一覧に表示します。

## リセット・再接続対策

サーバーは次を保存します。

- ラウンドID
- 8球の確定順
- プレイヤーごとのBET
- 各球終了後のゲームチェックポイント
- クレジット
- ROUND WIN
- 精算済み状態

保存先:

```text
.runtime\shared-machine.json
```

ブラウザーを更新または終了して再接続した場合、保存済みの球までは再抽選せず、同じラウンドから復元できます。

精算は `roundId + playerId` で一意に管理するため、同じ精算要求が複数回来ても最初の精算だけが有効です。

## サーバーPCを閉じた場合

起動したPowerShellウィンドウを閉じると共有サーバーとQuick Tunnelは停止します。

`.runtime\shared-machine.json` が残っていれば、次回起動時に保存済み状態を読み込みます。ただしQuick Tunnelの公開URLは起動ごとに変わります。

## 別ルーム

```bat
start-shared-machine-tunnel.cmd -Machine room-02
```

異なる`machine`名は別の抽選機として管理されます。

## 現在の実装範囲

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
