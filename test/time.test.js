import test from 'node:test';
import assert from 'node:assert/strict';
import { indiaDate } from '../server/time.js';

test('uses the Indian date when UTC is still on the previous day', () => {
  assert.equal(
    indiaDate(new Date('2026-11-16T20:59:00.000Z')),
    '2026-11-17'
  );
});

test('correctly handles midnight in India', () => {
  assert.equal(
    indiaDate(new Date('2026-11-17T18:45:00.000Z')),
    '2026-11-18'
  );
});