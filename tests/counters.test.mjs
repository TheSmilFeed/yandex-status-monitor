import test from 'node:test';
import assert from 'node:assert/strict';
import { startSberAds } from '../frontend/js/sberads.js';
import { startMyTracker } from '../frontend/js/mytracker.js';

function page(URL = 'https://thesmilfeed.github.io/yandex-status-monitor/contacts.html') {
  const scripts = [];
  return { scripts, doc: { URL, getElementById: id => scripts.find(s => s.id === id), createElement: () => ({}), head: { appendChild: s => scripts.push(s) } } };
}

test('official counters initialize once per document with issued IDs', () => {
  const {doc, scripts} = page();
  const projects = [];
  const win = { top100: class { constructor(options) { projects.push(options.project); } } };
  startSberAds(win, doc);
  startSberAds(win, doc);
  startMyTracker(win, doc);
  startMyTracker(win, doc);
  assert.equal(scripts.length, 2);
  assert.equal(win._top100q.length, 1);
  win._top100q[0]();
  assert.deepEqual(projects, [7753202]);
  assert.equal(win._tmr.length, 1);
  assert.equal(win._tmr[0].id, '3807709');
  assert.equal(win._tmr[0].type, 'pageView');
  assert.deepEqual(scripts.map(s => s.src), ['https://st.top100.ru/top100/top100.js', 'https://top-fwz1.mail.ru/js/code.js']);
  assert.ok(scripts.every(s => s.async));
});

test('local previews and unrelated hosts do not load counters or queue events', () => {
  for (const address of ['http://127.0.0.1:4173/', 'http://localhost:4173/', 'https://example.com/yandex-status-monitor/', 'https://thesmilfeed.github.io/another-site/']) {
    const {doc, scripts} = page(address);
    const win = {};
    startSberAds(win, doc);
    startMyTracker(win, doc);
    assert.deepEqual(scripts, []);
    assert.deepEqual(win, {});
  }
});

test('a blocked SberAds library does not prevent other counter initialization', () => {
  const {doc} = page();
  const win = {};
  startSberAds(win, doc);
  assert.doesNotThrow(() => win._top100q[0]());
  startMyTracker(win, doc);
  assert.equal(win._tmr.length, 1);
});
