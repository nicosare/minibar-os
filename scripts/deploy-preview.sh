#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PRODUCTION_DIR="${PRODUCTION_DIR:-$HOME/minibar-os}"
ENV_FILE="$ROOT_DIR/.env.preview"
COMPOSE_FILE="$ROOT_DIR/docker-compose.preview.yml"
DUMP_FILE="$(mktemp /tmp/minibar-preview-db.XXXXXX.dump)"
PREVIEW_PORT="${PREVIEW_PORT:-8082}"

cleanup() { rm -f "$DUMP_FILE"; }
trap cleanup EXIT

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || die "Docker not found."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 not found."
command -v openssl >/dev/null 2>&1 || die "openssl not found."
command -v curl >/dev/null 2>&1 || die "curl not found."
[[ -f "$COMPOSE_FILE" ]] || die "Missing $COMPOSE_FILE."
[[ -f "$PRODUCTION_DIR/.env" ]] || die "Production .env not found in $PRODUCTION_DIR."
docker inspect minibar-db >/dev/null 2>&1 || die "Production database container 'minibar-db' is not running."
docker inspect minibar-api >/dev/null 2>&1 || die "Production backend container 'minibar-api' is not running."

# Keep preview credentials separate from the production .env and out of git.
if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<EOF
PREVIEW_POSTGRES_DB=minibar_preview_db
PREVIEW_POSTGRES_USER=minibar_preview
PREVIEW_POSTGRES_PASSWORD=$(openssl rand -hex 24)
PREVIEW_PORT=$PREVIEW_PORT
PREVIEW_TZ=Europe/Warsaw
EOF
  chmod 600 "$ENV_FILE"
  printf 'Created private preview environment: %s\n' "$ENV_FILE"
else
  chmod 600 "$ENV_FILE"
fi

if grep -qE 'CHANGE_ME|^PREVIEW_POSTGRES_PASSWORD=$' "$ENV_FILE"; then
  die "Preview environment contains an empty or placeholder password."
fi

compose() {
  docker compose --project-name minibar-preview --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

printf '\n[1/6] Stop any previous preview containers (preview database volume is preserved)...\n'
compose down --remove-orphans

printf '\n[2/6] Start isolated preview PostgreSQL...\n'
compose up -d preview-db
ready=0
for attempt in $(seq 1 60); do
  status="$(docker inspect minibar-preview-db --format '{{.State.Health.Status}}' 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then ready=1; break; fi
  sleep 2
done
if [[ "$ready" != 1 ]]; then
  docker logs --tail 100 minibar-preview-db || true
  die "Preview PostgreSQL did not become healthy."
fi

printf '\n[3/6] Copy a snapshot of production data into the isolated preview DB...\n'
printf 'Production database is only read by pg_dump; no writes are sent to it.\n'
docker exec minibar-db sh -lc 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$DUMP_FILE"
[[ -s "$DUMP_FILE" ]] || die "Production database dump is empty."
# Restore only into the preview database. Never point this command at production.
docker exec -i minibar-preview-db sh -lc 'pg_restore --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$DUMP_FILE"

printf '\n[4/6] Build and start the preview backend and frontend...\n'
compose up -d --build preview-backend preview-frontend

printf '\n[5/6] Wait for preview health and CSS...\n'
ready=0
for attempt in $(seq 1 60); do
  if docker exec minibar-preview-web wget -qO- http://backend:3000/api/health >/dev/null 2>&1 &&
     curl --fail --silent "http://127.0.0.1:$PREVIEW_PORT/design-system.css" >/dev/null; then
    ready=1
    break
  fi
  sleep 2
done
if [[ "$ready" != 1 ]]; then
  compose ps || true
  compose logs --tail 100 preview-backend preview-frontend || true
  die "Preview health check failed; production containers were not changed."
fi

printf '\n[6/6] Preview is ready.\n'
printf 'Preview URL on the server: http://127.0.0.1:%s/\n' "$PREVIEW_PORT"
printf 'The preview has its own PostgreSQL database populated from a snapshot.\n'
printf 'Edits in the preview do not write to production.\n'
printf '\nTo view it from your PC, create an SSH tunnel in a second local terminal:\n'
printf '  ssh -L %s:127.0.0.1:%s <your-usual-server-ssh-target>\n' "$PREVIEW_PORT" "$PREVIEW_PORT"
printf 'Then open: http://127.0.0.1:%s/\n' "$PREVIEW_PORT"
