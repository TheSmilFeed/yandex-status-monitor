import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { liveInternetHit } from '../frontend/js/liveinternet.js';

test('LiveInternet preserves official parameters and skips local or unrelated sites', () => {
  let sent = [];
  const image = { set src(value) { sent.push(value); } };
  const doc = { URL: 'https://thesmilfeed.github.io/yandex-status-monitor/service.html?service=yandex-mail', referrer: 'https://example.org/', title: 'Почта · Яндекс', getElementById: () => image };
  liveInternetHit(doc, {width:1280,height:900,colorDepth:24});
  assert.equal(sent.length, 1);
  assert.ok(sent[0].startsWith('https://counter.yadro.ru/hit?t52.11;r' + escape(doc.referrer) + ';s1280*900*24;u' + escape(doc.URL) + ';h' + escape(doc.title) + ';'));
  for (const URL of ['http://127.0.0.1:4173/', 'http://localhost:4173/', 'https://example.org/yandex-status-monitor/', 'https://thesmilfeed.github.io/another-project/', 'https://thesmilfeed.github.io/yandex-status-monitor-copy/']) liveInternetHit({...doc,URL});
  assert.equal(sent.length, 1);
  assert.doesNotThrow(() => liveInternetHit({...doc, getElementById: () => null}));
});

test('every page includes exactly one official visible badge without a second inline hit', async () => {
  for (const page of ['index','yandex','mospolytech','history','about','contacts','service','news']) {
    const html = await readFile(new URL(`../frontend/${page}.html`,import.meta.url),'utf8');
    assert.equal((html.match(/id="licntCDCA"/g) || []).length,1);
    assert.match(html,/width="88" height="31"/);
    assert.match(html,/https:\/\/www.liveinternet.ru\/click/);
    assert.doesNotMatch(html,/counter.yadro.ru\/hit|Счётчики пока не подключены/);
  }
});
