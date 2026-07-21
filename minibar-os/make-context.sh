git add -A && git commit -m "deadlines stats -> bottom sheet; modals as sheets on mobile" && git push#!/bin/bash
OUT="context.md"
echo "# MiniBar OS — контекст ($(date '+%Y-%m-%d %H:%M'))" > "$OUT"
for f in \
  frontend/index.html frontend/styles.css frontend/config.js frontend/nginx.conf \
  frontend/js/utils.js frontend/js/app-core.js frontend/js/init.js \
  frontend/js/route-handlers.js frontend/js/mobile-nav.js \
  frontend/js/excise-module.js frontend/js/deadlines-module.js \
  frontend/js/calculator-module.js frontend/js/inventory-module.js \
  frontend/js/settings-module.js \
  backend/src/app.js backend/src/routes/deadlines.js backend/src/routes/rooms.js \
  backend/src/routes/excises.js backend/src/routes/products.js \
  backend/src/services/deadlines.js backend/src/services/monthChecks.js \
  backend/src/lib/timezone.js backend/prisma/schema.prisma docker-compose.yml
do
  if [ -f "$f" ]; then
    { echo ""; echo "=== FILE: $f ==="; echo '```'; cat "$f"; echo '```'; } >> "$OUT"
  fi
done
wc -l "$OUT"
echo "Готово. В VS Code: правый клик по context.md -> Download"
