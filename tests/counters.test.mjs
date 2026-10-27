import test from 'node:test';
import assert from 'node:assert/strict';
import { startSberAds } from '../frontend/js/sberads.js';
import { startMyTracker } from '../frontend/js/mytracker.js';

function page(URL = 'https://thesmilfeed.github.io/yandex-status-monitor/contacts.html') {
  const scripts = [];
  const listeners = {};
  return { scripts, listeners, doc: { URL, addEventListener: (type, handler) => (listeners[type] ||= []).push(handler), getElementById: id => scripts.find(s => s.id === id), createElement: () => ({}), head: { appendChild: s => scripts.push(s) } } };
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

test('real link actions send the matching SberAds event once without cancelling navigation', () => {
  const {doc, listeners} = page();
  const events = [];
  const win = { top100: class { trackEvent(...args) { events.push(args); } } };
  startSberAds(win, doc);
  startSberAds(win, doc);
  win._top100q[0]();
  assert.equal(listeners.click.length, 1);
  const click = (href, extra = {}) => listeners.click[0]({ type: 'click', button: 0, defaultPrevented: false, target: { closest: () => ({href}) }, ...extra });
  click('https://t.me/ivan_litvin0v');
  click('./history.html');
  click('mailto:fbgh2012@mail.ru');
  click('https://example.com/history.html');
  click('https://t.me/ivan_litvin0v', {defaultPrevented:true});
  click('https://t.me/ivan_litvin0v', {button:2});
  assert.deepEqual(events, [
    ['contactTelegram', {page:'contacts',target:'telegram'}],
    ['openHistory', {page:'contacts.html'}],
  ]);
});

test('an early Telegram click waits for the library and a library error cannot cancel links', () => {
  const {doc, listeners} = page();
  const events = [];
  const win = { top100: class { trackEvent(...args) { events.push(args); } } };
  startSberAds(win, doc);
  const event = {type:'click',button:0,target:{closest:()=>({href:'https://t.me/ivan_litvin0v'})}};
  listeners.click[0](event);
  assert.equal(events.length,0);
  win._top100q[0]();
  assert.equal(events.length,1);
  win.top100Counter.trackEvent = () => { throw new Error('Unavailable'); };
  assert.doesNotThrow(()=>listeners.click[0](event));
});

test('Telegram is counted only on Contacts; local and unrelated sites have no event handlers', () => {
  for (const address of ['http://localhost:4173/contacts.html','https://example.com/contacts.html']) {
    const {doc,listeners}=page(address);startSberAds({},doc);assert.deepEqual(listeners,{});
  }
  const {doc,listeners}=page('https://thesmilfeed.github.io/yandex-status-monitor/index.html');
  const events=[];const win={top100:class {trackEvent(...args){events.push(args);}}};
  startSberAds(win,doc);win._top100q[0]();
  listeners.click[0]({type:'click',button:0,target:{closest:()=>({href:'https://t.me/ivan_litvin0v'})}});
  assert.deepEqual(events,[]);
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
