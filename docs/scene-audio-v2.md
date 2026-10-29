# 効果音の場面別調整 v2

既存の入賞・ハンマーも提供SEから置換。全46音を場面別に使用し、同じ音源ファイルの重複なし。番号読み上げとBGMは維持。

頻繁な動作は主に0.12〜0.45秒の短い音、ゲイン上限0.16。通常獲得・操作は0.28、役成立や強化は0.52、全消し・ボーナスは1.0。全音はピーク0.65に正規化済み。これらは独立SFXバス内での値で、固定された出力上限・BGMゲインは変更しない。

同一音の再発音に40〜600msの間隔を設け、着地1群を1音で表現。全消し中は通常効果音のみ40%に下げ、最大8声になっても優先度の高いレア音を追い出さない。BGMはこの制御の対象外。JPC入賞の最終ゲインは0.045、通常は0.18。

## 割り当て
|場面|元ファイル|ゲイン上限|優先度|
|---|---|---:|---:|
|キャニオン：ドリル発進|`Action_Swing1_Komori.ogg`|0.28|0|
|キャニオン：地層掘削|`地系＿岩.wav`|0.16|0|
|キャニオン：ケーキ溶解|`se_maoudamashii_element_water02.mp3`|0.16|0|
|キャニオン：鉱石が秤へ着地|`System_Get1_default.ogg`|0.28|0|
|シュガー獲得|`System_Get2_wolf.ogg`|0.52|1|
|キャニオン：掘削後LvUP|`[SE]LevelUp.ogg`|0.28|0|
|キャニオン：鉱石ランクアップ|`magic-statusup1.mp3`|0.52|1|
|キャニオン：ランダム消し|`magic-electron1.mp3`|0.52|1|
|キャニオン：セクション鉱石化|`magic25.mp3`|0.52|1|
|キャニオン：獲得WIN確定・TOTALへ加算|`small-bell01.mp3`|0.28|0|
|シックスドロップ：ガラス接触|`氷割れる.wav`|0.16|0|
|シックスドロップ：ドロップ着地|`System_Click_Komori.ogg`|0.16|0|
|シックスドロップ：補充|`Action_Pouring_into_grass_Komori.ogg`|0.16|0|
|シックスドロップ：連結消去|`ポン！.wav`|0.16|0|
|シックスドロップ：三角形成立|`se_maoudamashii_chime13.mp3`|0.52|1|
|シックスドロップ：六角形成立|`se_maoudamashii_chime14.mp3`|0.52|1|
|シックスドロップ：役への変化|`kira.mp3`|0.32|0|
|シックスドロップ：ラウンドクリア|`get_3.mp3`|0.52|1|
|シックスドロップ：キャンディ破壊|`PON.wav`|0.16|0|
|クッキーリンク：クッキー消去|`tm2_hit004.wav`|0.16|0|
|クッキーリンク：最大LINK更新|`get.mp3`|0.52|1|
|クッキーリンク：ハンマー出現|`ItemGet.wav`|0.52|1|
|クッキーリンク：シュガー補充|`System_Enter01_panop.ogg`|0.28|0|
|クッキー：番号HIT|`System_Cursor02_panop.ogg`|0.16|0|
|クッキー：落下|`se_maoudamashii_se_fall01.mp3`|0.16|0|
|クッキー：着地|`Action_Knocking_wood_door1_Komori.ogg`|0.16|0|
|クッキー：通常補充|`Action_Fall1_Komori.ogg`|0.16|0|
|クッキー：連鎖成立|`System_Cursor06_default.ogg`|0.16|0|
|クッキー：ハンマー色消し|`Action_God_sword1_Komori.ogg`|0.52|1|
|クッキー：ハンマー振り上げ|`Action_Cutting_wind1_Komori.ogg`|0.28|0|
|クッキー：ハンマー打撃|`Action_Knocking_iron_door3_Komori.ogg`|0.28|0|
|通常・JPC：入賞|`System_Enter03_default.ogg`|0.18|0|
|キャニオン：ケーキ落下|`se_maoudamashii_se_fall02.mp3`|0.16|0|
|キャニオン：ケーキ着地|`Action_Kick1_Komori.ogg`|0.16|0|
|キャニオン：降下移動|`Action_Steps1_Isooki.ogg`|0.16|0|
|キャニオン：ドリル帰還|`Action_Switch2_Komori.ogg`|0.16|0|
|キャニオン：番号交換|`System_Cursor04_panop.ogg`|0.16|0|
|キャニオン：ALL発進|`System_Encount_default.ogg`|0.52|1|
|シックス：番号HIT|`System_Cursor03_panop.ogg`|0.16|0|
|シックス：未HIT|`System_Cursor05_wolf.ogg`|0.16|0|
|シックス：盤面掃き出し|`Action_Chinese_blade1_Komori.ogg`|0.28|0|
|シックス：直線成立|`se_maoudamashii_chime01.mp3`|0.52|1|
|全ゲーム：盤面処理完了|`System_Enter04_panop.ogg`|0.28|0|
|クッキー・シックス：全消しボーナス|`battle_win4.wav`|1|2|
|キャニオン：全消しアイテム|`se_maoudamashii_explosion08.mp3`|1|2|
|キャニオン：ボーナスケーキ|`battle_win2.wav`|1|2|

## 動作検証
- scene_audio_browser.py: 46音の実デコード・再生、ゲーム別ルーティング、クッキー落下・着地、旧入賞・ハンマー置換、再発音抑止、全消し音の優先保護、ミュート・一時停止。
- bgm_headroom_browser.py: JPC入賞0.045、BGMゲイン0.15固定。効果音同時再生でもBGM信号の差は約2.5e-8以下。
- six_stage_v5_browser.py: 全場面音源の非無音検査、停止時の音声解放、盤面・補充・ラウンドの回帰。
- 実機スピーカーでの聴感は未検証。
