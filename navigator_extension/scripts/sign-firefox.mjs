// Signs dist/firefox with Mozilla as an unlisted add-on. The keys come from .env or the shell:
// WEB_EXT_API_KEY and WEB_EXT_API_SECRET (see FIREFOX.md).
import { spawnSync } from 'node:child_process';

if (!process.env.WEB_EXT_API_KEY || !process.env.WEB_EXT_API_SECRET) {
  console.error('Missing WEB_EXT_API_KEY or WEB_EXT_API_SECRET: put them in navigator_extension/.env (see FIREFOX.md).');
  process.exit(1);
}

const args = ['web-ext@10', 'sign', '--source-dir', 'dist/firefox', '--artifacts-dir', 'dist/signed', '--channel', 'unlisted'];
const run = spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(run.status ?? 1);
