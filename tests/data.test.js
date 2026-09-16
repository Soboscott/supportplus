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

test('custom targets change only overdue count and keep strict boundaries', () => {
  const rows = ['Critical', 'High', 'Normal', 'Low'].map((priority, i) => ({
    ...demoData(now)[0], id: String(i), priority, status: 'Pending',
    created_at: new Date(now - 10 * hour).toISOString(), resolved_at: ''
  }));
  const base = metrics(rows, now);
  const equal = {Critical:10,High:10,Normal:10,Low:10};
  assert.equal(metrics(rows, now, equal).overdue, 0);
  const custom = metrics(rows, now, {...equal, High: 9.5});
  assert.deepEqual(custom, {...base, overdue:1});
  assert.equal(metrics(rows, now, {Critical:0.1,High:0.1,Normal:0.1,Low:0.1}).overdue, 4);
  assert.equal(metrics(rows, now, {Critical:8760,High:8760,Normal:8760,Low:8760}).overdue, 0);
  assert.deepEqual(metrics(rows, now), base);
});
test('invalid custom targets cannot silently misclassify tickets', () => {
  for (const value of [0, -1, NaN, Infinity, 8761, '', '24', null]) {
    assert.throws(() => metrics([], now, {Critical:value,High:24,Normal:72,Low:120}), /resolution target/);
  }
  assert.throws(() => metrics([], now, {}), /resolution target/);
});
test('targets apply to imported and filtered tickets and exclude resolved tickets', () => {
  const rows = parseCSV(toCSV(demoData(now)), now).filter(r => r.product === 'Admissions');
  const result = metrics(rows, now, {Critical:0.1,High:0.1,Normal:0.1,Low:0.1});
  assert.equal(result.overdue, rows.filter(r => r.status !== 'Resolved').length);
});

