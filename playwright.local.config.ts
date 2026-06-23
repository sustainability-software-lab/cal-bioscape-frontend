import { defineConfig, devices } from '@playwright/test';

// Local-only config: targets a dev server already running on :3100 (port 3000 is held
// by the Conductor oauth-proxy in this environment). Used for manual/agent verification
// of the feedstock popup; CI uses playwright.config.ts.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'echo "reusing existing server on :3100"',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 5_000,
  },
});
