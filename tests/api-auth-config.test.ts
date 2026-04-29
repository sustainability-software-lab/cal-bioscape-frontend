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
    /CA_BIOSITE_API_USER=/,
    'production should not deploy username-based JWT auth',
  );
  assert.doesNotMatch(
    config,
    /CA_BIOSITE_API_PASSWORD=/,
    'production should not deploy password-based JWT auth',
  );
  assert.doesNotMatch(
    config,
    /biocirv-staging-frontend-prod-service-password/,
    'production should not depend on the legacy service password secret',
  );
  assert.match(
    config,
    /--remove-secrets[\s\S]*CA_BIOSITE_API_USER,CA_BIOSITE_API_PASSWORD/,
    'production deploys should remove stale legacy JWT secret env vars from Cloud Run',
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

test('debug token route does not expose backend credentials', () => {
  const route = readRepoFile('src/app/api/auth/token/route.ts');

  assert.match(
    route,
    /hasToken:\s*true/,
    'token diagnostics should only report credential availability',
  );
  assert.doesNotMatch(
    route,
    /access_token|token_type/,
    'token diagnostics must not return the API key or JWT',
  );
});

test('client builds inline the public API base URL per environment', () => {
  const dockerfile = readRepoFile('Dockerfile');
  const productionConfig = readRepoFile('cloudbuild-prod.yaml');
  const stagingConfig = readRepoFile('cloudbuild-staging.yaml');

  assert.match(
    dockerfile,
    /ARG NEXT_PUBLIC_API_BASE_URL_BUILD=https:\/\/api\.calbioscape\.org/,
    'Docker builds should accept a public API base URL build argument',
  );
  assert.match(
    dockerfile,
    /ENV NEXT_PUBLIC_API_BASE_URL=\$NEXT_PUBLIC_API_BASE_URL_BUILD/,
    'Docker builds should expose the public API base URL before next build',
  );
  assert.match(
    productionConfig,
    /--build-arg NEXT_PUBLIC_API_BASE_URL_BUILD=https:\/\/api\.calbioscape\.org/,
    'production client bundles should see the production API URL at build time',
  );
  assert.match(
    stagingConfig,
    /--build-arg NEXT_PUBLIC_API_BASE_URL_BUILD=https:\/\/api-staging\.calbioscape\.org/,
    'staging client bundles should see the staging API URL at build time',
  );
});
