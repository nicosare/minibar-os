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

try {
  run(['prisma', 'generate', '--schema', schemaPath]);
  run(['prisma', 'db', 'push', '--schema', schemaPath, '--skip-generate']);
  console.log('Database initialized successfully.');
} catch (error) {
  console.error('Failed to initialize database:', error.message);
  process.exit(1);
}
