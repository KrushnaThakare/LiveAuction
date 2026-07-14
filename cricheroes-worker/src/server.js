import 'dotenv/config';
import express from 'express';
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { candidateUrls, hasAnyStat, looksUnauthenticated, parseStatsFromText } from './stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5055);
const API_TOKEN = process.env.CRICHEROES_WORKER_TOKEN || '';
const USER_DATA_DIR = process.env.CRICHEROES_USER_DATA_DIR || path.resolve(__dirname, '../.auth/cricheroes-profile');
const HEADLESS = process.env.CRICHEROES_HEADLESS !== 'false';
const FETCH_TIMEOUT_MS = Number(process.env.CRICHEROES_FETCH_TIMEOUT_MS || 25000);
const USER_AGENT = process.env.CRICHEROES_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

let contextPromise;
let queue = Promise.resolve();

const app = express();
app.use(express.json({ limit: '128kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, authenticatedProfileDir: USER_DATA_DIR });
});

app.post('/fetch-stats', requireToken, async (req, res) => {
  const { profileUrl } = req.body || {};
  try {
    const result = await enqueue(() => fetchStats(profileUrl));
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    console.warn('[cricheroes-worker] fetch failed', {
      profileUrl,
      statusCode,
      message: error.message,
    });
    res.status(statusCode).json({
      success: false,
      code: error.code || 'FETCH_FAILED',
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[cricheroes-worker] listening on :${PORT}`);
  console.log(`[cricheroes-worker] profile dir: ${USER_DATA_DIR}`);
});

function requireToken(req, res, next) {
  if (!API_TOKEN) return next();
  const auth = req.header('authorization') || '';
  if (auth === `Bearer ${API_TOKEN}`) return next();
  return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Invalid worker token' });
}

function enqueue(task) {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
}

async function getContext() {
  if (!contextPromise) {
    contextPromise = chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: HEADLESS,
      userAgent: USER_AGENT,
      viewport: { width: 1366, height: 768 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      args: ['--disable-blink-features=AutomationControlled'],
    });
  }
  return contextPromise;
}

async function fetchStats(profileUrl) {
  const context = await getContext();
  const page = await context.newPage();
  try {
    for (const url of candidateUrls(profileUrl)) {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: FETCH_TIMEOUT_MS });
      await page.waitForTimeout(2500);
      const text = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
      if (looksUnauthenticated(page.url(), text)) {
        throw Object.assign(
          new Error('CricHeroes session is not logged in or has expired. Run `npm run login` on the worker host and complete mobile OTP/Captcha.'),
          { statusCode: 409, code: 'AUTH_REQUIRED' }
        );
      }

      const status = response?.status() || 0;
      if (status === 403) {
        throw Object.assign(
          new Error('CricHeroes blocked the authenticated browser request with HTTP 403. Re-login the worker profile or run it from a trusted network.'),
          { statusCode: 502, code: 'CRICHEROES_BLOCKED' }
        );
      }
      if (status >= 400) continue;

      const stats = parseStatsFromText(text);
      if (hasAnyStat(stats)) {
        return {
          ...stats,
          sourceUrl: page.url(),
          fetchedAt: new Date().toISOString(),
        };
      }
    }

    throw Object.assign(
      new Error('Could not find CricHeroes stats on the rendered profile. Check that this paid account can view the player stats page.'),
      { statusCode: 422, code: 'STATS_NOT_FOUND' }
    );
  } finally {
    await page.close().catch(() => {});
  }
}

process.on('SIGINT', async () => {
  if (contextPromise) {
    const context = await contextPromise.catch(() => null);
    await context?.close().catch(() => {});
  }
  process.exit(0);
});
