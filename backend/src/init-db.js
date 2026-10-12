import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const schemaPath = path.resolve(backendDir, 'prisma/schema.prisma');
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(args) {
  console.log(`> ${command} ${args.join(' ')}`);
  execFileSync(command, args, {
    cwd: backendDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PRISMA_SCHEMA_DISABLE_ADVISORY_CHECKS: 'true',
    },
  });
}

function runSql(sql) {
  console.log('> prisma db execute --stdin (backfill GIH product snapshots)');
  execFileSync(command, ['prisma', 'db', 'execute', '--schema', schemaPath, '--stdin'], {
    cwd: backendDir,
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
    env: {
      ...process.env,
      PRISMA_SCHEMA_DISABLE_ADVISORY_CHECKS: 'true',
    },
  });
}

try {
  run(['prisma', 'generate', '--schema', schemaPath]);
  run(['prisma', 'db', 'push', '--schema', schemaPath, '--skip-generate']);
  runSql(`
    UPDATE gih_items AS gi
    SET
      product_name = COALESCE(gi.product_name, p.name),
      product_price = COALESCE(gi.product_price, p.price),
      product_volume = COALESCE(gi.product_volume, p.volume),
      product_unit = COALESCE(gi.product_unit, p.unit),
      product_emoji = COALESCE(gi.product_emoji, p.emoji),
      product_bg_color = COALESCE(gi.product_bg_color, p.bg_color),
      product_category = COALESCE(gi.product_category, p.category)
    FROM products AS p
    WHERE p.id = gi.product_id
      AND (
        gi.product_name IS NULL OR
        gi.product_price IS NULL OR
        gi.product_volume IS NULL OR
        gi.product_unit IS NULL OR
        gi.product_emoji IS NULL OR
        gi.product_bg_color IS NULL OR
        gi.product_category IS NULL
      );
  `);
  console.log('Database initialized successfully.');
} catch (error) {
  console.error('Failed to initialize database:', error.message);
  process.exit(1);
}
