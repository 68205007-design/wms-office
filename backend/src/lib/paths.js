import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(__dirname, '..', '..');
export const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
export const FRONTEND_DIST = path.resolve(ROOT_DIR, '..', 'frontend', 'dist');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
