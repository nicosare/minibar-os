# Production safety runbook

This runbook records the production safeguards reviewed in October 2026. It is intentionally conservative: the current backend startup runs Prisma schema synchronization and an idempotent SQL backfill, so database changes must not be treated like ordinary container updates.

## Known deployment model

- Production checkout: `/root/minibar-os`.
- Deployment branch: `design/desktop-unification`.
- The installed SSH entrypoint is `/usr/local/sbin/minibar-deploy`; the tracked source is `scripts/deploy-production.sh`.
- The installed entrypoint may differ from the tracked source. Inspect and compare them before syncing or replacing either file.
- The tracked deploy script blocks schema, initializer and migration-file changes by default. The installed copy currently contains a narrow historical exception for commit `150f19424d8e38225b9dbff059f0971ae295f5d5`, limited to adding `checks.operation_snapshot` and checking that the column already exists.
- Backend startup runs `prisma generate`, `prisma db push`, then a SQL backfill of GIH product snapshots. Therefore an ordinary backend restart can attempt schema synchronization.
- The tracked `backend/prisma` directory currently contains `schema.prisma` and `seed-data.sql`; it has no tracked `migrations` directory or migration history. Do **not** switch production to `prisma migrate deploy` until a baseline has been created, verified against the live schema, and marked as applied after a backup.

## Read-only schema preflight

Run this on the VPS to compare the schema bundled in the running backend image with the live database. It does not apply the generated SQL:

```bash
cd /root/minibar-os || exit 1
docker compose exec -T backend sh -lc \
  'cd /app && npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script'
```

Interpretation:
- Empty SQL output and a successful exit suggests the running image's Prisma schema and the database structure agree.
- Any generated SQL means a difference exists. Review it carefully; do not pipe it to a database command.
- A command error means the check is inconclusive, not that the database is clean.
- This checks the schema in the **running image**, not a not-yet-built commit.

Do not share `.env`, `DATABASE_URL`, tokens, SSH keys, or complete container environment output.

## Database migration principles

1. Take a database backup before any schema change and verify that the backup can be read. A backup is not proven until a restore has been tested on an isolated database.
2. Generate and review schema changes before deployment. Prefer additive, backward-compatible changes; use an explicit expand/migrate/contract sequence for changes that remove or rename data.
3. Establish and verify a Prisma migration baseline against the actual production schema before adopting `prisma migrate deploy`. Do not blindly mark a baseline applied if the live schema has not been compared with it.
4. Do not let ordinary API process startup apply schema changes. Schema deployment should be a separate, explicit, audited step.
5. Keep data backfills separately reviewable, resumable, and idempotent. Confirm affected-row counts before and after a production backfill.

## Deployment safeguards

- Run one deployment at a time. The tracked deploy script now takes a non-blocking filesystem lock under `/var/lib/minibar-os/deploy.lock` to prevent overlap with other invocations of that script.
- Build changed images before replacing running containers.
- Verify service readiness, not only Docker's `running` state.
- Record the target commit only after successful post-deploy checks.
- Plan rollback together with schema compatibility. Do not automatically roll an older backend image over a database change until it is proven that the old version can run safely against that schema.
- Since GitHub Actions can deploy on pushes to `design/desktop-unification`, merge only reviewed and CI-passing changes into that branch. Changes to the tracked deploy script do not automatically replace the installed entrypoint; synchronize it deliberately after reviewing the file and the production deployment state.

## Audit follow-up checklist

- [ ] Run the read-only schema preflight above and review any generated SQL.
- [ ] Identify the existing database backup process and test a restore in isolation.
- [ ] Create a reviewed Prisma baseline and migration runbook before changing startup schema behavior.
- [ ] Align the installed entrypoint with the reviewed tracked deploy script.
- [ ] Add and validate service readiness checks.
- [ ] Design rollback only after database startup is no longer allowed to mutate schema implicitly.
