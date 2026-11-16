# v236: 実プレイヤーのみ・途中WIN共有の修正

## 疑似参加を停止
新しい抽選機はTEST人数0で開始。保存済みv235のdemoCount=5とTEST席は、一度限りの設定移行で解除する。実プレイヤーの席番号、プロフィール、CREDIT、ラウンド、BET予約は変更しない。管理画面のTEST追加ボタンも非表示。既存TESTルールの回帰検査だけは、隔離したテスト環境で明示的に有効化して残す。

## 0 WINの原因と修正
v235の参加者欄はapp.totalWin/roundWinsのみを送っていた。これらは精算まで0の場合があり、各ゲームで既に獲得した配当を示すengine.totalHundredthsと異なる。v236では各有効ゲームの確定BETとtotalHundredthsを、既存のmedalWin関数で換算して合計する。精算済みゲームはroundWinsを採用し、二重加算しない。未来のリーチ予測は使用しない。

サーバー名簿も、チェックポイントに既に含まれていたpayoutV3.roundWin/games[].winを読み取る。以前のtotalWin/roundWinsが0でも途中WINを表示できる。最終的にはサーバーの精算結果を優先し、0WIN確定も尊重する。

更新間隔は従来通り1秒、値が変わったときだけstation_progressを送る。サーバー更新は既存の250ms時計、管理画面は既存の2秒更新。動画配信、物理抽選、BET制御、配当計算・CREDIT加算の処理は変更しない。

## 検証
- stations-live-win-v236.mjs: 保存済みTEST席移行、実クライアントスクリプトをゲーム内部スコープで実行、2名の途中WINと相互カード表示、精算0優先、古いラウンド排除。
- stations-two-player-v236.mjs: HTTP/WebSocketサーバーと2名の実参加セッション、途中WIN、チェックポイント経由、共通8球、個別精算、二重加算防止、次BET。
- 既存の席・再接続・口座復旧・配当・HD60検査も継続。

テストの固定配当は通信・表示検証用であり、抽選確率の試算ではない。Windows実機とiPhone上の確認は別途必要。

## 反映
Windowsのプロジェクトを更新し、.runtime/.tools/dataを保持してstart-shared-machine-tunnel.cmdから再起動。管理画面と参加者全員のクライアントを再読み込みする。ページの更新だけではWindowsの保存済みTEST席は解除されない。
