// Headless Chrome over the DevTools protocol, with nothing but Node's built-in WebSocket.
// Every launch gets its own temporary profile and a free debugging port, so runs never collide.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Starts Chrome and returns { cdp, evalJs, waitFor, sleep, close }. Set CHROME=<path> if it is not in a standard place. */
export async function launch({ width = 1440, height = 900 } = {}) {
  const exe = process.env.CHROME || CANDIDATES.find(p => fs.existsSync(p));
  if (!exe) throw new Error('No Chrome or Edge found; set CHROME=<path to the executable>');
  if (typeof WebSocket === 'undefined') throw new Error('Node 22 or newer is required (built-in WebSocket)');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cocojs-chrome-'));
  const chrome = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--window-size=${width},${height}`, '--hide-scrollbars', '--disable-gpu',
    '--no-first-run', '--no-default-browser-check', '--force-device-scale-factor=1', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const close = () => {
    chrome.kill();
    setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold a file; the temp dir is harmless */ } }, 500).unref();
  };
  // Chrome writes the port it picked into the profile directory.
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port = 0;
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(100);
    try { port = parseInt(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0], 10) || 0; } catch { /* not yet */ }
  }
  let target = null;
  for (let i = 0; i < 50 && port && !target; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); target = list.find(t => t.type === 'page'); } catch { /* starting */ }
    if (!target) await sleep(150);
  }
  if (!target) { close(); throw new Error('Chrome did not expose a page target'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(String(ev.data));
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  };
  const cdp = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async expr => {
    const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'eval failed');
    return r.result.value;
  };
  const waitFor = async (expr, ms = 30_000, label = expr) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if (await evalJs(expr)) return true; } catch { /* loading */ } await sleep(150); }
    throw new Error('Timed out waiting for: ' + label);
  };
  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  return { cdp, evalJs, waitFor, sleep, close: () => { try { ws.close(); } catch { /* ignore */ } close(); } };
}
