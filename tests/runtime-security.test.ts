import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function readRepoFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const dockerfile = readRepoFile('Dockerfile');
const nvmVersion = readRepoFile('.nvmrc').trim().replace(/^v/, '');
const nodeImage = dockerfile.match(/^\s*FROM\s+(?:--platform=\S+\s+)?(node:\S+)/im)?.[1];

function assertPatchedRuntime(version: string, source: string): void {
  assert.match(version, /^\d+\.\d+\.\d+$/, `${source} must pin a complete Node version`);
  const [major, minor, patch] = version.split('.').map(Number);
  // Node 24.22.1 fixes CVE-2026-111497; 24.22.2 also fixes its follow-up regression.
  // https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
  // https://nodejs.org/en/blog/release/v24.22.2
  assert.equal(major, 24, `${source} must use the supported Node 24 LTS release line`);
  assert.ok(minor > 22 || (minor === 22 && patch >= 2), `${source} must use Node >=24.22.2`);
}

test('deployed Node image uses a patched supported runtime pinned by digest', () => {
  assert.ok(nodeImage, 'Dockerfile must declare its Node base image');
  const version = nodeImage.match(/^node:(\d+\.\d+\.\d+)(?:-|@|$)/)?.[1];
  assert.ok(version, 'Node image must include an explicit runtime version');
  assertPatchedRuntime(version, 'Dockerfile');
  assert.match(nodeImage, /@sha256:[a-f0-9]{64}$/, 'Node image must use an immutable SHA-256 digest');
});

test('local and CI runtime pin matches the patched container runtime', () => {
  assertPatchedRuntime(nvmVersion, '.nvmrc');
  assert.ok(nodeImage?.startsWith(`node:${nvmVersion}-`), '.nvmrc and Dockerfile must select the same runtime');
  for (const workflow of ['security.yml', 'refresh-county-snapshot.yml', 'refresh-county-snapshot-prod.yml']) {
    assert.match(
      readRepoFile(`.github/workflows/${workflow}`),
      /node-version-file:\s*['"]?\.nvmrc['"]?\s*(?:#.*)?$/m,
      `${workflow} must inherit the patched .nvmrc runtime`,
    );
  }
});

test('container dependency installation preserves the audited lockfile', () => {
  const instructions = dockerfile.replace(/\\\r?\n/g, ' ').split(/\r?\n/)
    .filter((line) => /^\s*RUN\s/i.test(line)).join('\n');
  const installs = [...instructions.matchAll(/\bnpm\s+(ci|install|i)\b/g)].map((match) => match[1]);
  assert.ok(installs.length > 0, 'Dockerfile must install dependencies');
  assert.ok(installs.every((command) => command === 'ci'), 'Container installs must use npm ci to enforce the audited lockfile');
});
