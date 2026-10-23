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

# Keep the installed SSH entrypoint aligned with the reviewed tracked source.
# This script is already loaded by Bash, so replacing the file affects only
# subsequent invocations. Sync only on successful deployment paths.
sync_installed_entrypoint() {
  local source="$REPO_DIR/scripts/deploy-production.sh"
  local installed="/usr/local/sbin/minibar-deploy"
  [[ -f "$source" && -f "$installed" ]] || return 0
  if ! cmp -s "$source" "$installed"; then
    local temp="${installed}.tmp.$"
    install -m 0755 "$source" "$temp" ||
      fail "Could not stage the updated deploy entrypoint."
    if ! mv -f "$temp" "$installed"; then
      rm -f "$temp"
      fail "Could not activate the updated deploy entrypoint."
    fi
    log "Installed deploy entrypoint synchronized with the tracked source."
  fi
}

[[ "$(id -u)" -eq 0 ]] || fail "Must run as root."
[[ -d "$REPO_DIR/.git" ]] || fail "Git repository not found at $REPO_DIR."
cd "$REPO_DIR"

current_branch="$(git branch --show-current)"
[[ "$current_branch" == "$DEPLOY_BRANCH" ]] || fail "Expected branch $DEPLOY_BRANCH, found '$current_branch'. Refusing to switch branches automatically."

# Serialize all deploy entrypoint invocations, including manual SSH invocations
# that do not go through GitHub Actions concurrency controls.
mkdir -p "$STATE_DIR"
command -v flock >/dev/null 2>&1 || fail "Required command 'flock' is unavailable."
umask 077
exec 9>"$STATE_DIR/deploy.lock"
flock -n 9 || fail "Another production deployment is already in progress."

log "Fetching origin/$DEPLOY_BRANCH"
git fetch origin "$DEPLOY_BRANCH"
target_sha="$(git rev-parse "origin/$DEPLOY_BRANCH")"
current_sha="$(git rev-parse HEAD)"
[[ "$current_sha" == "$target_sha" || "$(git merge-base "$current_sha" "$target_sha")" == "$current_sha" ]] || fail "Server checkout is not a fast-forward ancestor of the deployment ref. Resolve repository state manually; no reset was performed."

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
  sync_installed_entrypoint
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
    frontend/*)
      # Test-only assets and the preview-only Nginx config are not part of the
      # production frontend image and must not trigger a production rebuild.
      case "$file" in
        frontend/tests/*|frontend/nginx-preview.conf) ;;
        *) selected[frontend]=1 ;;
      esac
      ;;
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
  sync_installed_entrypoint
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
  local service="$1" url="$2" expected="${3:-}" attempt response
  for attempt in $(seq 1 20); do
    if response="$(curl -fsS --max-time 3 "$url" 2>/dev/null)"; then
      if [[ -z "$expected" || "$response" == *"$expected"* ]]; then
        log "Health check passed: $service ($url)"
        return 0
      fi
    fi
    sleep 2
  done
  docker compose logs --tail=80 "$service" || true
  fail "HTTP health check failed for '$service' ($url${expected:+; required health response fragment was not present})."
}

for service in "${selected_services[@]}"; do
  check_container "$service"
  case "$service" in
    frontend) wait_http frontend "http://127.0.0.1:8080/" ;;
    backend) wait_http backend "http://127.0.0.1:3100/api/health" ;;
    miniapp) wait_http miniapp "http://127.0.0.1:8081/" ;;
    vk-proxy) wait_http vk-proxy "http://127.0.0.1:3001/health" '"token_configured":true' ;;
    vk-bot) wait_http vk-bot "http://127.0.0.1:3002/health" '"service":"vk-callback"' ;;
  esac
done

sync_installed_entrypoint
printf '%s\n' "$target_sha" > "$STATE_FILE"
log "DEPLOY_RESULT=SUCCESS COMMIT=$target_sha SERVICES=${selected_services[*]}"
log "Production deploy completed."
