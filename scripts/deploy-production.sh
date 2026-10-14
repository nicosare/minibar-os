#!/usr/bin/env bash
set -Eeuo pipefail

# Production deployer for Minibar OS.
# Install as /usr/local/sbin/minibar-deploy and keep the existing SSH "deploy" entrypoint.
REPO_DIR="/root/minibar-os"
DEPLOY_BRANCH="design/desktop-unification"
STATE_DIR="/var/lib/minibar-os"
STATE_FILE="$STATE_DIR/deployed-commit"
SERVICES=(frontend backend miniapp vk-proxy vk-bot)

log() { printf '[minibar-deploy] %s\n' "$*"; }
fail() { log "ERROR: $*"; exit 1; }

[[ "$(id -u)" -eq 0 ]] || fail "Must run as root."
[[ -d "$REPO_DIR/.git" ]] || fail "Git repository not found at $REPO_DIR."
cd "$REPO_DIR"

current_branch="$(git branch --show-current)"
[[ "$current_branch" == "$DEPLOY_BRANCH" ]] || fail "Expected branch $DEPLOY_BRANCH, found '$current_branch'. Refusing to switch branches automatically."

log "Fetching origin/$DEPLOY_BRANCH"
git fetch --prune origin "$DEPLOY_BRANCH"
target_sha="$(git rev-parse "origin/$DEPLOY_BRANCH")"
current_sha="$(git rev-parse HEAD)"
[[ "$current_sha" == "$target_sha" || "$(git merge-base "$current_sha" "$target_sha")" == "$current_sha" ]] || fail "Server checkout is not a fast-forward ancestor of the deployment ref. Resolve repository state manually; no reset was performed."

mkdir -p "$STATE_DIR"
if [[ -s "$STATE_FILE" ]]; then
  base_sha="$(cat "$STATE_FILE")"
  git cat-file -e "$base_sha^{commit}" 2>/dev/null || fail "Recorded last-successful commit $base_sha is unavailable locally."
else
  base_sha="$current_sha"
  log "No deployment marker exists; using current checkout as the initial comparison point."
fi
git merge-base --is-ancestor "$base_sha" "$target_sha" || fail "Last successful commit is not an ancestor of target. Manual reconciliation is required."

mapfile -t changed_files < <(git diff --name-only "$base_sha" "$target_sha")
if (("${#changed_files[@]}" == 0)); then
  log "No file changes found between $base_sha and $target_sha."
  printf '%s\n' "$target_sha" > "$STATE_FILE"
  log "DEPLOY_RESULT=SUCCESS COMMIT=$target_sha SERVICES=none"
  exit 0
fi

log "Changes since last successful deployment:"
printf '  %s\n' "${changed_files[@]}"

# The current backend startup runs Prisma db push and SQL backfill against production.
# Schema/initializer changes require a reviewed migration plan; never apply them automatically.
for file in "${changed_files[@]}"; do
  case "$file" in
    backend/prisma/schema.prisma|backend/src/init-db.js|backend/prisma/migrations/*)
      fail "Database schema/initializer change detected ($file). Deployment stopped before checkout/build. Review a safe production migration plan first."
      ;;
  esac
done

declare -A selected=()
for file in "${changed_files[@]}"; do
  case "$file" in
    frontend/*) selected[frontend]=1 ;;
    backend/*) selected[backend]=1 ;;
    miniapp/*) selected[miniapp]=1 ;;
    vk-proxy/*) selected[vk-proxy]=1 ;;
    vk-bot/*) selected[vk-bot]=1 ;;
    docker-compose.yml)
      for service in "${SERVICES[@]}"; do selected["$service"]=1; done
      ;;
  esac
done

selected_services=()
for service in "${SERVICES[@]}"; do
  [[ -n "${selected[$service]:-}" ]] && selected_services+=("$service")
done

# Advance only after checking the target changes. Fast-forward only; never discard local changes.
if [[ "$current_sha" != "$target_sha" ]]; then
  git merge --ff-only "$target_sha" || fail "Could not fast-forward the server checkout. No reset/force checkout was attempted."
fi

if (("${#selected_services[@]}" == 0)); then
  log "No runtime components changed (documentation/workflow-only commit)."
  printf '%s\n' "$target_sha" > "$STATE_FILE"
  log "DEPLOY_RESULT=SUCCESS COMMIT=$target_sha SERVICES=none"
  exit 0
fi

log "Validating Compose configuration"
docker compose config -q
log "Building changed services: ${selected_services[*]}"
docker compose build "${selected_services[@]}"
log "Recreating changed services only: ${selected_services[*]}"
docker compose up -d --no-deps "${selected_services[@]}"

check_container() {
  local service="$1" cid status
  cid="$(docker compose ps -q "$service")"
  [[ -n "$cid" ]] || fail "No container found for service '$service'."
  status="$(docker inspect --format '{{.State.Status}}' "$cid")"
  [[ "$status" == "running" ]] || fail "Service '$service' is not running (status: $status)."
}

wait_http() {
  local service="$1" url="$2" attempt
  for attempt in $(seq 1 20); do
    if curl -fsS --max-time 3 "$url" >/dev/null; then
      log "Health check passed: $service ($url)"
      return 0
    fi
    sleep 2
  done
  docker compose logs --tail=80 "$service" || true
  fail "HTTP health check failed for '$service' ($url)."
}

for service in "${selected_services[@]}"; do
  check_container "$service"
  case "$service" in
    frontend) wait_http frontend "http://127.0.0.1:8080/" ;;
    backend) wait_http backend "http://127.0.0.1:3100/api/health" ;;
    miniapp) wait_http miniapp "http://127.0.0.1:8081/" ;;
    vk-proxy|vk-bot) log "Container is running: $service (no HTTP health endpoint is assumed)." ;;
  esac
done

printf '%s\n' "$target_sha" > "$STATE_FILE"
log "DEPLOY_RESULT=SUCCESS COMMIT=$target_sha SERVICES=${selected_services[*]}"
log "Production deploy completed."
