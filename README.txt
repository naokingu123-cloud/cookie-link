SWEETS LINK — v255

公開ゲーム: https://naokingu123-cloud.github.io/cookie-link/
起動時に「ストリーミング版」「ダウンロード版」を選びます。

ストリーミング版:
共有抽選機の映像と入賞番号を受け取りながら進めます。
Windowsサーバーは start-shared-machine-tunnel.cmd で起動します。

ダウンロード版:
サーバーでBET・抽選・10ゲームの結果を確定し、1ラウンドの記録を取得します。
初回のゲーム素材は約128MBです。素材と記録をブラウザーへ保存した後は、
通信が切れてもそのラウンドを再生し、ページを開き直して続きから再開できます。
次のラウンドを取得するには接続が必要です。
ダンゴデビンゴはサーバーのおまかせ配置です。
Windowsサーバーは start-download-server.cmd で起動します。
このCMDはルーレットや管理画面のウィンドウを自動で開きません。

Node.js 20以上を使ってください。ダウンロード版の録画計算にはPlaywrightと
ヘッドレスのEdge/ChromeまたはChromiumを使い、利用可能な状態を確認してから
READYを表示します。詳しい準備・管理画面の手順は docs/download-v255.md にあります。
共有サーバーとTunnelの共通手順は docs/SHARED_MACHINE_TUNNEL.md を参照してください。

index.html、optimized、assets、およびサーバー関連ファイルの配置を保持してください。
更新時は既存の .runtime、.tools、data を削除せず、最新ソース一式を反映します。
GitHub Pagesの公開とWindowsサーバーの更新は別です。
オフライン保存はHTTPS（開発用はlocalhost）で利用してください。
