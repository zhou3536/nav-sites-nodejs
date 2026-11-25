import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST,
  DATA_DIR: path.resolve(rootDir, process.env.DATA_DIR || './data'),
  PUBLIC_DIR: path.resolve(rootDir, 'public'),
};

export default config;
