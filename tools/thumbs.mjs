// Builds the launch-page thumbnails (800x450 JPEG, object-fit: cover) from each game's hero
// screenshot in the sibling project folders, with headless Chrome. No dependencies.
//   node tools/thumbs.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './lib/chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLONES = path.resolve(ROOT, '..');
const OUT = path.join(ROOT, 'img');
const W = 800, H = 450;
const SOURCES = {
  'agent-arena': 'agent-arena/docs/screenshots/game-reveal.png',
  zeus: 'zeus-slot/docs/screenshots/hero.jpg',
  'wheel-of-fortune': 'wheel-of-fortune-slot/docs/screenshots/hero.jpg',
  sevens: 'sevens-slot/docs/screenshots/hero.jpg',
  buffalo: 'buffalo-slot/docs/screenshots/hero.jpg',
  roulette: 'roulette/docs/screenshots/hero.jpg',
  blackjack: 'blackjack/docs/screenshots/hero.jpg',
  poker: 'poker/docs/screenshots/hero.jpg',
  chess: 'chess/docs/screenshots/hero.jpg',
  go: 'go/docs/screenshots/opening.jpg',
  mastermind: 'mastermind/docs/screenshots/hero.jpg',
};

fs.mkdirSync(OUT, { recursive: true });
const page = path.join(os.tmpdir(), 'cocojs_thumb.html');
const browser = await launch({ width: W, height: H });
try {
  for (const [slug, rel] of Object.entries(SOURCES)) {
    const src = path.join(CLONES, rel);
    if (!fs.existsSync(src)) { console.warn('missing', src); continue; }
    fs.writeFileSync(page, `<!doctype html><style>html,body{margin:0;background:#07070a}img{display:block;width:${W}px;height:${H}px;object-fit:cover;object-position:center top}</style><img src="${pathToFileURL(src).href}">`);
    await browser.cdp('Page.navigate', { url: pathToFileURL(page).href + '?' + Date.now() });
    await browser.waitFor('(() => { const i = document.querySelector("img"); return i && i.complete && i.naturalWidth > 0; })()', 10_000, slug);
    const shot = await browser.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 84 });
    const file = path.join(OUT, `${slug}.jpg`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log('wrote', path.relative(ROOT, file), Math.round(fs.statSync(file).size / 1024) + ' KB');
  }
} finally {
  try { fs.unlinkSync(page); } catch { /* ignore */ }
  browser.close();
  process.exit();
}
