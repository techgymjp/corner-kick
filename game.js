'use strict';
// コーナーキック — 蹴って、合わせて、ゴールをこじ開けろ!
// 座標系: ピッチの中心が原点、x がタッチライン方向(右が +)、y がゴール方向(攻めるゴールは y = +52.5)、z が高さ。単位はメートル。
// 1 プレーは 2 段階:
//   1. 選手A(キッカー)が左右どちらかのコーナーから蹴る。方角リングで落下地点を決め、「高く」「低く」を長押ししてゲージをため、離してキック
//   2. キックすると選手B に切り替わる。方角リングとダッシュで走り込み、「ヘディング」か「シュート」でボールに合わせてゴールを狙う
// 質感と操作感は techgymjp/jackal(ジャッカル)と同じ作り。
(() => {
  // ---------- 定数 ----------
  const H = 640;
  let W = 960; // 画面の横幅に合わせて変わる(高さ 640 基準の論理座標)
  const HX = 34, GL = 52.5;
  const GOAL_W = 3.66, GOAL_H = 2.44; // ゴールの幅の半分・高さ
  const AREA_X = 9.16, AREA_D = 5.5;  // ゴールエリア
  const TOTAL = 10;
  const G = 9.8, R = 0.15; // 重力・ボールの半径(表示に合わせて少し大きめ)

  const WALK = 6.0, DASH = 8.8, ACC = 30;
  const STAMINA_MAX = 4.0, STAMINA_REGEN = 0.6;
  const HEAD_Z = 1.72;                         // 立っているときの頭の高さ
  const JUMP = 0.75, HEAD_T = 0.6;             // ヘディングのジャンプの高さ・長さ
  const KICK_T = 0.5;
  const KICK_TYPES = { high: { T: 1.95, curl: 3.2 }, low: { T: 1.35, curl: 4.2 } };
  const SWEET = 0.78, SWEET_W = 0.075;         // キックのゲージの「ちょうどいい」ところ
  const GAUGE_T = 0.9;                         // ゲージが満タンになるまでの時間
  const AIM_LIMIT = 12;
  const SLOW_T = 0.32, SLOW_K = 0.3;           // ボールに合わせた瞬間のスローモーション(実時間・倍率)
  const DT = 1 / 120;
  const t = (k, v) => I18N.t(k, v);

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // ---------- 乱数 ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let rng = mulberry32(Date.now());
  const rand = (a, b) => a + (b - a) * rng();
  const gauss = () => (rng() + rng() + rng() + rng() - 2) * 1.73; // 平均 0・標準偏差 およそ 1
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };

  // ---------- 保存 ----------
  function loadBest() {
    try { return JSON.parse(localStorage.getItem('cornerkick.best')) || null; } catch (e) { return null; }
  }
  function saveBest(b) {
    try { localStorage.setItem('cornerkick.best', JSON.stringify(b)); } catch (e) { /* 保存できない環境 */ }
  }

  // ---------- サウンド(sound.js) ----------
  function audio() { Sound.init(); }

  // ---------- 入力 ----------
  const keys = new Set();
  const input = { mx: 0, my: 0, sx: 0, sy: 0, dash: false, act: null };
  const pressed = { act: null, start: false };
  let bot = null; // テスト用: (state) => input を返す関数
  let botHold = null;

  const RING = { x: 125, y: 510, r: 95, dead: 14 };
  // 右側のボタン: act1(高く / ヘディング)・act2(低く / シュート)・ダッシュ
  const BTN = {
    act1: { x: 785, y: 395, r: 50, key: 'I' },
    act2: { x: 690, y: 500, r: 46, key: 'J' },
    dash: { x: 860, y: 560, r: 46, key: 'Shift' },
  };
  const MUTE = { x: 596, y: 36, r: 20 };
  const NAVBTN = { x: 660, y: 36, w: 76, h: 30 };
  const pointers = new Map(); // pointerId -> 'ring' | 'act1' | 'act2' | 'dash' | 'none'
  const ringInput = { active: false, mx: 0, my: 0 };

  window.addEventListener('keydown', (e) => {
    audio();
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!keys.has(k)) {
      if (k === 'i' || k === 'k') pressed.act = 'act1';
      if (k === 'j' || k === 'l') pressed.act = 'act2';
      if (k === ' ' || k === 'Enter') pressed.start = true;
      if (k === 'p' || k === 'Escape') togglePause();
      if (k === 'm') Sound.setMuted(!Sound.muted);
      if (k === 'n') toggleNav();
    }
    keys.add(k);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
  window.addEventListener('blur', () => keys.clear());

  // ボタンを押し続けているか(キックのゲージ用)
  function isHeld(name) {
    if (bot) return botHold === name;
    if (name === 'act1' && (keys.has('i') || keys.has('k'))) return true;
    if (name === 'act2' && (keys.has('j') || keys.has('l'))) return true;
    for (const v of pointers.values()) if (v === name) return true;
    return false;
  }

  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  // キックのあとは選手B を操作している
  function controllingB() {
    return state.phase === 'meet' || state.phase === 'slow' || state.phase === 'shot' || (state.phase === 'result' && !!state.play && state.play.switched);
  }
  function buttonsShown() {
    if (state.phase === 'ready' || state.phase === 'aim' || state.phase === 'kicking') return ['act1', 'act2'];
    if (controllingB()) return ['act1', 'act2', 'dash'];
    return [];
  }

  // 一番近いボタン(スマホは指が太いので、ボタンの外側も少し広めに反応させる)
  function hitButton(p) {
    let best = null, bd = Infinity;
    for (const name of buttonsShown()) {
      const b = BTN[name];
      const d = Math.hypot(p.x - b.x, p.y - b.y) - b.r;
      if (d < bd) { bd = d; best = name; }
    }
    return bd <= (isTouch ? 18 : 8) ? best : null;
  }
  function setRing(p) {
    const dx = p.x - RING.x, dy = p.y - RING.y;
    const d = Math.hypot(dx, dy);
    if (d < RING.dead) { ringInput.mx = 0; ringInput.my = 0; return; }
    // 円の方角合わせ: 16方位にスナップ
    const step = Math.PI / 8;
    const ang = Math.round(Math.atan2(dx, -dy) / step) * step;
    const mag = Math.min(1, (d - RING.dead) / (RING.r * 0.45)); // 少し倒すだけで全速
    ringInput.mx = Math.sin(ang) * mag;
    ringInput.my = Math.cos(ang) * mag;
  }
  canvas.addEventListener('pointerdown', (e) => {
    audio();
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const p = canvasPos(e);
    if (Math.hypot(p.x - MUTE.x, p.y - MUTE.y) <= MUTE.r + 8) {
      Sound.setMuted(!Sound.muted);
      pointers.set(e.pointerId, 'none');
      return;
    }
    if (Math.abs(p.x - NAVBTN.x) <= NAVBTN.w / 2 + 6 && Math.abs(p.y - NAVBTN.y) <= NAVBTN.h / 2 + 8) {
      toggleNav();
      pointers.set(e.pointerId, 'none');
      return;
    }
    if (state.phase === 'title' || state.phase === 'over') {
      if (state.phase !== 'over' || state.overT > 1.0) pressed.start = true;
      pointers.set(e.pointerId, 'none');
      return;
    }
    if (state.paused) { pointers.set(e.pointerId, 'none'); return; } // ポーズ中は「再開」ボタンで戻る
    if (Math.hypot(p.x - RING.x, p.y - RING.y) <= RING.r + 30) {
      pointers.set(e.pointerId, 'ring');
      ringInput.active = true;
      setRing(p);
      return;
    }
    const b = hitButton(p);
    if (b && b !== 'dash') pressed.act = b;
    pointers.set(e.pointerId, b || 'none');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointers.get(e.pointerId) === 'ring') setRing(canvasPos(e));
  });
  function releasePointer(e) {
    if (pointers.get(e.pointerId) === 'ring') {
      ringInput.active = false; ringInput.mx = 0; ringInput.my = 0;
    }
    pointers.delete(e.pointerId);
  }
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);

  function toWorld(mx, my, F) {
    // 画面の右 = 前方を時計回りに90°回した方向
    return { x: my * F.x + mx * F.y, y: my * F.y - mx * F.x };
  }

  function readInput() {
    if (bot) {
      const b = bot(state) || {};
      input.mx = b.mx || 0; input.my = b.my || 0; input.sx = b.sx || 0; input.sy = b.sy || 0;
      input.dash = !!b.dash; input.act = b.act || null;
      botHold = b.hold || null;
      if (b.hold && (!state.charge || state.charge.btn !== b.hold)) input.act = b.hold;
      return;
    }
    let mx = 0, my = 0;
    if (keys.has('ArrowUp') || keys.has('w')) my += 1;
    if (keys.has('ArrowDown') || keys.has('s')) my -= 1;
    if (keys.has('ArrowRight') || keys.has('d')) mx += 1;
    if (keys.has('ArrowLeft') || keys.has('a')) mx -= 1;
    if (mx || my) {
      const m = Math.hypot(mx, my);
      mx /= m; my /= m;
    } else if (ringInput.active) {
      mx = ringInput.mx; my = ringInput.my;
    }
    let dash = keys.has('Shift') || keys.has(' ') || keys.has('c');
    for (const v of pointers.values()) if (v === 'dash') dash = true;
    // 画面に映っている向き(カメラの向き)基準
    const w = toWorld(mx, my, Scene3D.camF);
    input.mx = w.x; input.my = w.y; input.sx = mx; input.sy = my; input.dash = dash;
    input.act = pressed.act;
  }

  // ---------- ゲーム状態 ----------
  const state = {
    phase: 'title', // title | ready | aim | cross | meet | slow | shot | result | over
    paused: false,
    index: 0, total: TOTAL,
    goals: 0, headers: 0, perfectKicks: 0, score: 0, streak: 0, bestStreak: 0,
    phaseT: 0, overT: 0,
    play: null, actors: {}, ball: null, charge: null,
    camF: { x: 0, y: 1 },
    view: { x: 0, y: 24, fx: 0, fy: 1 },
    guide: null, path: null,
    popups: [],
    msg: null,
    lastResult: null,
    best: loadBest(),
    nav: loadNav(),
    time: 0,
    newRecord: false,
  };

  function actor(x, y, face, extra) {
    return Object.assign({ x, y, vx: 0, vy: 0, face, mode: 'run', t: 0, phase: rng() * 6 }, extra || {});
  }

  function newGame(seed) {
    state.seed = (seed != null ? seed : (Date.now() ^ (Math.random() * 1e9))) >>> 0;
    Object.assign(state, {
      phase: 'ready', paused: false, index: 0, goals: 0, headers: 0, perfectKicks: 0, score: 0,
      streak: 0, bestStreak: 0, phaseT: 0, overT: 0, popups: [], lastResult: null, newRecord: false, navUsed: false,
    });
    startPlay();
  }

  // ---------- プレーの準備 ----------
  function genPlay(i) {
    const lv = i / (TOTAL - 1);
    const force = window.CornerKick && window.CornerKick.forceSide; // テスト用
    const side = force || (i === 0 ? 1 : i === 1 ? -1 : (rng() < 0.5 ? -1 : 1)); // +1 右コーナー / -1 左コーナー
    return {
      side, lv,
      corner: { x: side * (HX - 0.3), y: GL - 0.3 },
      bHome: { x: rand(-6, 6), y: rand(39, 44) },
      defSpeed: 4.4 + 1.4 * lv, defReach: 2.4 + 0.2 * lv, defReact: 0.45 - 0.15 * lv,
      gkReact: 0.3 - 0.1 * lv, gkSpeed: 3.8 + 1.2 * lv, gkOut: 4.8 + 1.0 * lv,
      markSpeed: 5.0 + 1.3 * lv,
    };
  }

  function startPlay() {
    rng = mulberry32((state.seed || 1) + state.index * 7919);
    const p = genPlay(state.index);
    state.play = p;
    state.phase = 'ready';
    state.phaseT = 0;
    state.guide = null;
    state.path = null;
    state.msg = null;
    state.charge = null;
    state.strike = null;
    state.shotPlan = null;
    state.kickT = 0;
    const s = p.side;
    const A = actor(s * (HX + 0.25), GL + 0.2, 0);
    const B = actor(p.bHome.x, p.bHome.y, 0, { stamina: STAMINA_MAX });
    const toGoal = (x, y) => Math.atan2(-x, GL - y);
    const d = (x, y, extra) => actor(x, y, Math.PI, extra);
    state.actors = {
      A, B,
      m1: actor(-s * rand(5, 9), rand(41, 46), 0), m2: actor(s * rand(1, 4), rand(46, 49), 0), m3: actor(rand(-5, 5), 31, 0),
      d1: d(s * 5.2, GL - 3.2, { zone: true }), // ニアポスト
      d2: d(B.x, B.y + 0.9, { crouch: true }),  // 選手B のマーカー
      d3: d(rand(-1, 1), GL - 6.5, { zone: true }),
      d4: d(-s * 4.2, GL - 2.6, { zone: true }), // ファーポスト
      d5: d(clamp(p.bHome.x + (rng() < 0.5 ? -1 : 1) * rand(6, 9), -14, 14), GL - 16, { zone: true }), // エリアの手前(こぼれ球)
      gk: d(s * 0.6, GL - 0.7, { crouch: true }),
      ref: actor(-s * 22, 34, 0),
    };
    for (const k of ['d1', 'd3', 'd4', 'd5']) state.actors[k].home = { x: state.actors[k].x, y: state.actors[k].y };
    for (const k of ['m1', 'm2', 'm3']) { const m = state.actors[k]; m.home = { x: m.x, y: m.y }; m.face = toGoal(m.x, m.y); }
    B.face = toGoal(B.x, B.y);
    A.face = Math.atan2(-s, -0.3);
    state.ball = { holder: null, x: p.corner.x, y: p.corner.y, z: R, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, spinX: 0, spinY: 0, still: true };
    state.target = { x: clamp(p.bHome.x * 0.5, -10, 10), y: 43 };
    state.camF = norm(state.target.x - A.x, state.target.y - A.y);
    pressed.act = null;
  }

  function loadNav() {
    try { return localStorage.getItem('cornerkick.nav') !== '0'; } catch (e) { return true; }
  }
  function toggleNav() {
    state.nav = !state.nav;
    try { localStorage.setItem('cornerkick.nav', state.nav ? '1' : '0'); } catch (e) { /* 保存できない環境 */ }
  }

  // ---------- 選手の動き ----------
  function setMode(p, m) { p.mode = m; p.t = 0; }

  function steer(p, tvx, tvy, acc, dt) {
    const dvx = tvx - p.vx, dvy = tvy - p.vy;
    const dv = Math.hypot(dvx, dvy), maxd = acc * dt;
    if (dv <= maxd) { p.vx = tvx; p.vy = tvy; } else { p.vx += dvx / dv * maxd; p.vy += dvy / dv * maxd; }
  }
  function moveTo(p, x, y, speed, dt, acc = 18) {
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    const s = Math.min(speed, d * 3);
    steer(p, d > 0.01 ? dx / d * s : 0, d > 0.01 ? dy / d * s : 0, acc, dt);
  }
  function integrate(p, dt, faceVel = true) {
    p.t += dt;
    p.x = clamp(p.x + p.vx * dt, -HX - 1.5, HX + 1.5);
    p.y = clamp(p.y + p.vy * dt, -GL, GL + 1.5);
    if (faceVel && Math.hypot(p.vx, p.vy) > 0.6) p.face = Math.atan2(p.vx, p.vy);
  }
  function faceTo(p, x, y) { p.face = Math.atan2(x - p.x, y - p.y); }
  function stopAnim(p, dt, k = 7) {
    const e = Math.exp(-k * dt);
    p.vx *= e; p.vy *= e;
    integrate(p, dt, false);
  }

  // 方角リングとダッシュで走る(選手B)。inp が null なら止まる
  function runControl(P, inp, dt) {
    let mx = inp ? inp.mx : 0, my = inp ? inp.my : 0;
    let mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; mag = 1; }
    const dashing = !!inp && inp.dash && mag > 0.1 && P.stamina > 0;
    P.dashing = dashing;
    const top = dashing ? DASH : WALK;
    steer(P, mx * top, my * top, ACC, dt);
    if (dashing) P.stamina = Math.max(0, P.stamina - dt);
    else P.stamina = Math.min(STAMINA_MAX, P.stamina + STAMINA_REGEN * dt);
  }

  // ---------- ボール ----------
  // 1 ステップ進める。地面で弾む・転がる
  function stepBall(b, dt, sound) {
    b.vx += b.ax * dt; b.vy += b.ay * dt; b.vz -= G * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.z < R) {
      b.z = R;
      if (b.vz < -1.2) {
        b.vz = -b.vz * 0.5;
        b.vx *= 0.8; b.vy *= 0.8;
        b.ax = 0; b.ay = 0;
        b.bounces = (b.bounces || 0) + 1;
        if (sound) Sound.bounce(Math.min(1, b.vz / 4));
      } else {
        b.vz = 0;
        const sp = Math.hypot(b.vx, b.vy);
        const ns = Math.max(0, sp - 3.5 * dt);
        if (sp > 0) { b.vx *= ns / sp; b.vy *= ns / sp; }
        b.ax = 0; b.ay = 0;
        b.bounces = Math.max(1, b.bounces || 0);
      }
    }
  }

  // 今の状態からボールの軌道を予測する(最初に地面に落ちるところまで)
  function predictPath(b, maxT = 3) {
    const q = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, ax: b.ax, ay: b.ay };
    const pts = [];
    const st = 0.02;
    for (let tt = 0; tt <= maxT; tt += st) {
      pts.push({ t: tt, x: q.x, y: q.y, z: q.z, vz: q.vz });
      q.vx += q.ax * st; q.vy += q.ay * st; q.vz -= G * st;
      q.x += q.vx * st; q.y += q.vy * st; q.z += q.vz * st;
      if (q.z < R) { pts.push({ t: tt + st, x: q.x, y: q.y, z: R, vz: q.vz, land: true }); break; }
    }
    return pts;
  }

  // 選手A のキック。落下地点・ゲージから初速を決める(曲がりながら狙った地点に落ちる)
  function kickVelocity(from, to, type) {
    const k = KICK_TYPES[type];
    const d = norm(to.x - from.x, to.y - from.y);
    // インスイング: ゴール側(+y)へ曲がる
    let px = -d.y, py = d.x;
    if (py < 0) { px = -px; py = -py; }
    const ax = px * k.curl, ay = py * k.curl, T = k.T;
    return {
      vx: (to.x - from.x - 0.5 * ax * T * T) / T,
      vy: (to.y - from.y - 0.5 * ay * T * T) / T,
      vz: (0.5 * G * T * T) / T,
      ax, ay,
    };
  }

  function launchBall() {
    const p = state.play, b = state.ball, ch = p.kick;
    const from = { x: b.x, y: b.y };
    const err = ch.g - SWEET;
    const perfect = Math.abs(err) <= SWEET_W;
    const dir = norm(state.target.x - from.x, state.target.y - from.y);
    const along = perfect ? rand(-0.4, 0.4) : err * 15;
    const lat = rand(-1, 1) * (perfect ? 0.3 : 0.4 + Math.abs(err) * 3);
    const to = { x: state.target.x + dir.x * along - dir.y * lat, y: state.target.y + dir.y * along + dir.x * lat };
    Object.assign(b, kickVelocity(from, to, ch.type), { still: false, bounces: 0, touched: false });
    p.landing = to;
    if (perfect) {
      state.perfectKicks++;
      state.score += 100;
      popup(t('gauge.perfect'), '#7dffb0', 34);
      popup('+100', '#9fe8ff', 22, 0.15);
    } else {
      popup(t(err > 0 ? 'gauge.long' : 'gauge.short'), '#ffcc80', 30);
    }
    Sound.kick(0.6 + ch.g * 0.4);
    planDefence();
    state.phase = 'cross';
    state.phaseT = 0;
  }

  // ---------- 守備 ----------
  // ボールが蹴られた時点の軌道から、各ディフェンダー・キーパーが競りに行く場所を決める
  function planDefence() {
    const p = state.play, a = state.actors;
    const path = predictPath(state.ball, 3.2);
    p.path = path;
    for (const k of ['d1', 'd3', 'd4', 'd5']) {
      const d = a[k];
      d.go = null;
      for (const q of path) {
        if (q.t < 0.25 || q.z > p.defReach || q.z < 0.2) continue;
        const need = Math.hypot(q.x - d.x, q.y - d.y) - 0.55;
        if (Math.hypot(q.x - d.home.x, q.y - d.home.y) > 4.5) continue;
        if (need <= p.defSpeed * Math.max(0, q.t - p.defReact)) { d.go = { x: q.x, y: q.y, t: q.t }; break; }
      }
    }
    // キーパー: ゴールエリアに来るボールは飛び出して取る
    const gk = a.gk;
    gk.claim = null;
    for (const q of path) {
      if (q.y < GL - AREA_D || Math.abs(q.x) > AREA_X || q.z > 2.85) continue;
      const need = Math.hypot(q.x - gk.x, q.y - gk.y) - 0.8;
      if (need <= p.gkOut * Math.max(0, q.t - p.gkReact)) { gk.claim = { x: q.x, y: q.y, t: q.t }; break; }
    }
  }

  // ボールに触れられる高さ・距離か(ディフェンダーの頭・足)
  function defenderTouches(d, b, reach) {
    return Math.hypot(b.x - d.x, b.y - d.y) < 0.62 && b.z >= 0.1 && b.z <= reach;
  }

  function updateDefenders(dt) {
    const a = state.actors, p = state.play, b = state.ball, B = a.B;
    const flying = state.phase === 'cross' || state.phase === 'meet';
    const tk = state.phase === 'cross' || state.phase === 'meet' ? state.kickT : 0;
    const preKick = state.phase === 'ready' || state.phase === 'aim' || state.phase === 'kicking';
    for (const k of ['d1', 'd2', 'd3', 'd4', 'd5']) {
      const d = a[k];
      if (d.mode === 'head' && d.t > HEAD_T) setMode(d, 'run');
      if (d.mode === 'kick' && d.t > KICK_T) setMode(d, 'run');
      if (state.phase === 'result' && state.lastResult && state.lastResult.ok && d.mode !== 'sad') setMode(d, 'sad');
      if (d.mode !== 'run') {
        stopAnim(d, dt, 5);
        // ジャンプ中もボールに触れる
        if (flying && d.mode === 'head' && !b.touched && !b.holder && defenderTouches(d, b, p.defReach)) { clearBall(d); return; }
        continue;
      }
      if (preKick) {
        if (k === 'd2') {
          // マーカー: 選手B のゴール側にぴったりつく(押し合い)
          const gdir = norm(-B.x, GL - B.y);
          if (state.phase === 'ready') { d.vx = d.vy = 0; } else moveTo(d, B.x + gdir.x * 0.85, B.y + gdir.y * 0.85, p.markSpeed, dt, 14);
          d.jostle = Math.hypot(d.x - B.x, d.y - B.y) < 1.3;
        } else if (state.phase !== 'ready') {
          moveTo(d, d.home.x + Math.sin(state.time * 0.9 + d.phase) * 0.5, d.home.y, 2, dt, 8);
        }
        integrate(d, dt, false);
        faceTo(d, b.x, b.y);
        continue;
      }
      if (!flying) { d.jostle = false; stopAnim(d, dt, 3); faceTo(d, b.x, b.y); continue; }
      d.jostle = false;
      if (b.touched || b.holder) { stopAnim(d, dt, 3); faceTo(d, b.x, b.y); continue; }
      let tx, ty, sp = p.defSpeed;
      if (b.bounces > 0 && Math.hypot(b.x - d.x, b.y - d.y) < 9) {
        // 落ちたボールは近くの選手が拾いに行く
        tx = b.x; ty = b.y;
      } else if (k === 'd2') {
        // マーカー: 選手B についていく。ボールが近ければ競りに行く
        const gdir = norm(-B.x, GL - B.y);
        tx = B.x + gdir.x * 0.85 + B.vx * 0.15; ty = B.y + gdir.y * 0.85 + B.vy * 0.15;
        sp = p.markSpeed;
        const m = state.meet;
        if (m && Math.hypot(m.x - d.x, m.y - d.y) < 2.2 && m.t - tk < 0.6) { tx = m.x; ty = m.y; }
      } else if (d.go && tk >= p.defReact) {
        tx = d.go.x; ty = d.go.y;
      } else {
        tx = d.home.x; ty = d.home.y;
      }
      moveTo(d, tx, ty, sp, dt, 20);
      integrate(d, dt);
      faceTo(d, b.x, b.y);
      // 頭の高さに来るボールにはジャンプ
      if (d.mode === 'run' && b.z > 1.5 && b.z < p.defReach + 0.6 && Math.hypot(b.x - d.x, b.y - d.y) < 1.6 && b.vz < 2) {
        setMode(d, 'head'); d.jump = clamp(b.z - HEAD_Z, 0.2, 0.7);
      }
      if (!b.touched && defenderTouches(d, b, p.defReach)) { clearBall(d); return; }
      // 落ちたボールに追いついたら蹴り出す
      if (b.bounces > 0 && Math.hypot(b.x - d.x, b.y - d.y) < 0.75 && b.z < 1.2) { clearBall(d); return; }
    }
  }

  function clearBall(d) {
    const b = state.ball;
    const out = norm(b.x * 0.6 + (rng() - 0.5) * 6, -12);
    b.vx = out.x * 15; b.vy = out.y * 15; b.vz = b.z > 1.4 ? 5 : 7; b.ax = b.ay = 0;
    b.touched = true; b.cleared = true;
    if (b.z > 1.3) { Sound.header(); if (d.mode !== 'head') { setMode(d, 'head'); d.jump = 0.3; } }
    else { Sound.kick(0.8); setMode(d, 'kick'); }
    fail('miss.clear');
  }

  // キーパー
  function updateKeeper(dt) {
    const p = state.play, a = state.actors, gk = a.gk, b = state.ball;
    if (b.holder === 'gk') {
      if (gk.mode === 'catch' && gk.t > 0.5) setMode(gk, 'hold');
      stopAnim(gk, dt, 4);
      return;
    }
    if (gk.mode === 'dive') {
      if (gk.t < (gk.diveDur || 0.55)) integrate(gk, dt, false);
      else { stopAnim(gk, dt, 6); if (gk.t > 1.4 && state.phase === 'result') setMode(gk, state.lastResult && state.lastResult.ok ? 'sad' : 'run'); }
      if (state.phase === 'shot' || state.phase === 'slow') checkSave();
      return;
    }
    if (gk.mode === 'catch' || gk.mode === 'sad') { stopAnim(gk, dt, 6); return; }
    if (state.phase === 'result') { stopAnim(gk, dt, 3); faceTo(gk, b.x, b.y); return; }
    if (state.phase === 'slow' || state.phase === 'shot') {
      // シュートに反応して飛ぶ
      const s = state.shotPlan;
      if (s && state.strikeT >= p.gkReact) {
        setMode(gk, 'dive');
        gk.diveDur = clamp(s.T - p.gkReact + 0.05, 0.15, 0.55);
        gk.vx = (s.diveTo - gk.x) / gk.diveDur;
        gk.vy = 0;
        gk.diveX = Math.sign(s.cx - gk.x) || 1; gk.diveY = 0;
        gk.diveZ = clamp(s.cz - 0.6, 0.2, 1.1);
        faceTo(gk, gk.x, gk.y - 5);
      } else stopAnim(gk, dt, 8);
      checkSave();
      return;
    }
    let tx = clamp(b.x * 0.06, -1.6, 1.6), ty = GL - 0.7, sp = 3;
    const flying = state.phase === 'cross' || state.phase === 'meet';
    if (flying && !b.touched && gk.claim && state.kickT >= p.gkReact) { tx = gk.claim.x; ty = gk.claim.y; sp = p.gkOut; }
    // ゴールエリアに落ちて転がるボールも拾う
    if (flying && !b.touched && b.bounces > 0 && b.y > GL - AREA_D && Math.abs(b.x) < AREA_X) { tx = b.x; ty = b.y; sp = p.gkOut; }
    moveTo(gk, tx, ty, sp, dt, 20);
    integrate(gk, dt, false);
    faceTo(gk, b.x, b.y);
    gk.crouch = true;
    const gd = Math.hypot(b.x - gk.x, b.y - gk.y);
    if (flying && !b.touched && !b.holder && gd < 1.0 && b.z < 2.9 && (gk.claim || b.bounces > 0 || gd < 0.7)) {
      b.holder = 'gk';
      setMode(gk, b.z > 1.5 ? 'catch' : 'hold');
      Sound.grab();
      fail('miss.catch');
    }
  }

  // シュートを止められるか(シュートを打った瞬間に決める)
  function planSave(cx, cz, T) {
    const p = state.play, gk = state.actors.gk;
    const onTarget = Math.abs(cx) < GOAL_W + 0.3 && cz < GOAL_H + 0.3;
    let reach = Math.min(Math.max(0, T - p.gkReact) * p.gkSpeed, 2.3) + 0.85;
    if (gk.y < GL - 2) reach *= 0.6;                       // 飛び出していて戻れない
    if (gk.mode === 'catch' || gk.mode === 'dive') reach *= 0.3;
    if (cz > 2.0 || cz < 0.6) reach *= 0.88;               // 上のすみ・足もとは届きにくい
    const need = Math.abs(cx - gk.x);
    const prob = onTarget ? clamp((reach - need + 0.35) / 0.7, 0, 1) : 0;
    const saved = onTarget && rng() < prob;
    const sgn = Math.sign(cx - gk.x) || 1;
    // 止めるときは手が届くところへ、止められないときは届かないところへ飛ぶ
    const diveTo = saved ? cx - sgn * 0.55 : gk.x + sgn * Math.max(0, Math.min(need - 1.4, reach - 0.85));
    return { cx, cz, T, saved, diveTo, prob };
  }

  function checkSave() {
    const s = state.shotPlan, b = state.ball, gk = state.actors.gk;
    if (!s || !s.saved || s.done || b.holder) return;
    if (state.strikeT < s.T - 0.04) return;
    s.done = true;
    if (rng() < 0.45 && s.cz < 2.0) {
      b.holder = 'gk';
      Sound.grab();
    } else {
      // はじく
      const sgn = Math.sign(b.x - gk.x) || 1;
      b.vx = sgn * rand(3, 6); b.vy = -Math.abs(b.vy) * 0.25 - 2; b.vz = rand(2, 5); b.ax = b.ay = 0;
      Sound.grab();
    }
    fail('miss.save');
  }

  // ---------- 選手B ----------
  // キックまでは自分でマークを外そうと動き回る。切り替え後は方角リングとダッシュで動かし、ボタンでヘディング・シュート
  function updateB(B, inp, dt) {
    const p = state.play, b = state.ball;
    if (state.phase === 'ready' || state.phase === 'aim' || state.phase === 'cross') {
      if (state.phase === 'ready') { B.vx = B.vy = 0; integrate(B, dt); return; }
      const hx = p.bHome.x + Math.sin(state.time * 1.3 + B.phase) * 1.4, hy = p.bHome.y + Math.cos(state.time * 0.8 + B.phase) * 1.0;
      moveTo(B, hx, hy, 3, dt, 10);
      integrate(B, dt, false);
      faceTo(B, b.x, b.y);
      B.jostle = state.actors.d2.jostle;
      return;
    }
    B.jostle = false;
    if (B.mode === 'head') {
      // ジャンプ中は勢いが少し残る
      const k = Math.exp(-2.5 * dt);
      B.vx *= k; B.vy *= k;
      integrate(B, dt, false);
      if (B.t >= HEAD_T) setMode(B, 'run');
      return;
    }
    if (B.mode === 'kick') {
      stopAnim(B, dt, 5);
      if (B.t >= KICK_T) setMode(B, 'run');
      return;
    }
    if (B.mode === 'celebrate' || B.mode === 'sad') { stopAnim(B, dt, 4); return; }
    runControl(B, state.phase === 'meet' ? inp : null, dt);
    integrate(B, dt);
    if (state.phase === 'meet' && Math.hypot(B.vx, B.vy) < 0.8) faceTo(B, b.x, b.y);
    if (state.phase === 'meet' && inp.act) {
      if (inp.act === 'act1') { setMode(B, 'head'); B.jump = JUMP; Sound.bump(); }
      else { setMode(B, 'kick'); faceTo(B, b.x + b.vx * 0.15, b.y + b.vy * 0.15); }
    }
  }

  // 頭・足とボールの位置関係。合えば 0〜1 の「当たりの良さ」、合わなければ -1
  function headQuality(B, b, tt) {
    if (tt < 0.06 || tt > 0.48) return -1;
    const hz = HEAD_Z + JUMP * Math.sin(Math.PI * Math.min(1, tt / 0.55));
    const d = Math.hypot(b.x - B.x, b.y - B.y), dz = Math.abs(b.z - hz);
    if (d > 0.85 || dz > 0.5) return -1;
    return clamp(1 - (d / 0.85) * 0.6 - (dz / 0.5) * 0.4, 0, 1);
  }
  function kickQuality(B, b, tt) {
    if (tt < 0.08 || tt > 0.32) return -1;
    const fx = B.x + Math.sin(B.face) * 0.45, fy = B.y + Math.cos(B.face) * 0.45;
    const d = Math.hypot(b.x - fx, b.y - fy);
    if (d > 0.95 || b.z > 1.3) return -1;
    return clamp(1 - (d / 0.95) * 0.7 - Math.max(0, b.z - 0.9) / 0.4 * 0.3, 0, 1);
  }

  function checkStrike() {
    const B = state.actors.B, b = state.ball;
    if (b.touched || b.holder) return;
    if (B.mode === 'head') {
      const q = headQuality(B, b, B.t);
      if (q >= 0) strike('head', q);
    } else if (B.mode === 'kick') {
      const q = kickQuality(B, b, B.t);
      if (q >= 0) strike(b.z > 0.45 ? 'volley' : 'shot', q);
    }
  }

  // ボールに合わせた: ゴールへ向かって飛ばす。コースはキーパーのいない側。方角リングを真横に倒していればその側へ
  function strike(kind, q) {
    const a = state.actors, B = a.B, b = state.ball, gk = a.gk;
    b.touched = true;
    b.ax = b.ay = 0;
    const roomR = GOAL_W - gk.x, roomL = GOAL_W + gk.x;
    const aimed = Math.abs(input.sx) >= 0.7 && Math.abs(input.sy) < 0.5;
    const side = aimed ? (input.mx > 0 ? 1 : -1) : (roomR > roomL ? 1 : -1);
    const tx = side * 2.6, tz = kind === 'head' ? 0.7 : 0.8;
    const dist = Math.hypot(tx - b.x, GL - b.y);
    const spread = (0.2 + (1 - q) * 1.1) * clamp(dist / 10, 0.7, 2.2);
    const cx = tx + gauss() * spread;
    let cz = tz + gauss() * spread * 0.5 + (1 - q) * (kind === 'head' ? 0.35 : 0.6);
    cz = Math.max(R, cz);
    const speed = kind === 'head' ? 13 + 6 * q : kind === 'volley' ? 19 + 7 * q : 17 + 6 * q;
    const T = dist / speed;
    b.vx = (cx - b.x) / T; b.vy = (GL - b.y) / T; b.vz = (cz - b.z + 0.5 * G * T * T) / T;
    state.strike = { kind, q, x: B.x, y: B.y };
    state.strikeT = 0;
    state.shotPlan = planSave(cx, cz, T);
    if (kind === 'head') Sound.header(); else Sound.kick(1);
    B.face = Math.atan2(cx - B.x, GL - B.y);
    state.camF = norm(cx - B.x, GL - B.y);
    state.phase = 'slow';
    state.phaseT = 0;
    state.slowReal = 0;
  }

  // ゴールラインを越えたか(ゴール・ポスト・バー・枠外)
  function checkGoalLine(prevY) {
    const b = state.ball;
    if (b.holder || b.inNet || !(prevY < GL && b.y >= GL)) return null;
    const x = b.x, z = b.z;
    const ax = Math.abs(x);
    if (ax < GOAL_W - R && z < GOAL_H - R) { b.inNet = true; return 'goal'; }
    if (ax < GOAL_W + R + 0.06 && ax > GOAL_W - R - 0.06 && z < GOAL_H + 0.06) {
      b.y = GL - 0.02; b.vy = -Math.abs(b.vy) * 0.55; b.vx = b.vx * 0.5 + Math.sign(x) * -1.5;
      Sound.post();
      return 'post';
    }
    if (ax < GOAL_W + 0.06 && z >= GOAL_H - R - 0.06 && z < GOAL_H + R + 0.08) {
      b.y = GL - 0.02; b.vy = -Math.abs(b.vy) * 0.5; b.vz = Math.abs(b.vz) * 0.3 + 1.5;
      Sound.post();
      return 'bar';
    }
    return z >= GOAL_H ? 'over' : 'wide';
  }

  // ネットの中: 奥の網で止まる
  function netBall(b, dt) {
    if (!b.inNet) return;
    const back = GL + 2.0 - (b.z / GOAL_H) * 1.0;
    if (b.y > back) {
      b.y = back;
      if (b.vy > 3) Sound.net();
      b.vy = -b.vy * 0.12; b.vx *= 0.4; b.vz *= 0.5;
    }
    if (Math.abs(b.x) > GOAL_W - R) { b.x = Math.sign(b.x) * (GOAL_W - R); b.vx = -b.vx * 0.2; }
    if (b.z > GOAL_H - R) { b.z = GOAL_H - R; b.vz = -Math.abs(b.vz) * 0.2; }
    if (b.y < GL + R) { b.y = GL + R; b.vy = Math.abs(b.vy) * 0.2; }
  }

  function updateBall(dt) {
    const b = state.ball;
    if (b.holder || b.still) return;
    const prevY = b.y;
    stepBall(b, dt, true);
    const sp = Math.hypot(b.vx, b.vy, b.vz);
    b.spinX += sp * dt * 5; b.spinY += b.vx * dt * 2;
    netBall(b, dt);
    const res = checkGoalLine(prevY);
    if (!res) {
      if (state.phase !== 'result' && (Math.abs(b.x) > HX + 0.3 || b.y > GL + 0.3 || b.y < 12)) fail('miss.out');
      return;
    }
    if (state.phase === 'result') return;
    if (res === 'goal') {
      if (b.touched && state.strike) onGoal(state.strike.kind);
      else if (!b.touched) onGoal('direct');
      else fail('miss.out');
    } else if (res === 'post' || res === 'bar') {
      if (state.phase === 'shot' || state.phase === 'slow') fail(res === 'post' ? 'miss.post' : 'miss.bar');
    } else if (state.phase === 'shot' || state.phase === 'slow') {
      fail(res === 'over' ? 'miss.over' : 'miss.wide');
    } else fail('miss.out');
  }

  // ---------- 結果 ----------
  function onGoal(kind) {
    const a = state.actors, s = state.shotPlan;
    state.goals++;
    if (kind === 'head') state.headers++;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    const corner = s && Math.abs(s.cx) > 2.6 && kind !== 'direct';
    let pts = 1000 + ({ head: 300, volley: 200, shot: 100, direct: 1500 })[kind] + (corner ? 200 : 0) + Math.min(state.streak - 1, 5) * 100;
    if (state.strike) pts += Math.round(state.strike.q * 200);
    state.score += pts;
    state.lastResult = { ok: true, kind };
    state.msg = null;
    popup(t('goal'), '#ffe14d', 64);
    popup(t('goal.' + kind), '#ff8a65', 30, 0.2);
    if (corner) popup(t('goal.corner'), '#7dffb0', 24, 0.35);
    popup('+' + pts, '#9fe8ff', 26, 0.5);
    setMode(a.B, 'celebrate');
    a.ref.mode = 'signal';
    const great = kind === 'head' || kind === 'direct' || corner;
    const milestone = state.streak > 0 && state.streak % 3 === 0;
    Sound.cheer(great ? 1.6 : 1.3, great ? 5 : 4);
    Sound.whistle(0.4);
    let n = great ? 7 : 5;
    if (milestone) { n += 4; popup(t('streak', { n: state.streak }), '#ff8a65', 34, 0.65); }
    fireworks(n, great);
    endPlay();
  }

  function fireworks(n, big, gap = 0.28) {
    for (let i = 0; i < n; i++) {
      const tt = 0.1 + i * gap + Math.random() * 0.15;
      Scene3D.firework(tt, big);
      Sound.launch(tt);
      Sound.boom(tt + Scene3D.ROCKET_T);
    }
  }

  function fail(key) {
    if (state.phase === 'result') return;
    state.streak = 0;
    state.lastResult = { ok: false, key };
    state.msg = null;
    popup(t(key), '#ff6b6b', 44, 0, 2.6);
    Sound.sigh(key === 'miss.post' || key === 'miss.bar' || key === 'miss.save' ? 1.3 : 1);
    endPlay();
  }

  function endPlay() {
    state.phase = 'result';
    state.phaseT = 0;
  }

  function popup(text, color, size, delay = 0, life = 1.6) {
    state.popups.push({ text, color, size, t: -delay, life, idx: state.popups.length });
  }

  // 味方(おとり)とキッカー・審判
  function updateTeam(dt) {
    const a = state.actors, p = state.play, b = state.ball;
    const goal = state.phase === 'result' && state.lastResult && state.lastResult.ok;
    for (const k of ['m1', 'm2', 'm3']) {
      const m = a[k];
      if (state.phase === 'ready') { m.vx = m.vy = 0; integrate(m, dt); continue; }
      if (goal) {
        // ゴールを決めた選手B のところへ駆け寄る
        const B = a.B;
        if (Math.hypot(B.x - m.x, B.y - m.y) > 1.6) { moveTo(m, B.x, B.y, 7, dt, 12); integrate(m, dt); }
        else { setMode(m, 'celebrate'); stopAnim(m, dt); }
        continue;
      }
      if (m.mode !== 'run') setMode(m, 'run');
      let tx = m.home.x + Math.sin(state.time + m.phase) * 0.8, ty = m.home.y;
      // キックのあとはニア・ファーへ走り込む
      if (state.phase === 'cross' || state.phase === 'meet') {
        tx = k === 'm1' ? -p.side * 3.5 : k === 'm2' ? p.side * 2.5 : m.home.x;
        ty = k === 'm3' ? m.home.y + 3 : GL - 4;
      }
      moveTo(m, tx, ty, state.phase === 'cross' || state.phase === 'meet' ? 6 : 2.5, dt, 12);
      integrate(m, dt);
      if (Math.hypot(m.vx, m.vy) < 0.6) faceTo(m, b.x, b.y);
    }
    const A = a.A;
    if (A.mode === 'kick') {
      A.vx = A.vy = 0; integrate(A, dt, false);
      if (A.t > 0.75) setMode(A, 'run');
    } else if (goal) {
      moveTo(A, a.B.x + 2, a.B.y - 1.5, 7.5, dt, 12); integrate(A, dt);
      if (Math.hypot(A.vx, A.vy) < 0.6) A.mode = 'celebrate';
    } else if (state.phase === 'ready' || state.phase === 'aim') {
      A.vx = A.vy = 0; integrate(A, dt, false);
      faceTo(A, state.target.x, state.target.y);
    } else {
      moveTo(A, p.side * (HX - 3), GL - 3, 3, dt, 8); integrate(A, dt);
      if (Math.hypot(A.vx, A.vy) < 0.6) faceTo(A, b.x, b.y);
    }
    const r = a.ref;
    if (r.mode !== 'signal') {
      moveTo(r, clamp(b.x * 0.2 - p.side * 21, -HX + 2, HX - 2), 34, 4, dt, 8);
      integrate(r, dt);
      if (Math.hypot(r.vx, r.vy) < 0.6) faceTo(r, b.x, b.y);
    } else stopAnim(r, dt);
  }

  // ---------- 選手A のキック(狙い・ゲージ) ----------
  function updateAim(dt) {
    const p = state.play, T = state.target;
    // 落下地点を動かす(画面の向き基準)
    T.x = clamp(T.x + input.mx * 10 * dt, -24, 24);
    T.y = clamp(T.y + input.my * 10 * dt, 30, GL - 0.5);
    state.camF = norm(T.x - state.actors.A.x, T.y - state.actors.A.y);
    const ch = state.charge;
    if (!ch) {
      if (input.act === 'act1' || input.act === 'act2') {
        state.charge = { btn: input.act, type: input.act === 'act1' ? 'high' : 'low', g: 0, dir: 1 };
      } else if (state.phaseT > AIM_LIMIT) {
        state.charge = { btn: null, type: 'high', g: 0.55, dir: 0 };
        kick();
      }
      return;
    }
    ch.g += ch.dir * dt / GAUGE_T;
    if (ch.g >= 1) { ch.g = 2 - ch.g; ch.dir = -1; }
    if (ch.g <= 0) { ch.g = -ch.g; ch.dir = 1; }
    if (!isHeld(ch.btn) || state.phaseT > AIM_LIMIT + 2) kick();
  }

  function kick() {
    const p = state.play, ch = state.charge;
    p.kick = { type: ch.type, g: clamp(ch.g, 0, 1) };
    state.charge = null;
    setMode(state.actors.A, 'kick');
    state.phase = 'kicking';
    state.phaseT = 0;
  }

  // スマホは横画面で遊ぶ。縦向きの間は案内を出して一時停止する
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const portraitMQ = window.matchMedia('(orientation: portrait)');
  const isPortrait = () => isTouch && portraitMQ.matches;

  // スタートのタップで全画面+横向き固定を試す(Android Chrome など。iPhone は非対応なので何もしない)
  function goLandscape() {
    if (!isTouch) return;
    const el = document.documentElement;
    const lock = () => {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    };
    try {
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(lock, () => {});
      else lock();
    } catch (e) { /* 非対応 */ }
  }
  canvas.addEventListener('pointerup', () => { if (state.phase === 'title' || state.phase === 'over') goLandscape(); });

  function togglePause() {
    if (state.phase === 'title' || state.phase === 'over') return;
    state.paused = !state.paused;
  }

  // ---------- 更新 ----------
  function update(dt) {
    state.time += dt;
    if (state.phase === 'title') {
      if (pressed.start) { pressed.start = false; newGame(); }
      return;
    }
    if (state.phase === 'over') {
      state.overT += dt;
      if (pressed.start && state.overT > 1.0) { pressed.start = false; newGame(); }
      pressed.start = false;
      return;
    }
    pressed.start = false;
    if (isPortrait()) { if (!state.paused) state.paused = true; return; }
    if (state.paused) return;

    readInput();
    pressed.act = null;
    if (state.nav && (state.phase === 'aim' || state.phase === 'meet')) state.navUsed = true;

    // ボールに合わせた瞬間はスローモーション
    let sdt = dt;
    if (state.phase === 'slow') {
      state.slowReal += dt;
      sdt = dt * SLOW_K;
    }
    state.phaseT += sdt;
    if (state.phase === 'cross' || state.phase === 'meet') state.kickT = (state.kickT || 0) + sdt;
    if (state.phase === 'slow' || state.phase === 'shot') state.strikeT += sdt;
    const a = state.actors, p = state.play;

    if (state.phase === 'aim') updateAim(dt);
    if (state.phase === 'kicking' && a.A.t >= 0.17) { state.kickT = 0; launchBall(); }

    updateTeam(sdt);
    updateB(a.B, input, sdt);
    updateDefenders(sdt);
    updateKeeper(sdt);
    const steps = state.phase === 'slow' || state.phase === 'shot' ? 3 : 1; // 速いシュートはゴールの枠の判定のため細かく
    for (let i = 0; i < steps; i++) updateBall(sdt / steps);
    if (state.phase === 'meet') checkStrike();

    if (state.phase === 'cross' && state.phaseT >= 0.35) startMeet();
    if (state.phase === 'meet' && state.phaseT > 5.5) fail('miss.none');
    if (state.phase === 'slow' && state.slowReal >= SLOW_T) { state.phase = 'shot'; state.phaseT = 0; }
    if (state.phase === 'shot' && state.phaseT > 3) fail('miss.none');
    if (state.msg) state.msg.t += dt;

    updateGuide();
    updateView();

    for (const pp of state.popups) pp.t += dt;
    state.popups = state.popups.filter((pp) => pp.t < pp.life);

    if (state.phase === 'ready' && state.phaseT >= 1.6) {
      state.phase = 'aim';
      state.phaseT = 0;
      state.msg = { key: isTouch ? 'msg.aim' : 'msg.aim.key', t: 0 };
      Sound.whistle(0.35);
    }
    const resultT = state.lastResult && state.lastResult.ok ? 3.6 : 2.8;
    if (state.phase === 'result' && state.phaseT >= resultT) {
      state.index++;
      if (state.index >= TOTAL) gameOver();
      else startPlay();
    }
  }

  // 選手B に切り替え
  function startMeet() {
    const p = state.play, B = state.actors.B;
    state.phase = 'meet';
    state.phaseT = 0;
    p.switched = true;
    B.stamina = STAMINA_MAX;
    B.vx *= 0.3; B.vy *= 0.3;
    // カメラ: ゴールの方向から少しコーナー側へ振って、飛んでくるボールが見えるようにする
    const g = norm(-B.x, GL - B.y), th = p.side * 0.62;
    state.camF = { x: g.x * Math.cos(th) + g.y * Math.sin(th), y: -g.x * Math.sin(th) + g.y * Math.cos(th) };
    state.viewCut = true;
    state.msg = { key: 'msg.meet', t: 0 };
    popup(t('msg.switchBig'), '#ffe14d', 44, 0.05);
    Sound.whoosh();
  }

  // ナビ: キックの軌道、ボールに合わせる場所(緑の輪)、今ボタンを押せば当たる(オレンジの輪+ボタン点滅)
  function wouldConnect(kind) {
    const B = state.actors.B, b = state.ball;
    const q = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz };
    const P = { x: B.x, y: B.y, face: Math.atan2(b.x + b.vx * 0.15 - B.x, b.y + b.vy * 0.15 - B.y) };
    const k = Math.exp(-2.5 * 0.02);
    let vx = B.vx, vy = B.vy;
    for (let tt = 0; tt < 0.5; tt += 0.02) {
      q.vx += b.ax * 0.02; q.vy += b.ay * 0.02; q.vz -= G * 0.02;
      q.x += q.vx * 0.02; q.y += q.vy * 0.02; q.z = Math.max(R, q.z + q.vz * 0.02);
      if (kind === 'head') { vx *= k; vy *= k; P.x += vx * 0.02; P.y += vy * 0.02; }
      const qq = kind === 'head' ? headQuality(P, q, tt + 0.02) : kickQuality(P, q, tt + 0.02);
      if (qq >= 0.25) return true;
    }
    return false;
  }

  function updateGuide() {
    const p = state.play, b = state.ball;
    state.guide = {};
    state.hintBtn = null;
    if (state.phase === 'aim' || state.phase === 'ready') state.guide.target = state.target;
    if (state.phase === 'aim' && state.nav) {
      const from = { x: b.x, y: b.y, z: R, ax: 0, ay: 0 };
      state.path = {};
      for (const type of ['high', 'low']) state.path[type] = predictPath(Object.assign({}, from, kickVelocity(from, state.target, type)), 2.2);
    } else state.path = null;
    // 頭で合わせられる場所(落ちてくるボールが頭の高さを通るところ)。低いボールは足で合わせるところ
    state.meet = null;
    if ((state.phase === 'cross' || state.phase === 'meet') && !b.touched && !b.holder) {
      const path = predictPath(b, 2.5);
      for (const q of path) {
        if (q.vz < 0 && q.z <= 2.25) { state.meet = { x: q.x, y: q.y, t: (state.kickT || 0) + q.t, z: q.z }; break; }
      }
      if (state.nav && state.phase === 'meet' && state.meet) state.guide.meet = state.meet;
      if (state.nav && state.phase === 'meet' && state.actors.B.mode === 'run') {
        if (wouldConnect('head')) state.hintBtn = 'act1';
        else if (wouldConnect('kick')) state.hintBtn = 'act2';
        if (state.hintBtn) state.guide.hit = { x: state.actors.B.x, y: state.actors.B.y };
      }
    }
  }

  function updateView() {
    const a = state.actors, p = state.play;
    const useB = controllingB();
    const P = useB ? a.B : a.A;
    let F = state.camF, back = 5.2, h = 3.0, pitch = -0.07, turn = 4.5;
    if (useB) {
      back = 6.6; h = 3.9; pitch = -0.13; turn = state.phase === 'slow' || state.phase === 'shot' ? 2.2 : 2.5;
      const b = state.ball;
      if (state.phase === 'meet' && !b.touched) {
        // 飛んでくるボールを画面に入れる: 少しボールのほうへ向き、高いボールは見上げる
        const d = norm(b.x - P.x, b.y - P.y), hd = Math.hypot(b.x - P.x, b.y - P.y) + back;
        F = norm(F.x * 0.65 + d.x * 0.35, F.y * 0.65 + d.y * 0.35);
        pitch = clamp(Math.atan2(b.z - h, hd) * 0.8 + 0.02, -0.13, 0.32);
      }
      if (state.phase === 'result' && state.lastResult && state.lastResult.ok && state.phaseT > 0.6) pitch = 0.17;
    } else if (state.phase === 'cross' || state.phase === 'kicking') {
      turn = 2;
    } else if (state.phase === 'result') {
      // 選手A のまま終わった(直接ゴール・キーパー・クリア)ときはボールを見る
      const d = norm(state.ball.x - P.x, state.ball.y - P.y);
      F = d;
      if (state.lastResult && state.lastResult.ok && state.phaseT > 0.6) pitch = 0.17;
    }
    state.view = { x: P.x, y: P.y, fx: F.x, fy: F.y, back, h, pitch, turn, cut: !!state.viewCut };
    state.viewCut = false;
  }

  function gameOver() {
    state.phase = 'over';
    state.overT = 0;
    const best = state.best;
    if (!best || state.goals > best.goals || (state.goals === best.goals && state.score > best.score)) {
      state.best = { goals: state.goals, score: state.score };
      state.newRecord = true;
      saveBest(state.best);
    }
    const perfect = state.goals === TOTAL;
    Sound.whistle(0.5);
    setTimeout(() => Sound.whistle(0.5), 600);
    setTimeout(() => Sound.whistle(1.2), 1200);
    Sound.cheer(perfect ? 1.6 : 0.9, perfect ? 6 : 3);
    if (perfect) fireworks(16, true, 0.35); else if (state.goals >= 7) fireworks(6, false, 0.4);
  }

  // ---------- 描画(2D オーバーレイ) ----------
  // ミニマップ(ゴール前を上から。攻めるゴールが上)
  function drawMinimap() {
    const mw = 150, mh = 66, mx = W - mw - 12, my = 12;
    const sc = mw / 72;
    const tx = (x) => mx + mw / 2 + x * sc, ty = (y) => my + (GL + 1.5 - y) * sc;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
    ctx.fillStyle = '#3c8a3f';
    ctx.fillRect(tx(-HX), ty(GL), HX * 2 * sc, mh);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
    ctx.strokeRect(tx(-HX), ty(GL), HX * 2 * sc, 60 * sc);
    ctx.strokeRect(tx(-20.16), ty(GL), 40.32 * sc, 16.5 * sc);
    ctx.strokeRect(tx(-AREA_X), ty(GL), AREA_X * 2 * sc, AREA_D * sc);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(tx(-GOAL_W), ty(GL) - 1); ctx.lineTo(tx(GOAL_W), ty(GL) - 1); ctx.stroke();
    if (state.phase === 'aim' || state.phase === 'ready') {
      ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(tx(state.target.x), ty(state.target.y), 3.5, 0, Math.PI * 2); ctx.stroke();
    }
    const a = state.actors;
    for (const [k, p] of Object.entries(a)) {
      const col = k === 'ref' ? '#222' : k === 'gk' ? '#ff9800' : k[0] === 'd' ? '#4f7cff' : '#ff5a5a';
      const me = (k === 'A' && !controllingB()) || (k === 'B' && controllingB());
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(tx(p.x), ty(p.y), me ? 3.6 : 2.4, 0, Math.PI * 2); ctx.fill();
      if (me) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    const b = state.ball;
    if (b) {
      const h = b.holder && a[b.holder];
      const bx = h ? h.x : b.x, by = h ? h.y : b.y;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(tx(bx), ty(by), 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(12, 12, 290, 100);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(t('hud.play', { n: Math.min(state.index + 1, TOTAL), t: TOTAL }), 24, 40, 270);
    ctx.font = 'bold 16px sans-serif';
    let hx = 24;
    for (const [key, n, col] of [['hud.goals', state.goals, '#ffe14d'], ['hud.headers', state.headers, '#9fe8ff'], ['hud.streak', state.streak, '#ff8a65']]) {
      const label = t(key, { n });
      ctx.fillStyle = col;
      ctx.fillText(label, hx, 64);
      hx += Math.max(70, ctx.measureText(label).width + 12);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`SCORE ${state.score}`, 24, 86);

    // スタミナ(選手B のダッシュ)
    if (controllingB()) {
      const st = state.actors.B.stamina / STAMINA_MAX;
      ctx.fillStyle = '#333';
      ctx.fillRect(24, 94, 266, 8);
      ctx.fillStyle = st > 0.3 ? '#6be37a' : '#ff9a3c';
      ctx.fillRect(24, 94, 266 * st, 8);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#ddd';
      ctx.textAlign = 'right';
      ctx.fillText(t('hud.dash'), 290, 90);
      ctx.textAlign = 'left';
    }

    // 操作中の選手
    const who = controllingB() ? 'B' : 'A';
    ctx.fillStyle = who === 'A' ? 'rgba(208,16,46,0.88)' : 'rgba(255,180,0,0.92)';
    ctx.fillRect(312, 12, 150, 34);
    ctx.fillStyle = who === 'A' ? '#fff' : '#1b1200';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(t(who === 'A' ? 'hud.playerA' : 'hud.playerB'), 320, 35, 136);
  }

  function btnLabel(name) {
    if (name === 'dash') return [t('btn.dash'), ''];
    if (controllingB()) return [t(name === 'act1' ? 'btn.head' : 'btn.shoot'), ''];
    return [t(name === 'act1' ? 'btn.high' : 'btn.low'), t('btn.kick')];
  }

  function drawControls() {
    // 方角リング
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(RING.x, RING.y, RING.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    const mx = input.sx, my = input.sy;
    const mag = Math.hypot(mx, my);
    const cur = mag > 0.1 ? Math.atan2(mx, my) : null;
    for (let i = 0; i < 16; i++) {
      const ang = i * Math.PI / 8;
      const major = i % 2 === 0;
      const diff = cur == null ? 9 : Math.abs(((ang - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const lit = diff < 0.2;
      ctx.fillStyle = lit ? '#ffe14d' : (major ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)');
      const rr = RING.r - 12;
      ctx.beginPath();
      ctx.arc(RING.x + Math.sin(ang) * rr, RING.y - Math.cos(ang) * rr, lit ? 7 : (major ? 4.5 : 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const aimRing = !controllingB();
    ctx.fillText(t(aimRing ? 'ring.aimFwd' : 'ring.fwd'), RING.x, RING.y - RING.r - 6);
    ctx.fillText(t(aimRing ? 'ring.aimBack' : 'ring.back'), RING.x, RING.y + RING.r + 15);
    const kx = RING.x + mx * RING.r * 0.6, ky = RING.y - my * RING.r * 0.6;
    ctx.fillStyle = mag > 0.1 ? '#ffe14d' : 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(kx, ky, RING.r * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // ボタン
    ctx.save();
    const shown = buttonsShown();
    const dim = state.phase === 'slow' || state.phase === 'shot' || state.phase === 'result' || state.phase === 'ready';
    for (const name of shown) {
      const b = BTN[name];
      let on = isHeld(name);
      if (name === 'dash' && input.dash) on = true;
      if (state.charge && state.charge.btn === name) on = true;
      const hint = state.hintBtn === name && Math.floor(state.time * 10) % 2 === 0;
      ctx.globalAlpha = dim ? 0.4 : 0.88;
      ctx.fillStyle = on ? 'rgba(255,225,77,0.9)' : hint ? 'rgba(255,140,60,0.8)' : 'rgba(0,0,0,0.42)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2.5; ctx.stroke();
      // ボールのアイコン(高く=上向きの弧、低く=まっすぐ)
      if (name !== 'dash' && !controllingB()) {
        ctx.save();
        const ak = b.r / 46;
        ctx.translate(b.x, b.y - b.r * 0.55);
        ctx.scale(ak, ak);
        ctx.strokeStyle = on ? '#222' : '#ffe14d'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (name === 'act1') { ctx.moveTo(-16, 6); ctx.quadraticCurveTo(0, -14, 16, 6); }
        else { ctx.moveTo(-16, 2); ctx.quadraticCurveTo(0, -4, 16, 2); }
        ctx.stroke();
        ctx.restore();
      }
      const [l1, l2] = btnLabel(name);
      ctx.fillStyle = on ? '#222' : '#fff';
      ctx.textAlign = 'center';
      const fk = b.r / 46;
      if (l2) {
        ctx.font = `bold ${Math.round(18 * fk)}px sans-serif`;
        ctx.fillText(l1, b.x, b.y + 4 * fk, b.r * 1.5);
        ctx.font = `bold ${Math.round(11 * fk)}px sans-serif`;
        ctx.fillText(l2, b.x, b.y + 19 * fk, b.r * 1.6);
      } else {
        ctx.font = `bold ${Math.round((name === 'act1' && controllingB() ? 14 : 15) * fk)}px sans-serif`;
        ctx.fillText(l1, b.x, b.y + 5 * fk, b.r * 1.7);
      }
      if (!isTouch) { ctx.font = '10px sans-serif'; ctx.fillText(b.key, b.x, b.y + b.r - 8); }
    }
    ctx.restore();
  }

  // キックのゲージ(緑のゾーンで離すとピタリ)
  function drawGauge() {
    if (state.phase !== 'aim' && state.phase !== 'kicking') return;
    const ch = state.charge || (state.phase === 'kicking' ? { g: state.play.kick.g } : null);
    const w = Math.min(340, W * 0.34), h = 22, x = W / 2 - w / 2, y = H - 74;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 8, y - 26, w + 16, h + 36);
    ctx.fillStyle = '#ddd';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('btn.kick'), W / 2, y - 9);
    const gr = ctx.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, '#3b4a63'); gr.addColorStop(1, '#ff6b4a');
    ctx.fillStyle = gr;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#3cff8a';
    ctx.fillRect(x + w * (SWEET - SWEET_W), y, w * SWEET_W * 2, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
    if (ch) {
      const gx = x + w * ch.g;
      ctx.fillStyle = '#fff';
      ctx.fillRect(gx - 3, y - 5, 6, h + 10);
    }
    ctx.restore();
  }

  // キックの軌道の予測(ナビ ON のとき)。投影した点を並べる
  function drawPath() {
    if (!state.path || state.phase !== 'aim') return;
    const sel = state.charge ? state.charge.type : null;
    for (const type of ['high', 'low']) {
      const pts = state.path[type];
      if (!pts) continue;
      const on = sel === type;
      ctx.fillStyle = type === 'high' ? (on ? '#7fe3ff' : 'rgba(127,227,255,0.45)') : (on ? '#ffb74d' : 'rgba(255,183,77,0.45)');
      for (let i = 4; i < pts.length; i += 3) {
        const q = pts[i];
        const s = Scene3D.project(q.x, q.y, q.z);
        if (s.behind) continue;
        ctx.beginPath(); ctx.arc(s.x, s.y, on ? 3.2 : 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawPopups() {
    ctx.textAlign = 'center';
    let line = 0;
    for (const p of state.popups) {
      if (p.t < 0) continue;
      const a = Math.min(1, (p.life - p.t) / 0.4);
      const sc = 1 + Math.max(0, 0.25 - p.t) * 1.5;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W / 2, (isTouch ? 230 : 190) + line * 56 - p.t * 14);
      ctx.scale(sc, sc);
      ctx.font = `900 ${p.size}px sans-serif`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(p.text, 0, 0, W - 60);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0, W - 60);
      ctx.restore();
      line++;
    }
  }

  function drawMessage() {
    const m = state.msg;
    if (!m || state.phase === 'result') return;
    const blink = m.key === 'msg.meet' && Math.floor(state.time * 8) % 2 === 0;
    const text = t(m.key);
    ctx.save();
    ctx.font = 'bold 19px sans-serif';
    const w = Math.min(W - 40, ctx.measureText(text).width + 36);
    ctx.fillStyle = m.key === 'msg.meet' ? 'rgba(160,60,0,0.75)' : 'rgba(0,0,0,0.55)';
    const my = isTouch ? 158 : 120;
    ctx.fillRect(W / 2 - w / 2, my, w, 36);
    ctx.fillStyle = blink ? '#ffe14d' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, my + 25, w - 20);
    // 狙う時間の残り
    if (state.phase === 'aim' && state.phaseT > AIM_LIMIT - 5 && !state.charge) {
      ctx.fillStyle = '#ffcc80';
      ctx.fillText(String(Math.max(0, Math.ceil(AIM_LIMIT - state.phaseT))), W / 2, my + 62);
    }
    ctx.restore();
  }

  // 「右コーナー」「左コーナー」の大きな掛け声
  function drawCall() {
    const p = state.play;
    if (!p || state.paused) return;
    let a = 0, k = 1;
    if (state.phase === 'ready') { a = Math.min(1, state.phaseT / 0.2); k = 1 + Math.max(0, 0.2 - state.phaseT) * 2.5; }
    else if (state.phase === 'aim' && state.phaseT < 0.9) { a = 1 - state.phaseT / 0.9; k = 1 + state.phaseT * 0.5; }
    if (a <= 0) return;
    const text = t(p.side > 0 ? 'call.right' : 'call.left');
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, 315);
    ctx.scale(k, k);
    ctx.font = '900 96px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(text, 0, 0, W - 80);
    ctx.fillStyle = '#ffe14d';
    ctx.fillText(text, 0, 0, W - 80);
    ctx.restore();
  }

  function centerText(text, y, size, color = '#fff', weight = 'bold') {
    ctx.font = `${weight} ${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(text, W / 2, y, W - 40);
    ctx.fillStyle = color;
    ctx.fillText(text, W / 2, y, W - 40);
  }

  function drawTitle() {
    ctx.fillStyle = 'rgba(8,14,20,0.55)';
    ctx.fillRect(0, 0, W, H);
    centerText(t('title.name'), 140, 76, '#ffe14d', '900');
    centerText(t('title.sub'), 195, 26);
    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#e6e6e6';
    const lines = [1, 2, 3, 4, 5, 6].map((i) => t(`help.${isTouch ? 'touch' : 'key'}.${i}`));
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 250 + i * 30, W - 60));
    if (state.best) centerText(t('title.best', { c: state.best.goals, t: TOTAL, s: state.best.score }), 460, 20, '#9fe8ff');
    if (Math.floor(state.time * 2) % 2 === 0) centerText(t(isTouch ? 'title.start.touch' : 'title.start.key'), 530, 30, '#ffffff');
    centerText(t('title.sound'), 580, 15, '#cfd8dc', 'normal');
  }

  function rankOf(c) {
    if (c >= 10) return [t('rank.5'), '#ffe14d'];
    if (c >= 8) return [t('rank.4'), '#ffd54f'];
    if (c >= 6) return [t('rank.3'), '#9fe8ff'];
    if (c >= 4) return [t('rank.2'), '#b9f6ca'];
    if (c >= 2) return [t('rank.1'), '#e0e0e0'];
    return [t('rank.0'), '#bdbdbd'];
  }

  function drawOver() {
    ctx.fillStyle = 'rgba(8,14,20,0.68)';
    ctx.fillRect(0, 0, W, H);
    // 下の方(y 約 300〜500)は HTML のシェア・もう一度ボタンなので上に詰める
    centerText(t('over.title'), 84, 32, '#ffffff', '900');
    centerText(t('over.goals', { c: state.goals, t: TOTAL }), 130, 40, state.goals === TOTAL ? '#ffe14d' : '#9fe8ff', '900');
    if (state.goals === TOTAL) centerText(t('over.perfect'), 160, 18, '#ffe14d');
    const [rank, col] = rankOf(state.goals);
    centerText(t('over.rank', { r: rank }), 190, 22, col);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#e6e6e6';
    ctx.textAlign = 'center';
    ctx.fillText(t('over.line1', { s: state.score, h: state.headers, k: state.perfectKicks, t: TOTAL, m: state.bestStreak, nav: navLabel() }), W / 2, 220, W - 40);
    if (state.newRecord) centerText(t('over.new'), 256, 20, '#ff8a65');
    else if (state.best) centerText(t('over.best', { c: state.best.goals, s: state.best.score }), 256, 17, '#9fe8ff');
  }

  // ---------- シェア(結果画面) ----------
  // 対応端末では成績画像つきで共有シートを開き、だめなら X・LINE・コピーで共有する
  const SHARE_URL = /^https?:/.test(location.protocol) ? location.origin + location.pathname : '';
  const shareEl = document.getElementById('share');
  const $id = (id) => document.getElementById(id);
  const navLabel = () => t(state.navUsed ? 'nav.on' : 'nav.off');
  const withUrl = (text) => (SHARE_URL ? text + '\n' + SHARE_URL : text);

  function shareText() {
    const [rank] = rankOf(state.goals);
    return t('share.text', {
      c: state.goals, t: TOTAL, p: state.goals === TOTAL ? t('share.perfect') : '', r: rank,
      s: state.score, nav: navLabel(), h: state.headers, m: state.bestStreak,
    });
  }

  function prepareShare() {
    const text = shareText();
    $id('shareX').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + (SHARE_URL ? '&url=' + encodeURIComponent(SHARE_URL) : '');
    $id('shareLine').href = 'https://line.me/R/share?text=' + encodeURIComponent(withUrl(text));
    $id('shareMsg').textContent = t(navigator.share ? 'share.msg.image' : 'share.msg.links');
    $id('retryBtn').textContent = t('over.retryBtn') + (isTouch ? '' : ' (SPACE)');
  }

  // 成績カード画像(1200x630)
  function makeShareImage() {
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 630;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 630);
    bg.addColorStop(0, '#060a1f'); bg.addColorStop(0.6, '#1d2b5c'); bg.addColorStop(1, '#2d6a2c');
    g.fillStyle = bg; g.fillRect(0, 0, 1200, 630);
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`; g.fillRect(Math.random() * 1200, Math.random() * 300, 2, 2); }
    for (const [x, y, col] of [[150, 140, '#ff5252'], [1060, 120, '#ffd740'], [990, 320, '#40c4ff'], [210, 380, '#e040fb']]) {
      g.strokeStyle = col; g.lineWidth = 3;
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * Math.PI * 2;
        g.beginPath(); g.moveTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20); g.lineTo(x + Math.cos(a) * 80, y + Math.sin(a) * 80); g.stroke();
      }
    }
    g.fillStyle = '#3a8a36'; g.fillRect(0, 560, 1200, 70);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const font = (w, sz) => `${w} ${sz}px "Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif`;
    g.fillStyle = '#9fd8ff'; g.font = font(800, 36); g.fillText(t('card.head', { nav: navLabel() }), 600, 70);
    const gold = g.createLinearGradient(0, 120, 0, 280);
    gold.addColorStop(0, '#fff6c4'); gold.addColorStop(0.5, '#ffd000'); gold.addColorStop(1, '#ff8a00');
    g.fillStyle = gold; g.font = font(900, 120); g.fillText(t('card.goals', { c: state.goals, t: TOTAL }), 600, 200, 1100);
    const [rank] = rankOf(state.goals);
    g.fillStyle = '#ff9d3c'; g.font = font(900, 52); g.fillText(t('card.rank', { r: rank }), 600, 330, 1100);
    g.fillStyle = '#ffffff'; g.font = font(800, 40);
    g.fillText(t('card.line1', { s: state.score, h: state.headers, m: state.bestStreak }), 600, 430, 1100);
    g.fillStyle = '#eef6e8'; g.font = font(700, 28); g.fillText(t('card.tags'), 600, 595);
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }

  async function shareResult() {
    const text = shareText();
    if (navigator.share) {
      try {
        const blob = await makeShareImage();
        const file = blob && new File([blob], 'corner-kick-result.png', { type: 'image/png' });
        const data = { title: t('share.title'), text: withUrl(text) };
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) data.files = [file];
        await navigator.share(data);
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // 共有シートを閉じただけ
      }
    }
    copyResult();
  }

  async function copyResult() {
    const text = withUrl(shareText());
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { /* 非対応 */ }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta);
        ta.select(); ok = document.execCommand('copy'); ta.remove();
      } catch (e) { /* 非対応 */ }
    }
    $id('shareMsg').textContent = t(ok ? 'share.copied' : 'share.copyFail');
  }

  $id('shareBtn').addEventListener('click', () => { audio(); shareResult(); });
  $id('shareCopy').addEventListener('click', copyResult);
  // シェア欄の操作でゲームが再スタートしないようにする
  for (const ev of ['pointerdown', 'pointerup', 'keydown']) shareEl.addEventListener(ev, (e) => e.stopPropagation());

  function updateShareVisibility() {
    const show = state.phase === 'over' && state.overT > 0.6;
    if (show !== !shareEl.hidden) {
      shareEl.hidden = !show;
      if (show) prepareShare();
    }
  }

  function draw() {
    ctx.setTransform(overlayScale, 0, 0, overlayScale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (state.phase !== 'title') {
      drawPath();
      drawMinimap();
      drawHUD();
      drawControls();
      drawGauge();
      drawMessage();
      drawPopups();
      if (state.phase === 'ready' && !state.paused) {
        centerText(t('ready.play', { n: state.index + 1 }), 200, 34, '#ffffff', '900');
        centerText(t('ready.sub'), 405, 22, '#ffcc80');
      }
      drawCall();
      if (state.paused && !isPortrait()) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
        centerText('PAUSE', H * 0.3, 56);
        if (!isTouch) centerText(t('pause.resume'), H * 0.3 + 40, 18);
      }
    }
    if (state.phase === 'title') drawTitle();
    if (state.phase === 'over') drawOver();
    updateShareVisibility();
    updateLangVisibility();
    updatePauseMenu();
    drawMute();
    drawNavButton();
  }

  function drawNavButton() {
    const { x, y, w, h } = NAVBTN;
    ctx.save();
    ctx.fillStyle = state.nav ? 'rgba(255,225,77,0.9)' : 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); else ctx.rect(x - w / 2, y - h / 2, w, h);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = state.nav ? '#222' : '#fff';
    ctx.font = `bold ${Math.round(h * 0.43)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(t('nav.btn', { s: state.nav ? 'ON' : 'OFF' }), x, y + h * 0.16);
    ctx.restore();
  }

  function drawMute() {
    ctx.save();
    const k = MUTE.r / 20;
    ctx.translate(MUTE.x, MUTE.y);
    ctx.scale(k, k);
    const x = 0, y = 0, r = 20;
    if (!Sound.muted && !Sound.ready && state.phase !== 'title' && state.phase !== 'over') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x - 84, y + 26, 168, 24);
      ctx.fillStyle = '#ffe14d';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('sound.tap'), x, y + 43);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 4); ctx.lineTo(x - 4, y - 4); ctx.lineTo(x + 2, y - 10);
    ctx.lineTo(x + 2, y + 10); ctx.lineTo(x - 4, y + 4); ctx.lineTo(x - 9, y + 4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    if (Sound.muted) {
      ctx.beginPath(); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x + 12, y + 5); ctx.moveTo(x + 12, y - 5); ctx.lineTo(x + 5, y + 5); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(x + 3, y, 6, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 3, y, 11, -0.9, 0.9); ctx.stroke();
    }
    ctx.restore();
  }

  // 裏に回ったら一時停止して音を止める
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (state.phase !== 'title' && state.phase !== 'over') state.paused = true;
      Sound.suspend();
    } else {
      Sound.resume();
    }
  });

  function goTitle() {
    Object.assign(state, { phase: 'title', paused: false, popups: [], msg: null });
    titleScene();
  }

  // 結果画面の「もう一度」「タイトルへ」ボタン
  $id('retryBtn').addEventListener('click', () => { audio(); if (state.phase === 'over') newGame(); });
  $id('titleBtn').addEventListener('click', () => { audio(); if (state.phase === 'over') goTitle(); });

  // ポーズ画面のボタン(再開 / タイトルへ)
  const pauseEl = $id('pauseMenu');
  for (const ev of ['pointerdown', 'pointerup']) pauseEl.addEventListener(ev, (e) => e.stopPropagation());
  $id('pauseResume').addEventListener('click', () => { audio(); state.paused = false; });
  $id('pauseTitle').addEventListener('click', () => { audio(); if (state.paused) goTitle(); });
  function updatePauseMenu() {
    const show = state.paused && !isPortrait() && state.phase !== 'title' && state.phase !== 'over';
    if (show === pauseEl.hidden) pauseEl.hidden = !show;
  }

  // タイトル画面の下にプライバシーポリシー
  const legalEl = $id('legal');
  for (const ev of ['pointerdown', 'pointerup']) legalEl.addEventListener(ev, (e) => e.stopPropagation());

  // タイトル画面の言語切り替え
  const langEl = document.getElementById('langSel');
  document.querySelectorAll('[data-lang]').forEach((el) => el.addEventListener('click', () => I18N.setLang(el.dataset.lang)));
  for (const ev of ['pointerdown', 'pointerup']) langEl.addEventListener(ev, (e) => e.stopPropagation());
  I18N.onChange(() => { if (!shareEl.hidden) prepareShare(); });
  I18N.apply();
  function updateLangVisibility() {
    const show = state.phase === 'title';
    if (show === langEl.hidden) { langEl.hidden = !show; legalEl.hidden = !show; }
  }

  // タイトル画面の背景: ゴール前に選手を並べておく
  function titleScene() {
    state.index = 0;
    startPlay();
    state.phase = 'title';
    state.view = { x: 0, y: 24, fx: 0, fy: 1, back: 6, h: 4.6, pitch: -0.05, cut: true };
  }

  // ---------- メインループ ----------
  let overlayScale = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
    W = Math.round(H * r.width / r.height);
    // 右側のボタン類は右端に合わせる。スマホは指で押しやすいよう大きくする
    if (isTouch) {
      Object.assign(RING, { x: 168, y: 478, r: 122, dead: 16 });
      const cx = W - 200;
      Object.assign(BTN.act1, { x: cx, y: 330, r: 74 });
      Object.assign(BTN.act2, { x: cx - 150, y: 488, r: 70 });
      Object.assign(BTN.dash, { x: cx + 95, y: 520, r: 62 });
      Object.assign(MUTE, { y: 42, r: 27 });
      Object.assign(NAVBTN, { y: 42, w: 104, h: 42 });
      MUTE.x = W / 2 + 90;
      NAVBTN.x = MUTE.x + 92;
    } else {
      const cx = W - 175;
      BTN.act1.x = cx; BTN.act2.x = cx - 95; BTN.dash.x = cx + 75;
      MUTE.x = W / 2 + 140;
      NAVBTN.x = MUTE.x + 64;
    }
    overlayScale = (r.height / H) * dpr;
    canvas.width = Math.round(W * overlayScale);
    canvas.height = Math.round(H * overlayScale);
    Scene3D.resize(r.width, r.height, W);
  }
  Scene3D.init(document.getElementById('view'));
  window.addEventListener('resize', resize);
  resize();
  titleScene();

  let last = performance.now(), acc = 0;
  function frame(now) {
    const frameDt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    acc += frameDt;
    if (api.hold) acc = 0; // テスト用: シミュレーションを止めて描画だけ行う
    while (acc >= DT) { update(DT); acc -= DT; }
    Scene3D.render(state, frameDt);
    Sound.update(state);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // テスト・デバッグ用フック
  const api = window.CornerKick = {
    hold: false,
    state, newGame, update, DT, TOTAL,
    setBot(fn) { bot = fn; },
    predictPath, kickVelocity,
    consts: { HEAD_Z, JUMP, SWEET, SWEET_W, GAUGE_T, KICK_TYPES },
  };
})();
