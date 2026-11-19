# v256 — ダウンロード版のプロフィール取得停止への対処

GitHub Pages はゲームの画面だけを配信します。プレイヤー情報・CREDIT・録画生成には Windows の Node.js サーバーを起動する必要があります。

- 初期画面には接続先と、接続先確認・対応状況・認証・プロフィール/CREDIT取得の各ステージを表示
- /api/health に Download API がない旧版サーバーを検出して具体的なエラーを表示
- 通信不能・タイムアウト・認証エラーを個別に案内
- ブラウザーの online イベントが起きなくても、20秒ごとに接続を再確認
- 認証成功前に約128MBの素材取得を開始しない
- 旧 v255 と新 v256 は別のオフラインキャッシュを使い、保存済みゲームの途中再生を保護

対処方法: Windows サーバーを更新し、既存の .runtime・.tools・data を残して start-download-server.cmd を実行します。DOWNLOAD SERVER READY と HTTPS のプレイヤーURLを確認し、そのURLからダウンロード版を選択してください。

GitHub Pages の既定の接続先は shared-endpoint.json で設定する https://sweets.sweetslink-game.com です。この宛先が Windows サーバーにつながっていない場合、公開ページだけを更新しても認証はできません。サーバー側の既存クレジットや録画を端末の値で置き換えることはしません。
