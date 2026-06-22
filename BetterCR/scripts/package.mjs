// Zips the built extension (dist/) into a loadable/uploadable archive.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

if (!existsSync(new URL('../dist', import.meta.url))) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const out = `bettercr-v${pkg.version}.zip`;
execSync(`cd dist && zip -r -X "../${out}" .`, { stdio: 'inherit' });
console.log(`\n✓ Created ${out}`);
