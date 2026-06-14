import 'dotenv/config';
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = process.env.CRICHEROES_USER_DATA_DIR || path.resolve(__dirname, '../.auth/cricheroes-profile');
const START_URL = process.env.CRICHEROES_LOGIN_URL || 'https://cricheroes.com/';

console.log('[cricheroes-worker] Opening browser for manual CricHeroes login.');
console.log('[cricheroes-worker] Complete mobile number, OTP, and Captcha in the browser.');
console.log(`[cricheroes-worker] Session profile will be saved at: ${USER_DATA_DIR}`);

const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
  headless: false,
  viewport: { width: 1366, height: 768 },
  locale: 'en-IN',
  timezoneId: 'Asia/Kolkata',
});

const page = context.pages()[0] || await context.newPage();
await page.goto(START_URL, { waitUntil: 'domcontentloaded' });

const rl = readline.createInterface({ input, output });
await rl.question('\nAfter you are fully logged in and can view paid CricHeroes stats, press Enter here to save the session...');
rl.close();

await context.close();
console.log('[cricheroes-worker] Login session saved. Start the worker with `npm start`.');
