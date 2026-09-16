import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoData, metrics, parseCSV, toCSV, hour } from '../src/data.js';
const now = Date.parse('2026-09-16T12:00:00Z');
test('CSV handles commas, quotes, and multiline subjects', () => {
  const rows = demoData(now); rows[0].subject = 'Report, "totals"\nneed review';
  assert.deepEqual(parseCSV(toCSV(rows), now), rows);
});
test('metrics distinguish pending backlog, target boundary, and resolution time', () => {
  const base = demoData(now)[0];
  const rows = [
    {...base, status:'Pending', priority:'High', created_at:new Date(now-24*hour).toISOString(), resolved_at:''},
    {...base, status:'Open', priority:'Critical', created_at:new Date(now-5*hour).toISOString(), resolved_at:''},
    {...base, status:'Resolved', created_at:new Date(now-8*hour).toISOString(), resolved_at:new Date(now-2*hour).toISOString()}
  ];
  assert.deepEqual(metrics(rows, now), {total:3,open:2,overdue:1,average:6,aging:[1,1,0,0]});
  assert.equal(metrics([], now).average, null);
});
test('CSV rejects duplicates and inconsistent resolution dates', () => {
  const rows = demoData(now);
  assert.throws(() => parseCSV(toCSV([rows[0], rows[0]]), now), /duplicate/);
  rows[0].resolved_at = '';
  assert.throws(() => parseCSV(toCSV(rows), now), /resolution date/);
});
test('CSV rejects malformed and future dates and unclosed quotes', () => {
  const row = demoData(now)[0]; row.created_at = '2026-02-30T10:00:00Z';
  assert.throws(() => parseCSV(toCSV([row]), now), /valid UTC/);
  row.created_at = '2027-01-01T10:00:00Z';
  assert.throws(() => parseCSV(toCSV([row]), now), /valid UTC/);
  assert.throws(() => parseCSV('"unclosed', now), /unclosed/);
});
