# App Review への説明(Guideline 4.3 - Design Spam)

「Guideline 4.3(a) - Design - Spam」の指摘を受けたとき、またはそれを防ぐために、App Store Connect で使う文面です。

- **審査に出す前**: バージョンのページの「App Review に関する情報」→「メモ」に、英語の文を入れる(`../../IOS_BUILD.md` の 3 章のメモのあとに続けてよい。メモは 4000 文字まで)
- **指摘を受けたあと**: App Review への返信(Resolution Center)に英語の文を貼り、実機の操作の録画(3 章)を添える
- 日本語は内容の確認用(審査には英語で出す)

書いていることは、どれもこのリポジトリのゲームの実際の作りと同じです。ほかのアプリについて書いた部分(ジャンル・操作)は、出す前に今の内容と合っているか確かめてください。

---

## 英語(App Review に出す文)

```
Regarding Guideline 4.3 (Design - Spam)

Corner Kick is not a copy or a re-skin of another app. It is an original football (soccer) set-piece game designed and built specifically for this app. We would like to explain how it differs from the other games on our account.

1. A unique core mechanic
Each play is a corner kick in two parts that the player controls in turn:
- Player A (the kicker): the player chooses where the ball will land with the direction ring, and chooses how high the ball flies by how long they hold the KICK button (a short press is a fast, low ball; a long hold is a high, floating ball). The ball curls in toward the goal.
- Player B (the receiver): after the kick, control switches to the teammate closest to the landing spot. The player runs in and must time a JUMP (header) for a high ball, or a forward/left/right SLIDE for a low ball, to score.
A marker, zonal defenders and a goalkeeper react to every delivery: the near-post defender clears low balls, the keeper comes out for balls dropped too close to goal, and dives at shots. A game is 10 corners, scored by goals.

2. Different from our other apps
Our other games are in different genres and use different mechanics:
- JET STRIKE: a jet fighter flight and shooting game.
- Jackal: a rugby game about tackling a ball carrier and winning the loose ball.
- Chabudai Gaeshi Remember (ちゃぶ台返しリメンバー): a different, non-sports game.
Corner Kick shares none of these core mechanics. The ball physics (curling deliveries, headers, slides, the keeper's saves and the goal net), the defenders' behaviour, the camera that follows the ball in the air, the scoring and the ranks were all made for this game.

3. Original content
All 3D models, the stadium, the goal and net, the textures, the sounds (generated in the app), the text and the icons are original and were created for this app. No templates, purchased assets or third-party game content are used. As a small independent developer we do reuse our own general technical setup (the app container, the ad integration and the pause/share/settings screens) across our games, but each game's content and gameplay are separate and original.

4. Purpose and audience
It is a free sports game for general audiences (13+). No login is required. Ads are shown with Google AdMob.

A screen recording on a real iPhone showing a full corner kick (kick, header or slide, goal) is attached / available on request. Thank you for reviewing our app.
```

---

## 日本語(内容の確認用)

```
Guideline 4.3(デザインスパム)について

コーナーキックは、ほかのアプリのコピーや見た目の差し替えではありません。このアプリのために考えて作った、サッカーのセットプレーのゲームです。このアカウントのほかのゲームとの違いを説明します。

1. 独自の遊び方
1 回のプレーはコーナーキックで、2 つの段階をプレイヤーが順に操作します。
・選手A(キッカー): 円形の操作でボールの落下地点を決め、「キック」を押す長さでボールの高さを決める(短く押すと速くて低いボール、長く押すと高く浮いたボール)。ボールはゴール側へ曲がる。
・選手B(合わせる人): キックのあと、落下地点に一番近い味方に操作が切り替わる。走り込んで、高いボールは「ジャンプ」(ヘディング)、低いボールは前・左・右の「スライディング」のタイミングを合わせてゴールを決める。
マーカー、ゾーンのディフェンダー、キーパーがボールごとに反応する(ニアの DF は低いボールを跳ね返し、キーパーはゴールに近すぎるボールに飛び出し、シュートに飛びつく)。1 ゲームは 10 本で、ゴール数を競う。

2. ほかのアプリとの違い
ほかのゲームは、ジャンルも遊び方も違います。
・JET STRIKE: ジェット戦闘機の飛行・シューティング
・ジャッカル: ボールを持つ相手をタックルし、こぼれ球を奪うラグビーのゲーム
・ちゃぶ台返しリメンバー: スポーツではない、別のゲーム
コーナーキックは、これらの中心の遊び方を使っていません。ボールの物理(曲がるキック、ヘディング、スライディング、キーパーのセーブ、ゴールネット)、ディフェンダーの動き、空中のボールを追うカメラ、得点と称号は、すべてこのゲームのために作りました。

3. オリジナルの素材
3D のモデル、スタジアム、ゴールとネット、模様、音(アプリの中で合成)、文章、アイコンは、すべてこのアプリのために作ったものです。テンプレートや購入した素材、他社のゲームの素材は使っていません。小さな開発者のため、アプリの土台(アプリの入れ物、広告の組み込み、一時停止・シェア・設定の画面)は自分たちのゲームで共通にしていますが、ゲームの中身と遊び方はそれぞれ別のオリジナルです。

4. 目的と対象
一般向け(13 歳以上)の無料のスポーツゲームです。ログインは不要です。広告は Google AdMob で表示します。

実機の iPhone で、コーナーキック 1 本(キック、ヘディングかスライディング、ゴール)を通して遊ぶ画面録画を添付します(または求めに応じて提出します)。
```

---

## 指摘を受けたときに一緒にやると通りやすいこと

- **実機の画面録画**を添える(`../../IOS_BUILD.md` の 3 章)。キック → 選手B への切り替え → ヘディング/スライディング → ゴール、まで 1 本を通して見せる
- スクリーンショットを、ほかのアプリと見分けやすいものにする(今の 4 枚はキック・ジャンプ・ゴール・結果画面で、コーナーキックだと一目でわかる)
- それでも通らないときは、似ていると言われた点(返信で名前の出たアプリや画面)を聞き、その部分を変える
