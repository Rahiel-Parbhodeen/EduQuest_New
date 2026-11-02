import { defineConfig, devices } from '@playwright/test';

const webURL = `http://127.0.0.1:${process.env.DEV_WEB_PORT || 5173}`;
export default defineConfig({
  testDir: './frontend/e2e',
  timeout: 60_000,
  // PGlite exposes PostgreSQL over a socket but serializes execution internally.
  // Keep browser projects sequential so end-to-end jobs do not starve the worker.
  workers: 1,
  use: {
    baseURL: webURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: webURL,
    // Browser checks are an offline, deterministic suite. Do not inherit a
    // configured live provider from .env or reuse an interactive dev stack.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      AI_PROVIDER: 'mock',
      AUTH_RATE_LIMIT: '1000',
    },
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'chromium-tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'firefox-mobile',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'firefox-tablet',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
});
