// Android アプリに同梱する Web ファイルを www/ にコピーする
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of [
  'index.html', 'style.css', 'manifest.json',
  'game.js', 'scene3d.js', 'sound.js', 'ads.js', 'i18n.js', 'vendor',
]) {
  const src = path.join(root, item);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, item), { recursive: true });
}
// アプリ(Android / iOS)に同梱するときは、Web 版だけの部分(Google Play へのリンクなど)を取り除く。
// iOS の審査では、アプリの中で隠しているだけの機能は「審査中に隠した機能」(Guideline 5.6)と見なされるため、
// アプリには最初から入れない。目印: HTML は <!-- web-only --> … <!-- /web-only -->、
// JS は // web-only:start … // web-only:end、CSS は /* web-only:start */ … /* web-only:end */
if (process.env.APP_BUILD === '1') {
  const rules = [
    ['index.html', /[ \t]*<!-- web-only[\s\S]*?<!-- \/web-only -->\n?/g],
    ['game.js', /[ \t]*\/\/ web-only:start[\s\S]*?\/\/ web-only:end\n?/g],
    ['i18n.js', /[ \t]*\/\/ web-only:start[\s\S]*?\/\/ web-only:end\n?/g],
    ['style.css', /[ \t]*\/\* web-only:start \*\/[\s\S]*?\/\* web-only:end \*\/\n?/g],
  ];
  for (const [rel, re] of rules) {
    const file = path.join(out, rel);
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(re, '');
    if (after === before) {
      console.error(`${rel} に web-only の目印が見つかりません`);
      process.exit(1);
    }
    fs.writeFileSync(file, after);
  }
  // 取り除き忘れがあれば、アプリ用のビルドを止める
  for (const rel of fs.readdirSync(out).filter((f) => /\.(html|js|css)$/.test(f))) {
    const text = fs.readFileSync(path.join(out, rel), 'utf8');
    if (/play\.google\.com|web-only|storeLink/.test(text)) {
      console.error(`${rel} に Web 版だけの部分が残っています`);
      process.exit(1);
    }
  }
}
// Google Play 用のビルドでは本番の広告を使う
const mode = process.env.ADMOB_MODE === 'production' ? 'production' : 'test';
fs.writeFileSync(path.join(out, 'ads-config.js'), `// ビルド時に生成\nwindow.AD_MODE = '${mode}';\n`);
// タイトル画面に出すバージョン（CI では VERSION_NAME / VERSION_CODE を使う）
const version = process.env.VERSION_CODE
  ? `v${process.env.VERSION_NAME || require('../package.json').version} (build ${process.env.VERSION_CODE})`
  : 'dev';
fs.writeFileSync(path.join(out, 'build-info.js'), `// ビルド時に生成\nwindow.APP_VERSION = '${version}';\n`);
console.log(`built web assets into www/ (${process.env.APP_BUILD === '1' ? 'app' : 'web'}, ads: ${mode}, version: ${version})`);
