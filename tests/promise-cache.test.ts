import test from 'node:test';
import assert from 'node:assert/strict';

import { makePromiseCache } from '../src/lib/county-analysis';

test('promise cache deduplicates concurrent calls with the same key', async () => {
  let callCount = 0;
  const cache = makePromiseCache(async (key: string) => {
    callCount++;
    return key + '-result';
  });

  const [a, b] = await Promise.all([cache('x'), cache('x')]);

  assert.equal(callCount, 1, 'factory should only be called once for concurrent same-key calls');
  assert.equal(a, 'x-result');
  assert.equal(b, 'x-result');
});

test('promise cache serves repeat calls from cache without re-invoking factory', async () => {
  let callCount = 0;
  const cache = makePromiseCache(async (key: string) => {
    callCount++;
    return callCount;
  });

  await cache('y');
  const second = await cache('y');

  assert.equal(callCount, 1, 'factory should not be called again for a cached key');
  assert.equal(second, 1);
});

test('promise cache evicts rejected entries so subsequent calls retry', async () => {
  let callCount = 0;
  const cache = makePromiseCache(async (_key: string) => {
    callCount++;
    if (callCount === 1) throw new Error('first call fails');
    return 'success';
  });

  await assert.rejects(() => cache('z'), /first call fails/);

  // After rejection, cache should be clear -- next call must retry
  const result = await cache('z');
  assert.equal(callCount, 2, 'factory should be called again after rejection');
  assert.equal(result, 'success');
});
