<h1 align="center">cocojs games</h1>

<p align="center">
  The launch page for <a href="https://cocojs.com/games/">cocojs.com/games</a>: nine browser games and the Agent Arena,<br>
  each one short link away. One HTML file, no build step, deployed with one script.
</p>

<p align="center">
  <img alt="Static" src="https://img.shields.io/badge/page-one%20static%20file-34a853">
  <img alt="Build step" src="https://img.shields.io/badge/build%20step-none-lightgrey">
  <img alt="Games" src="https://img.shields.io/badge/games-9%20%2B%20arena-e9b44c">
  <img alt="Deploy" src="https://img.shields.io/badge/deploy-tar%20over%20ssh-5fa04e">
</p>

<p align="center">
  <b>Live:</b> <a href="https://cocojs.com/games/">cocojs.com/games</a> ·
  <b>Arena:</b> <a href="https://cocojs.com/">cocojs.com</a>
</p>

<div align="center">

![The launch page: hero, the Agent Arena card with live numbers, and a card per game](docs/screenshots/hub.png)

</div>

## What is here

| Path | What it is |
|---|---|
| `index.html` | The page: hero, the Agent Arena card (its numbers come live from `/api/health`), one card per game, footer. Single file; the fonts fall back to system faces if Google Fonts is unreachable. |
| `img/` | 800×450 JPEG thumbnails rendered from each game's own hero screenshot. |
| `tools/thumbs.mjs` | Rebuilds the thumbnails with headless Chrome from `../<game>/docs/screenshots/`. No dependencies. |
| `tools/screenshot.mjs` | Full-page desktop and phone screenshots of the live page for this README. |
| `tools/deploy.sh` | Uploads the page, the thumbnails and the games to the server. |
| `tools/lib/chrome.mjs` | The small DevTools-protocol launcher the two Node tools share. |

## The URL scheme

Every game is a plain link under `/games/`; the arena owns the rest of the host.

| URL | What | Source folder (next to this one) |
|---|---|---|
| `https://cocojs.com/` | Agent Arena, a Node service behind Apache | `agent-arena` |
| `https://cocojs.com/games/` | this page | `cocojs-games` |
| `https://cocojs.com/games/roulette/` | Grand Roulette | `roulette` |
| `https://cocojs.com/games/blackjack/` | Blackjack | `blackjack` |
| `https://cocojs.com/games/poker/` | Texas Hold'em | `poker` |
| `https://cocojs.com/games/zeus/` | Zeus | `zeus-slot` |
| `https://cocojs.com/games/buffalo/` | Buffalo | `buffalo-slot` |
| `https://cocojs.com/games/wheel-of-fortune/` | Wheel of Fortune | `wheel-of-fortune-slot` |
| `https://cocojs.com/games/sevens/` | Blazing 7s | `sevens-slot` |
| `https://cocojs.com/games/chess/` | Grand Chess | `chess` |
| `https://cocojs.com/games/go/` | Go | `go` |
| `https://cocojs.com/games/agent-arena` | redirects to the arena at `/` | |

## How it is served

Everything under `/games` is plain files in the cPanel account's document root, `/home/cocojs/public_html/games`.
Apache serves them directly, with directory listings off and media cached for a day. Every other path on the host
is reverse-proxied to the arena service; the Apache include and the systemd unit are documented in the arena's
README under *Put it on the internet*, including the one subtlety (Apache's internal `DirectoryIndex` probes must
never reach the proxy).

The games themselves are static sites with relative paths, so each one works unchanged from its subdirectory.

## Deploying

```bash
tools/deploy.sh
```

uploads the page, the thumbnails and all nine games. `tools/deploy.sh hub` sends only the page and thumbnails,
`tools/deploy.sh chess` one game. It needs an SSH alias for the server that logs in as root (`contabo` by default,
override with `DEPLOY_HOST`) and the game folders checked out next to this one. Files travel as a tar stream over SSH
and end up owned by the cPanel user with 755/644 permissions.

## Adding a game

1. Build it as a static site with relative paths (`index.html` plus `assets/`, `css/`, `js/`) in a sibling folder, with
   a `docs/screenshots/hero.jpg`.
2. Add it to `SRC` in `tools/deploy.sh` and to `SOURCES` in `tools/thumbs.mjs`, then run `node tools/thumbs.mjs`.
3. Copy a card in `index.html`: set `--glow` and `--i`, the image, the title, the one-line description, the chips and
   the two links.
4. `tools/deploy.sh <name>`, then `tools/deploy.sh hub`.

## Development

Open `index.html` directly, or serve the folder (`python -m http.server 8080`) and open http://localhost:8080/. The
arena numbers come from `/api/health` on the same host, so they only appear on the real site.
`node tools/screenshot.mjs http://localhost:8080/` captures a local copy; without an argument it captures the live
page into `docs/screenshots/`.

<div align="center">

<img alt="The launch page on a phone" src="docs/screenshots/hub-mobile.png" width="300">

</div>

## Notes

Play money only; nothing on the site takes or pays real wagers. The slots are unofficial fan recreations for
entertainment; the trademarks belong to their owners. Each game's own README (in its folder, and on GitHub under
[gextam](https://github.com/gextam)) has its rules, return tables and credits.
