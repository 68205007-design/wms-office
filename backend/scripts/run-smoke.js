/**
 * เปิด API ชั่วคราว → รอจนพร้อม → รัน smoke test → ปิด API
 * ใช้: npm run test:e2e
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.PORT || 4000;
const api = `http://localhost:${port}/api`;

const server = spawn(process.execPath, ['src/server.js'], { cwd: root, stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, NODE_ENV: 'test' } });

async function waitReady() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${api}/health`);
      if (r.ok) return true;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const ready = await waitReady();
if (!ready) {
  console.error('API ไม่พร้อมใช้งาน');
  server.kill();
  process.exit(1);
}
const test = spawn(process.execPath, ['scripts/smoke-test.js'], { cwd: root, stdio: 'inherit', env: { ...process.env, API_URL: api } });
test.on('exit', (code) => {
  server.kill();
  process.exit(code ?? 1);
});
