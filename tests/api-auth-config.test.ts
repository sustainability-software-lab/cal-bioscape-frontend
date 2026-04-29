import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const repoRoot = process.cwd();

function readRepoFile(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

test('production deployment uses API-key auth for backend access', () => {
  const config = readRepoFile('cloudbuild-prod.yaml');

  assert.match(
    config,
    /CA_BIOSITE_API_KEY=biocirv-production-frontend-api-key:latest/,
    'production should inject the production frontend API key secret',
  );
  assert.doesNotMatch(
    config,
    /CA_BIOSITE_API_USER/,
    'production should not deploy username-based JWT auth',
  );
  assert.doesNotMatch(
    config,
    /CA_BIOSITE_API_PASSWORD/,
    'production should not deploy password-based JWT auth',
  );
  assert.doesNotMatch(
    config,
    /biocirv-staging-frontend-prod-service-password/,
    'production should not depend on the legacy service password secret',
  );
});

test('staging deployment remains on API-key auth for backend access', () => {
  const config = readRepoFile('cloudbuild-staging.yaml');

  assert.match(
    config,
    /CA_BIOSITE_API_KEY=biocirv-staging-frontend-api-key:latest/,
    'staging should continue injecting the staging frontend API key secret',
  );
  assert.doesNotMatch(
    config,
    /CA_BIOSITE_API_USER|CA_BIOSITE_API_PASSWORD/,
    'staging should not reintroduce username/password backend auth',
  );
});
