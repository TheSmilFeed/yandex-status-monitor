import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { availabilityOf } from '../frontend/js/model.js';
import { availabilityChart } from '../frontend/js/charts.js';
import { trackPage, registerAnalytics } from '../frontend/js/analytics.js';

test('historical availability distinguishes failures, blocked probes and missing values', () => {
  assert.equal(availabilityOf({http_status:200}), 'available');
  assert.equal(availabilityOf({http_status:302}), 'available');
  assert.equal(availabilityOf({http_status:522}), 'unavailable');
  assert.equal(availabilityOf({http_status:403,status:'unavailable'}), 'unknown');
  assert.equal(availabilityOf({http_status:null,is_available:false,status:'unavailable'}), 'unavailable');
  assert.equal(availabilityOf({http_status:null}), 'unknown');
  assert.equal(availabilityOf({http_status:'200'}), 'unknown');
  assert.equal(availabilityOf({http_status:200,status:'unknown'}), 'unknown');
});

test('availability chart does not create samples or extrapolate sparse history', () => {
  const rows = [{checked_at:'2026-10-22T10:00:00Z',http_status:200}, {checked_at:'2026-10-22T11:00:00Z',http_status:403}];
  const graph = availabilityChart(rows,'30d','yandex-mail',Date.parse('2026-10-22T12:00:00Z'));
  assert.equal((graph.match(/<circle /g) || []).length, 2);
  assert.match(graph, /отсутствие измерений/);
  assert.equal(availabilityChart([], '24h', 'yandex-main'), '');
  assert.doesNotMatch(graph, /polyline|100%/);
});

test('six independent pages have valid relative navigation, titles and common analytics entry', async () => {
  const titles = new Set();
  for (const page of ['index','yandex','mospolytech','history','about','contacts']) {
    const html = await readFile(new URL(`../frontend/${page}.html`,import.meta.url),'utf8');
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
    assert.match(html,/src="\.\/js\/site.js"/);
    assert.match(html,/id="analytics-counters"/);
    assert.equal((html.match(/data-nav=/g) || []).length,6);
    for (const [,href] of html.matchAll(/(?:href|src)="(\.\/[^"?#]+)(?:[^\"]*)"/g)) await access(new URL(`../frontend/${href}`,import.meta.url));
  }
  assert.equal(titles.size,6);
  const contact = await readFile(new URL('../frontend/contacts.html',import.meta.url),'utf8');
  assert.match(contact,/mailto:fbgh2012@mail.ru/);
  assert.match(contact,/https:\/\/t.me\/ivan_litvin0v/);
});

test('analytics delivers once per navigation, supports late registration and isolates failures', () => {
  const calls = [];
  trackPage('/index.html','Обзор');
  registerAnalytics('liveinternet', p => calls.push(p.path));
  trackPage('/index.html','Обзор');
  assert.deepEqual(calls,['/index.html']);
  registerAnalytics('sberads', () => { throw new Error('Counter unavailable'); });
  registerAnalytics('mytracker', p => calls.push(`tracker:${p.path}`));
  assert.doesNotThrow(() => trackPage('/contacts.html','Связь'));
  assert.deepEqual(calls,['/index.html','tracker:/index.html','/contacts.html','tracker:/contacts.html']);
  assert.throws(() => registerAnalytics('unknown',()=>{}));
});
