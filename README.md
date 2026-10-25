# コーナーキック (Corner Kick)

サッカーの **コーナーキック** をテーマにしたブラウザゲームです。
選手A がコーナーから蹴り、選手B がジャンプ(ヘディング)かスライディングで合わせてゴールを狙います。全 10 本で何点取れるかを競います。

画面は **操作中の選手の背中越しの3D視点**。ナイター照明のスタジアムで、選手の動き・ボタン・花火・歓声・質感は
techgymjp/jackal(ジャッカル)と同じ作りです。

`index.html` をブラウザで開くだけで遊べます(Web 版はビルド不要)。Android アプリ版もあります(下記)。3D描画に同梱の three.js(`vendor/three.min.js`, MIT License)を使っています。
GitHub Pages などの静的ホスティングにそのまま置けます。

## 1 本の流れ

1. **選手A(背番号10)がコーナーキック** — 左コーナーか右コーナーから蹴ります(画面に大きく「左コーナー」「右コーナー」)。
   - 左下の方角リングで **落下地点(黄色の輪)** を動かす(遠く・近くもリングで決める)
   - 「キック」を **長押しするほど高く上がる**(ボタンの左の縦ゲージ)。離した瞬間に蹴る
   - 短く押せば速くて低いライナー、長く押せばふわりと上がって頭の上から落ちてくるボール。どちらも狙った落下地点に届く
   - どちらもゴール側へ曲がる(インスイング)
2. **選手B が合わせる** — キックすると、**落下地点に一番近い味方**(9番・4番・5番・11番のどれか)が選手B になって操作が切り替わります。
   移動はジャッカルの選手B と同じく、方角リングとダッシュ(スタミナ消費)で走り込みます。
   - 高いボールは **ジャンプ** — 跳んだ頭にボールが当たればヘディング
   - 低いボールは **前・左・右のスライディング**(画面基準の方向へ滑り込む)— 投げ出した足に当たればシュート
   - ボールとの位置とタイミングが合うほど、速くて正確なシュートになる
   - コースは自動でキーパーのいない側。方角リングを真横に倒していればその側へ
3. **相手の守備**
   - マーカー(相手の4番)が背番号9 にぴったりついてきて、近くに来たボールは競りに来る。ほかの味方に合わせればマークを外せる
   - ニア・ファー・ゴール前のディフェンダーは、届く高さのボールをクリアする(低いボールはニアで跳ね返されやすい)
   - ゴールエリアに落ちるボールはキーパーが飛び出してキャッチする
   - シュートにはキーパーが反応して横っ飛び。キーパーから遠いほど、速いほど決まりやすい

後半になるほど相手の反応が速くなります。ナビ ON なら、キックの軌道(ためる前は一番低い軌道と一番高い軌道、ためている間はその高さの軌道)、ボールに合わせる場所(緑の輪)、
「今押せば当たる」タイミング(足元のオレンジの輪とボタンの点滅)が出ます。

## 操作

| 操作 | タッチ / マウス | キーボード |
| --- | --- | --- |
| 落下地点を動かす(選手A)・選手B の移動 | 左下の **方角リング**(16方位・中心から離すほど速い) | 矢印キー / WASD |
| キック(選手A・長押しするほど高く) | 「キック」ボタン長押し → 離す | Space(または I)長押し → 離す |
| ジャンプ(選手B・ヘディング) | 前・左・右・ダッシュの真ん中の「ジャンプ」ボタン | Space(または U) |
| 前・左・右スライディング(選手B) | 右側の「前」「左」「右」ボタン | I / J / L |
| ダッシュ(選手B) | ダッシュボタン長押し(スタミナ消費) | Shift |
| 一時停止 | — | P / Esc |
| 音のオン/オフ | 画面上部のスピーカーボタン | M |
| ナビのオン/オフ | 画面上部の「ナビ」ボタン | N |

方向は画面基準です(前 = 画面の奥)。

## スコア

- ゴール: 1000 + ヘディング 300 / スライディング 200 + 当たりの良さ(最大 200)
- ゴールの隅(ポストの近く)に決めると +200、連続ゴールでボーナス
- コーナーから直接ゴール(オリンピコ)は +1500
- 3 連続ゴールごとに花火を追加
- ベスト記録はブラウザに保存されます。結果画面から X・LINE・コピー・成績画像つきでシェアできます。
  シェア文には紹介記事 https://techgym.jp/column/claude-code-game-corner-kick/ が入ります

## 音と演出

音はすべて Web Audio API で合成しています(音声ファイルなし)。

- スタジアムのざわめきと応援(太鼓と手拍子のリズム)。ボールが上がってゴール前に近づくほどどよめきが大きくなる
- キック・ヘディング・ネットを揺らす音・ポストやバーに当たる「カーン」・キーパーのキャッチ
- ボールに合わせた瞬間はスローモーション
- **チアホーン**: キックのゲージをためているとき、ボールがゴール前にある間
- **ゴールで笛・大歓声・拍手・指笛・花火**。ヘディング・隅へのシュート・直接ゴールはさらに派手に
- 外すと観客のため息「あー…」

## 言語

日本語と英語に対応しています。端末の言語が日本語なら日本語、それ以外は英語で表示し、タイトル画面左下のボタンで切り替えられます。
文言は `i18n.js` にまとめています。

## Android アプリ

[Capacitor](https://capacitorjs.com/) でゲームのファイルをアプリに同梱し、Android アプリにしています(オフラインで遊べます)。
構成は techgymjp/jet-fighter の `docs/ANDROID_PORTING.md`、techgymjp/jackal と同じです。

- パッケージ名: `jp.techgym.cornerkick`(Android のパッケージ名には `-` を使えないため、リポジトリ名から `-` を抜いた)
- 横画面固定・全画面・プレイ中は画面を消さない
- 戻るボタン: プレイ中は一時停止(ポーズ中なら再開)、タイトル・結果画面ではアプリを終了
- 別アプリに切り替えると自動で一時停止して音を止める
- シェアは Android の共有メニュー
- 広告(AdMob)
  - バナー: タイトル画面・ポーズ画面・結果画面の下中央(プレイ中は操作ボタンと重なるので出さない)
  - 全画面広告(インタースティシャル): 結果画面の「もう一度」、「タイトルへ」、ポーズ画面からの「再開」のたびに毎回
  - リワード広告(チート): コーナーキックを外したら「広告を見てこのコーナーキックをやり直す」(1 ゲーム 5 回まで。ボールの行方を見届けられるよう 2.2 秒後に出し、6 秒で自動的に次の 1 本へ)。
    見終わるとその 1 本の成績を取り消して、同じ 1 本をもう一度。使ったことは結果画面とシェア文に「やり直しN回」と出る
  - EU など同意が必要な地域ではタイトル画面に「広告の設定」
- タイトル画面にバージョン(ビルド番号)とプライバシーポリシーへのリンク

ビルドは GitHub Actions(`.github/workflows/android.yml`)で行います。

1. `npm ci` → `npm run build`(`www/` に Web ファイルをコピーし、`ads-config.js` と `build-info.js` を生成)→ `npx cap sync android` → `./gradlew assembleDebug`
2. 既定ブランチなら、Release `android-latest` の `corner-kick.apk` を差し替え(動作確認用・テスト広告)
   - リリース画面: `https://github.com/techgymjp/corner-kick/releases/tag/android-latest`(QR コード: `docs/apk-qr.png`)
   - APK 直接: `https://github.com/techgymjp/corner-kick/releases/latest/download/corner-kick.apk`
3. GitHub Secrets に署名鍵(`ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD`)があれば、本番広告で署名付き AAB を作り Artifact に上げる

AdMob のアプリ ID は `android/app/src/main/res/values/strings.xml` の `admob_app_id`、本番の広告ユニット ID は `ads.js` の `UNITS.production` にあります。
動作確認用 APK はどれもテスト広告、Google Play 用の AAB は本番の広告です(広告ユニット ID が空の種類は出さない)。

手元で試すとき: `npm install` → `npm run android:sync` → `npm run android:open`(Android Studio が必要)。
アイコンと起動画面は `assets/` の元画像から `npx @capacitor/assets generate --android` で生成しています。

## ファイル

| ファイル | 内容 |
| --- | --- |
| `game.js` | ゲームの進行・ボールの物理・選手と守備の動き・入力・2D の表示(HUD・ボタン・ゲージ・ミニマップ) |
| `scene3d.js` | 3D 描画(スタジアム・ゴールとネット・選手・ボール・花火・カメラ) |
| `sound.js` | 音(Web Audio API で合成) |
| `i18n.js` | 日本語 / 英語の文言 |
| `ads.js` | 広告(Android アプリのときだけ動く) |
| `android/` | Android アプリのプロジェクト(Capacitor) |

テスト用に `window.CornerKick`(`newGame(seed)`、`update(dt)`、`setBot(fn)`、`forceSide` など)を公開しています。

## ライセンス

著作権はテックジム株式会社に帰属します(All rights reserved)。許可なく複製・改変・再配布すること、Web サイトやアプリとして公開・販売すること、名前・ロゴ・アイコン・画像を使うことを禁止します。
テックジムの受講生が学習目的で複製・改変することは許可しますが、アプリストアでの公開・広告の掲載・販売などの商用利用は禁止し、著作権表示を残してください。
同梱の three.js は MIT License です。詳しくは [LICENSE](LICENSE) を見てください。

## English

**Corner Kick** — a 3D football browser game about scoring from set pieces.

- Play as **Player A** at the corner flag: set the landing spot with the direction ring, then hold KICK — the longer you hold, the higher the ball (vertical gauge) — and release to deliver.
- After the kick you switch to **Player B** — whichever teammate is nearest the landing spot. Run onto the ball, JUMP to head high balls or SLIDE forward / left / right to poke in low ones. Your marker, the zonal defenders and the keeper all try to stop you.
- 10 corners per game. Open `index.html` in a browser to play. An Android app (Capacitor) is also built by GitHub Actions.
