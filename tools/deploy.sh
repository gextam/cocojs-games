#!/usr/bin/env bash
# Deploys the launch page and the games to https://cocojs.com/games/ (cPanel account "cocojs").
#
#   tools/deploy.sh            # launch page + thumbnails + all nine games
#   tools/deploy.sh hub        # launch page + thumbnails only
#   tools/deploy.sh roulette   # one game, by its URL name
#
# Needs an SSH alias for the server (default "contabo", override with DEPLOY_HOST) that logs in as
# root, and the game folders checked out next to this one (see SRC below). Files are streamed as a
# tar archive over SSH, then owned by the cPanel user with 755/644 permissions.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
CLONES="$(dirname "$HERE")"
HOST=${DEPLOY_HOST:-contabo}
DEST=/home/cocojs/public_html/games
OWNER=cocojs:cocojs
# URL name -> folder next to this project
declare -A SRC=(
  [zeus]=zeus-slot [wheel-of-fortune]=wheel-of-fortune-slot [sevens]=sevens-slot [buffalo]=buffalo-slot
  [roulette]=roulette [blackjack]=blackjack [poker]=poker [chess]=chess [go]=go
)
what=${1:-all}
fix="chown -R $OWNER $DEST && find $DEST -type d -exec chmod 755 {} + && find $DEST -type f -exec chmod 644 {} +"

if [ "$what" = all ] || [ "$what" = hub ]; then
  echo "launch page -> $HOST:$DEST"
  tar czf - -C "$HERE" index.html img | ssh "$HOST" "mkdir -p $DEST && tar xzf - -C $DEST && $fix"
fi
if [ "$what" != hub ]; then
  found=0
  for slug in zeus wheel-of-fortune sevens buffalo roulette blackjack poker chess go; do
    [ "$what" = all ] || [ "$what" = "$slug" ] || continue
    found=1
    src=${SRC[$slug]}
    [ -f "$CLONES/$src/index.html" ] || { echo "missing $CLONES/$src/index.html" >&2; exit 1; }
    echo "$slug <- $src"
    tar czf - -C "$CLONES" --transform "s,^$src/,$slug/," "$src/index.html" "$src/assets" "$src/css" "$src/js" \
      | ssh "$HOST" "mkdir -p $DEST && tar xzf - -C $DEST && $fix"
  done
  [ "$found" = 1 ] || { echo "unknown game '$what' (use hub, all, or one of: ${!SRC[*]})" >&2; exit 1; }
fi
echo "done: https://cocojs.com/games/"
