# SWEETS LINK 共有抽選機 — Windows＋Cloudflare Quick Tunnel

この方法では、1台のWindows PCを共有抽選サーバーとして使い、スマートフォン・タブレット・別PCから同じ抽選機へ接続します。

- Cloudflareアカウント・独自ドメイン・Replitは不要です。
- ルーターのポート開放は不要です。
- 抽選番号、途中盤面のチェックポイント、精算済み状態をサーバーPCへ保存します。
- 公開用URLは起動のたびに変わります。

> Quick Tunnelは試験・開発向けです。常設運用ではNamed TunnelやDurable Objectsへの移行を推奨します。

## 最短の起動方法

### 1. 必要なもの

Windows 10/11とNode.js 20以上が必要です。

Node.jsが未導入の場合は、Node.js公式サイトからLTS版をインストールしてください。

### 2. 起動

リポジトリのフォルダーにある次のファイルをダブルクリックします。

```text
start-shared-machine-tunnel.cmd
```

初回だけ自動で次を行います。

1. `npm install`でWebSocket依存関係を導入
2. Cloudflare公式GitHub Releasesから`cloudflared.exe`を`.tools`へ取得
3. ローカル共有サーバーを起動
4. Cloudflare Quick Tunnelを起動
5. 公開URLをブラウザーで開く
6. 公開URLをクリップボードへコピー

起動に成功すると、次のようなURLが表示されます。

```text
https://example-example.trycloudflare.com/?machine=public-01
```

このURLを、同じ抽選機を共有する端末で開いてください。

## 共有プレイの動作

- 同じ`machine`名の端末が同じ抽選機ルームへ参加します。
- 最初にそのラウンドへ参加した接続端末がHOSTとなり、実際のルーレットを動かします。
- HOSTで確定した入賞番号をサーバーが保存し、FOLLOW端末へWebSocketで配信します。
- FOLLOW端末は独自抽選を行わず、サーバーの番号を各自の盤面へ反映します。
- HOSTが切断された場合は、接続中の別端末へHOSTを移します。

右下の表示は次の意味です。

```text
共有抽選 HOST   : この端末が実抽選を担当
共有抽選 FOLLOW : 他端末の実抽選結果を受信
```

## リセット・再接続対策

各球の入賞後、サーバーは次を保存します。

- ラウンドID
- 確定済みの球番号と順番
- プレイヤーごとのBET情報
- 最後に保存されたゲーム盤面
- 何球目まで処理したか
- 精算済みかどうか

ブラウザーを更新・終了しても、同じ端末で再度URLを開くと「共有ラウンド復元」が表示されます。保存済みの球までは再抽選せず、その続きから進行します。

精算にはラウンドIDとプレイヤーIDを組み合わせた一意の記録を使います。同じ精算要求が複数回来ても、サーバーに保存された最初の精算結果だけを返します。

サーバーPC側の保存先は次です。

```text
.runtime/shared-machine.json
```

同じフォルダーを残したまま再起動すれば、サーバーPCを再起動した後も保存データを読み込めます。

## 終了方法

起動した黒または青のPowerShellウィンドウを閉じるか、`Ctrl+C`を押します。

終了するとQuick Tunnelも停止し、公開URLには接続できなくなります。次回起動時には別の`trycloudflare.com` URLが発行されます。

## 別の抽選機ルームを使う

コマンドプロンプトから次のように起動できます。

```bat
start-shared-machine-tunnel.cmd -Machine room-02
```

公開URLは次のようになります。

```text
https://xxxxx.trycloudflare.com/?machine=room-02
```

異なる`machine`名は別の抽選機として管理されます。

## ブラウザーを自動で開かない

```bat
start-shared-machine-tunnel.cmd -NoBrowser
```

## メール認証を付ける

Cloudflare Quick Tunnelが対応している環境では、許可するメールアドレスを指定できます。

```bat
start-shared-machine-tunnel.cmd -AllowedEmail player@example.com
```

複数指定する場合はPowerShellから実行してください。

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-shared-machine-tunnel.ps1 `
  -AllowedEmail player1@example.com,player2@example.com
```

## ローカルだけで確認する

公開せず同じPCだけで試す場合は、リポジトリのフォルダーで次を実行します。

```bat
npm install
npm start
```

ブラウザーで次を開きます。

```text
http://localhost:3000/?machine=public-01
```

同じWi-Fi内だけで試す場合は、Windowsファイアウォールを適切に設定したうえで、サーバーPCのローカルIPを使えます。

```text
http://192.168.x.x:3000/?machine=public-01
```

通常はポート開放が不要なCloudflare Tunnel方式を推奨します。

## トラブルシューティング

### Node.js 20以上が必要と表示される

Node.js LTS版を導入し、コマンドプロンプトで次を確認します。

```bat
node --version
npm --version
```

### Quick TunnelのURLが表示されない

ログは次に保存されます。

```text
.runtime/cloudflared.err.log
.runtime/cloudflared.out.log
.runtime/shared-server.err.log
.runtime/shared-server.out.log
```

`%USERPROFILE%\.cloudflared\config.yml`または`config.yaml`が存在すると、Quick Tunnelが失敗する場合があります。その場合は設定ファイルを一時的に別名へ変更してから再実行してください。

### Windows Defenderの確認が出る

Node.jsについてネットワークアクセスの確認が出た場合、使用するネットワークに合わせて許可してください。Cloudflare Tunnel自体は外向き接続を使うため、ルーター側の受信ポート開放は不要です。

### 端末同士で番号が合わない

1. すべての端末で同じ公開URLと同じ`machine`名を使用しているか確認します。
2. 右下がHOST/FOLLOWのどちらかになっているか確認します。
3. 古いタブを完全に閉じ、新しい公開URLから開き直します。
4. HOST端末を1台だけ残して試します。

## 現在の実装範囲

現在サーバーが権威的に管理しているものは、共有抽選番号、順番、チェックポイント、参加情報、精算の一意性です。

各ゲームの配当計算そのものは、まだ各クライアントの既存ゲームエンジンで行っています。したがって、通常のリロード・切断・重複精算対策には使えますが、改造クライアントによる不正を完全に防ぐ構成ではありません。正式なオンライン運用では、各ゲームの配当計算とクレジット台帳もサーバー側へ順次移す必要があります。
