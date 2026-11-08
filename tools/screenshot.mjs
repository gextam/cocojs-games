// Full-page screenshots of the launch page (desktop and phone) for the README.
//   node tools/screenshot.mjs                      # https://cocojs.com/games/
//   node tools/screenshot.mjs http://localhost:8080/  # a local copy
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './lib/chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'screenshots');
const URL_ = process.argv[2] || 'https://cocojs.com/games/';
const SHOTS = [
  { name: 'hub.png', width: 1440, height: 900, max: 2600 },
  { name: 'hub-mobile.png', width: 390, height: 844, max: 4200 },
];
fs.mkdirSync(OUT, { recursive: true });

for (const s of SHOTS) {
  const browser = await launch({ width: s.width, height: s.height });
  try {
    await browser.cdp('Page.navigate', { url: URL_ });
    await browser.waitFor("document.readyState === 'complete' && document.querySelectorAll('.card img').length >= 9", 30_000, 'cards');
    // lazy images below the fold never load in a headless window unless asked for; give them 8 s at most
    await browser.evalJs(`Promise.race([
      Promise.all([document.fonts.ready, ...[...document.images].map(i => { i.loading = 'eager'; return i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }); })]),
      new Promise(r => setTimeout(r, 8000)),
    ]).then(() => 1)`);
    await browser.sleep(1500); // entrance animation, live stats
    const height = Math.min(await browser.evalJs('document.documentElement.scrollHeight'), s.max);
    const shot = await browser.cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: s.width, height, scale: 1 }, captureBeyondViewport: true });
    fs.writeFileSync(path.join(OUT, s.name), Buffer.from(shot.data, 'base64'));
    console.log('wrote', path.join('docs', 'screenshots', s.name), `${s.width}x${height}`);
  } finally {
    browser.close();
  }
}
process.exit();
