'use strict';
// 表示言語(日本語 / 英語)。端末の言語が日本語なら日本語、それ以外は英語。タイトル画面で切り替えも可能
// 構成は techgymjp/jackal(ジャッカル)の i18n.js と同じ
window.I18N = (() => {
  const dict = {
    ja: {
      'doc.title': 'コーナーキック',
      'rotate.msg': 'スマホを横向きにしてください',
      'rotate.sub': 'コーナーキックは横画面で遊ぶゲームです',
      'legal.privacy': 'プライバシーポリシー',
      'legal.adSettings': '広告の設定',
      'url.privacy': 'https://techgym.jp/privacy-policy/',

      'btn.kick': 'キック', 'btn.kickHold': '長押しで高く',
      'btn.jump': 'ジャンプ', 'btn.front': '前', 'btn.left': '左', 'btn.right': '右', 'btn.slide': 'スライディング', 'btn.dash': 'ダッシュ',
      'ring.fwd': '前', 'ring.back': '後ろ',
      'ring.aimFwd': '遠く', 'ring.aimBack': '近く',
      'nav.btn': 'ナビ {s}',

      'title.name': 'コーナーキック',
      'title.sub': '蹴って、合わせて、ゴールをこじ開けろ!',
      'help.touch.1': '選手A(10番): 左下の方角リングで落下地点(黄色の輪)を決める。遠く・近くもリングで',
      'help.touch.2': '「キック」を長押しするほど高く上がる(キックボタンの左の縦ゲージ)。離すと蹴る。短く押せば低いライナー',
      'help.touch.3': 'キックすると、落下地点に一番近い味方が選手B に。方角リングとダッシュで走り込め',
      'help.touch.4': '高いボールは「ジャンプ」でヘディング、低いボールは「前・左・右」スライディングで押し込む',
      'help.touch.5': 'コースはキーパーの逆(リングを真横に倒すとその側)。ニアの DF は低いボールを跳ね返す',
      'help.touch.6': 'ナビ ON: ボールの軌道と、合わせる場所(緑の輪)・今だ!(オレンジ)が出る',
      'help.key.1': '選手A(10番): 矢印キー・WASD で落下地点(黄色の輪)を決める',
      'help.key.2': 'Space(または I)を長押しするほど高く上がる(キックボタンの左の縦ゲージ)。離すと蹴る。短く押せば低いライナー',
      'help.key.3': 'キックすると、落下地点に一番近い味方が選手B に。矢印キー・WASD と Shift(ダッシュ)で走り込め',
      'help.key.4': '高いボールは Space(ジャンプ)でヘディング、低いボールは I・J・L で前・左・右スライディング',
      'help.key.5': 'コースはキーパーの逆(左右キーだけ押すとその側)。ニアの DF は低いボールを跳ね返す',
      'help.key.6': 'N : ナビのオン/オフ   M : 音のオン/オフ   P : 一時停止',
      'title.best': 'ベスト: {c} / {t} ゴール  (SCORE {s})',
      'title.start.touch': 'タップでキックオフ',
      'title.start.key': 'SPACE / タップでキックオフ',
      'title.sound': '音が鳴ります(M キー / 上のボタンで消音)。iPhone はマナーモードを解除してください',

      'hud.play': 'コーナーキック {n} / {t}',
      'hud.goals': 'ゴール {n}', 'hud.headers': 'ヘディング {n}', 'hud.streak': '連続 {n}',
      'hud.dash': 'スタミナ',
      'hud.playerA': '選手A キッカー', 'hud.playerB': '選手B 合わせろ',
      'ready.play': '{n} 本目',
      'call.left': '左コーナー', 'call.right': '右コーナー',
      'ready.sub': '落下地点を決めて、高さをためてキック!',
      'msg.aim': '落下地点を決めて「キック」を長押し。長いほど高く上がる',
      'msg.aim.key': '落下地点を決めて Space を長押し。長いほど高く上がる',
      'msg.meet': 'ボールに合わせろ!高いボールはジャンプ、低いボールはスライディング',
      'msg.switchBig': '選手B({n}番) 合わせろ!',
      'gauge.high': '高い', 'gauge.low': '低い',
      'pause.resume': 'P / Esc で再開',
      'sound.tap': '音が出ないときはタップ',

      'goal': 'ゴーーール!!',
      'goal.head': 'ジャンピングヘッドで叩き込んだ!', 'goal.slide': 'スライディングで押し込んだ!',
      'goal.direct': '直接ゴール!オリンピコ!',
      'goal.corner': 'ゴール隅に決めた!',
      'miss.save': 'キーパーに止められた…', 'miss.catch': 'キーパーにキャッチされた…',
      'miss.clear': '相手DFにクリアされた…', 'miss.post': 'ポストに嫌われた…', 'miss.bar': 'クロスバー…!',
      'miss.wide': '枠を外れた…', 'miss.over': 'ふかしてしまった…',
      'miss.none': '合わせられなかった…', 'miss.out': 'ボールが流れた…',
      'streak': '{n} 連続ゴール!',

      'rank.0': '草サッカー', 'rank.1': '控えフォワード', 'rank.2': 'スタメン',
      'rank.3': 'セットプレーの名手', 'rank.4': '代表のエースストライカー', 'rank.5': '伝説のヘディング王',

      'over.title': '試合終了',
      'over.goals': '{c} / {t} ゴール',
      'over.perfect': '★ パーフェクト!! 全部のコーナーキックを決めた ★',
      'over.rank': '称号: {r}',
      'over.line1': 'SCORE {s}   ヘディング {h}   最大連続 {m}   {nav}',
      'over.new': 'NEW RECORD!',
      'over.best': 'ベスト: {c} ゴール (SCORE {s})',
      'nav.on': 'ナビあり', 'nav.off': 'ナビなし', 'nav.redo': '・やり直し{n}回', 'nav.redo1': '・やり直し1回',
      'redo.watch': '▶ 広告を見てこのコーナーキックをやり直す',
      'redo.next': 'つぎへ ({s})',
      'redo.loading': '広告を読み込み中…',
      'redo.fail': '広告を読み込めませんでした',
      'redo.note': '外したコーナーキックをもう一度蹴れます(このゲームであと {n} 回)',
      'over.retryBtn': 'もう一度',
      'menu.resume': '再開', 'menu.title': 'タイトルへ',

      'share.btn': '📤 結果をシェア', 'share.post': '𝕏 ポスト', 'share.copy': 'コピー',
      'share.title': 'コーナーキック', 'share.dialog': '結果をシェア',
      'share.msg.native': '共有メニューからシェアできます',
      'share.msg.image': '成績画像つきでシェアできます',
      'share.msg.links': 'X・LINE・コピーからシェアしてください',
      'share.copied': '結果をコピーしました!SNSに貼り付けてください',
      'share.copyFail': 'コピーできませんでした。X・LINEボタンを使ってください',
      'share.perfect': '【パーフェクト!】',
      'share.text': '⚽コーナーキックで{c}/{t}ゴール!{p}\n称号:{r} SCORE {s}({nav})\nヘディング{h}・最大{m}連続ゴール\n#コーナーキック #サッカー #ClaudeCode',
      'card.head': 'コーナーキック({nav})',
      'card.goals': '{c}/{t} ゴール',
      'card.rank': '称号:{r}',
      'card.line1': 'SCORE {s} ・ ヘディング{h} ・ 最大{m}連続',
      'card.tags': '#コーナーキック  #サッカー  #ClaudeCode',
    },
    en: {
      'doc.title': 'Corner Kick',
      'rotate.msg': 'Please rotate your phone to landscape',
      'rotate.sub': 'Corner Kick is played in landscape mode',
      'legal.privacy': 'Privacy Policy',
      'legal.adSettings': 'Ad settings',
      'url.privacy': 'https://techgym.jp/privacy-policy-en/',

      'btn.kick': 'KICK', 'btn.kickHold': 'HOLD = HIGHER',
      'btn.jump': 'JUMP', 'btn.front': 'FWD', 'btn.left': 'LEFT', 'btn.right': 'RIGHT', 'btn.slide': 'SLIDE', 'btn.dash': 'DASH',
      'ring.fwd': 'FWD', 'ring.back': 'BACK',
      'ring.aimFwd': 'FAR', 'ring.aimBack': 'NEAR',
      'nav.btn': 'NAV {s}',

      'title.name': 'CORNER KICK',
      'title.sub': 'Whip it in. Meet it. Score!',
      'help.touch.1': 'Player A (#10): set the landing spot (yellow ring) with the direction ring — near or far',
      'help.touch.2': 'Hold KICK longer for a higher ball (vertical gauge), release to kick. A quick tap whips in a low one',
      'help.touch.3': 'After the kick, the teammate nearest the landing spot becomes Player B. Run in with the ring and DASH',
      'help.touch.4': 'High ball: JUMP to head it. Low ball: SLIDE forward, left or right to poke it in',
      'help.touch.5': 'You aim away from the keeper (or push the ring fully sideways). The near-post defender clears low balls',
      'help.touch.6': 'NAV on: shows the flight path, where to meet it (green) and when to hit it (orange)',
      'help.key.1': 'Player A (#10): set the landing spot (yellow ring) with arrows / WASD',
      'help.key.2': 'Hold Space (or I) longer for a higher ball (vertical gauge), release to kick. A quick tap = low',
      'help.key.3': 'After the kick, the teammate nearest the landing spot becomes Player B (arrows / WASD, Shift to sprint)',
      'help.key.4': 'High ball: Space to JUMP and head it. Low ball: I / J / L to SLIDE forward / left / right',
      'help.key.5': 'You aim away from the keeper (or hold just left/right). The near-post defender clears low balls',
      'help.key.6': 'N: NAV on/off   M: sound on/off   P: pause',
      'title.best': 'Best: {c} / {t} goals  (SCORE {s})',
      'title.start.touch': 'Tap to kick off',
      'title.start.key': 'SPACE / Tap to kick off',
      'title.sound': 'This game has sound (M key / top button to mute). On iPhone, turn off silent mode.',

      'hud.play': 'Corner {n} / {t}',
      'hud.goals': 'Goals {n}', 'hud.headers': 'Headers {n}', 'hud.streak': 'Streak {n}',
      'hud.dash': 'STAMINA',
      'hud.playerA': 'PLAYER A: KICK', 'hud.playerB': 'PLAYER B: MEET IT',
      'ready.play': 'Corner {n}',
      'call.left': 'LEFT CORNER', 'call.right': 'RIGHT CORNER',
      'ready.sub': 'Pick your spot, choose the height, deliver!',
      'msg.aim': 'Set the spot, hold KICK — the longer, the higher',
      'msg.aim.key': 'Set the spot, hold Space — the longer, the higher',
      'msg.meet': 'Meet the ball! JUMP for high balls, SLIDE for low ones',
      'msg.switchBig': 'PLAYER B (#{n}): MEET IT!',
      'gauge.high': 'HIGH', 'gauge.low': 'LOW',
      'pause.resume': 'P / Esc to resume',
      'sound.tap': 'No sound? Tap here',

      'goal': 'GOOOAL!!',
      'goal.head': 'A towering header!', 'goal.slide': 'Slid in to finish!',
      'goal.direct': 'Straight in! An Olimpico!',
      'goal.corner': 'Right in the corner!',
      'miss.save': 'Saved by the keeper...', 'miss.catch': 'The keeper claims it...',
      'miss.clear': 'Cleared by the defence...', 'miss.post': 'Off the post...', 'miss.bar': 'Off the bar...!',
      'miss.wide': 'Wide of the post...', 'miss.over': 'Over the bar...',
      'miss.none': 'Nobody got on the end of it...', 'miss.out': 'The ball ran out...',
      'streak': '{n} goals in a row!',

      'rank.0': 'Sunday League', 'rank.1': 'Bench Striker', 'rank.2': 'Starting XI',
      'rank.3': 'Set-piece Specialist', 'rank.4': 'International No.9', 'rank.5': 'King of the Header',

      'over.title': 'FULL TIME',
      'over.goals': '{c} / {t} goals',
      'over.perfect': '★ PERFECT!! You scored from every corner ★',
      'over.rank': 'Rank: {r}',
      'over.line1': 'SCORE {s}   Headers {h}   Best streak {m}   {nav}',
      'over.new': 'NEW RECORD!',
      'over.best': 'Best: {c} goals (SCORE {s})',
      'nav.on': 'NAV on', 'nav.off': 'NAV off', 'nav.redo': ', {n} redos', 'nav.redo1': ', 1 redo',
      'redo.watch': '▶ Watch an ad to retake this corner',
      'redo.next': 'Next ({s})',
      'redo.loading': 'Loading ad…',
      'redo.fail': 'Could not load an ad',
      'redo.note': 'Take the corner you missed again ({n} left this game)',
      'over.retryBtn': 'Play again',
      'menu.resume': 'Resume', 'menu.title': 'Title',

      'share.btn': '📤 Share result', 'share.post': '𝕏 Post', 'share.copy': 'Copy',
      'share.title': 'Corner Kick', 'share.dialog': 'Share result',
      'share.msg.native': 'Share from the share menu',
      'share.msg.image': 'Share with a result card image',
      'share.msg.links': 'Share via X, LINE or copy',
      'share.copied': 'Copied! Paste it into your social media',
      'share.copyFail': 'Could not copy. Please use the X or LINE button',
      'share.perfect': ' PERFECT!',
      'share.text': '⚽I scored {c}/{t} from corners in Corner Kick!{p}\nRank: {r}  SCORE {s} ({nav})\n{h} headers, best streak {m}\n#CornerKick #Football #ClaudeCode',
      'card.head': 'CORNER KICK ({nav})',
      'card.goals': '{c}/{t} goals',
      'card.rank': 'Rank: {r}',
      'card.line1': 'SCORE {s} ・ Headers {h} ・ Best streak {m}',
      'card.tags': '#CornerKick  #Football  #ClaudeCode',
    },
  };

  const STORE_KEY = 'cornerkick.lang';
  let saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* 保存不可 */ }
  const deviceLang = (navigator.languages && navigator.languages[0]) || navigator.language || 'ja';
  let lang = dict[saved] ? saved : (/^ja\b/i.test(deviceLang) ? 'ja' : 'en');
  const listeners = [];

  // t('hud.play', { n: 3, t: 20 }) → '第 3 プレー / 20'
  function t(key, vars) {
    let s = dict[lang][key];
    if (s === undefined) s = dict.ja[key];
    if (s === undefined) return key;
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)) : s;
  }

  // data-i18n(文字)/ data-i18n-href(リンク先)の付いた要素を書き換える
  function apply() {
    document.documentElement.lang = lang;
    document.title = t('doc.title');
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-href]').forEach((el) => { el.href = t(el.dataset.i18nHref); });
    document.querySelectorAll('[data-lang]').forEach((el) => el.classList.toggle('on', el.dataset.lang === lang));
  }

  function setLang(l) {
    if (!dict[l] || l === lang) return;
    lang = l;
    try { localStorage.setItem(STORE_KEY, l); } catch (e) { /* 保存不可 */ }
    apply();
    listeners.forEach((f) => f(l));
  }

  return {
    t, apply, setLang,
    get lang() { return lang; },
    onChange(f) { listeners.push(f); },
  };
})();
