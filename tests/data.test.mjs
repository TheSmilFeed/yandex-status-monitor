import test from 'node:test';
import assert from 'node:assert/strict';
import { statusOf, readPayload, safeURL, escapeHTML, historyRows, number, associatedIncidents, formatDate } from '../frontend/js/model.js';
import { request } from '../frontend/js/api.js';

// Синтетические данные используются только в тестах и не входят в frontend.
const now = Date.parse('2026-10-18T18:00:00Z');
const service = (check = {}, extra = {}) => ({ slug:'yandex-mail', monitor_type:'combined', current:{checked_at:new Date(now).toISOString(),status:'operational',http_status:200,...check}, ...extra });
test('missing checks and invalid dates never imply availability', () => {
  assert.equal(statusOf({}, now).code,'unknown');
  assert.equal(statusOf(service({checked_at:'bad'}), now).code,'unknown');
  assert.equal(statusOf(service({http_status:null}), now).code,'unknown');
});
test('stale and future checks cannot be shown as current green status', () => {
  assert.equal(statusOf(service({checked_at:new Date(now-16*60000).toISOString()}),now).code,'unknown');
  assert.equal(statusOf(service({checked_at:new Date(now+120000).toISOString()}),now).code,'unknown');
});
test('HTTP success is explicitly limited to endpoint availability', () => {
  assert.equal(statusOf(service(),now).code,'operational');
  assert.match(statusOf(service(),now).note,/функции не проверены/);
});
test('HTTP 401/403 are unknown even if backend says unavailable', () => {
  for (const http_status of [401,403]) assert.equal(statusOf(service({http_status,status:'unavailable'}),now).code,'unknown');
});
test('Yandex HTTP failure alone is not a mass outage', () => {
  assert.equal(statusOf(service({http_status:502,status:'unavailable'}),now).code,'degraded');
  assert.equal(statusOf(service({http_status:502,status:'major_outage'}),now).code,'degraded');
  assert.equal(statusOf(service({http_status:502,status:'unavailable'},{incident:{is_confirmed:false,severity:'major_outage'}}),now).code,'degraded');
});
test('confirmed external incident and complaints override a successful HTTP check', () => {
  assert.equal(statusOf(service({external_status:'major_outage'}),now).code,'major_outage');
  assert.equal(statusOf(service({}, {incident:{is_confirmed:true,severity:'major_outage'}}),now).code,'major_outage');
  assert.equal(statusOf(service({complaints_count:10}),now).code,'degraded');
});
test('Mospolytech unavailable status is preserved without creating an incident', () => {
  const result = statusOf(service({http_status:522,status:'unavailable'},{slug:'mospolytech-lms',monitor_type:'http'}),now);
  assert.equal(result.code,'unavailable');
});
test('null measurements remain absent rather than being coerced to zero', () => {
  assert.equal(number(null),null); assert.equal(number('200'),null); assert.equal(number(0),0); assert.equal(number(-1),null);
});
test('malformed API payload is an error, empty array is a valid empty state', () => {
  assert.throws(()=>readPayload({ok:false,services:[]},'services'));
  assert.throws(()=>readPayload({ok:true,services:{}},'services'));
  assert.throws(()=>readPayload({ok:true,services:[null]},'services'));
  assert.deepEqual(readPayload({ok:true,services:[]},'services'),[]);
});
test('API content is escaped and executable URLs are rejected', () => {
  assert.equal(safeURL('javascript:alert(1)'),'');
  assert.equal(safeURL('https://user:secret@example.org'),'');
  assert.equal(safeURL('https://example.org/'),'https://example.org/');
  assert.equal(escapeHTML('<img onerror="run()">'),'&lt;img onerror=&quot;run()&quot;&gt;');
});
test('history filters timestamps and sorts chronologically without filling missing records', () => {
  const checks = [{checked_at:'invalid'}, {checked_at:new Date(now).toISOString()}, {checked_at:new Date(now-2*86400000).toISOString()}, {checked_at:new Date(now-60000).toISOString()}];
  const rows = historyRows(checks,'24h',now);
  assert.equal(rows.length,2); assert.equal(Date.parse(rows[0].checked_at),now-60000);
  assert.equal(historyRows(checks,'all',now).length,3);
});
test('incident association uses identities, never title guessing', () => {
  const events = [{id:'a',title:'Яндекс Почта'}, {id:'b',service_id:'uuid'}];
  assert.deepEqual(associatedIncidents({slug:'yandex-mail',incident:{id:'a'}},events),[events[0]]);
  assert.deepEqual(associatedIncidents({slug:'yandex-mail'},events),[]);
  assert.deepEqual(associatedIncidents({id:'uuid'},events),[events[1]]);
});
test('dates render in Moscow timezone', () => { assert.match(formatDate('2026-10-18T18:00:00Z',true),/21:00:00/); });
test('frontend API requests are GET only, without credentials and with encoded parameters', async () => {
  let observed;
  const result = await request('/api/status','services',{fetcher:async (url,options)=>{observed={url,options}; return {ok:true,json:async()=>({ok:true,services:[]})};}});
  assert.equal(observed.options.method,'GET'); assert.equal(observed.options.credentials,'omit');
  assert.equal(observed.options.mode,'cors'); assert.equal(observed.options.cache,'no-store');
  assert.equal(new URL(observed.url).pathname,'/api/status'); assert.deepEqual(result.services,[]);
});
test('network errors, unsuccessful HTTP responses, and invalid JSON are not converted to empty success', async () => {
  await assert.rejects(request('/api/status','services',{fetcher:async()=>{throw new TypeError('offline');}}),/offline/);
  await assert.rejects(request('/api/status','services',{fetcher:async()=>({ok:false,status:503})}),/503/);
  await assert.rejects(request('/api/status','services',{fetcher:async()=>({ok:true,json:async()=>{throw new SyntaxError('bad JSON');}})}),/bad JSON/);
});
