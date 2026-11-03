import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const origin = 'https://studybridge.example';
const scope = `${origin}/study/`;

function harness() {
  const handlers = {};
  const stores = new Map();
  const networkCalls = [];
  let fetchResponse = new Response('live HTML');
  let offline = false;
  let writeCount = 0;
  const resolve = key => new URL(typeof key === 'string' ? key : key.url, scope).href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const cache = stores.get(name);
      return {
        async addAll(paths) { paths.forEach(path => cache.set(resolve(path), new Response(`shell:${path}`))); },
        async put(key, response) { writeCount++; cache.set(resolve(key), response); },
        async match(key) { return cache.get(resolve(key)); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(key) { return stores.delete(key); },
    async match(key) {
      for (const cache of stores.values()) if (cache.has(resolve(key))) return cache.get(resolve(key));
    },
  };
  const self = {
    registration: { scope },
    location: { origin },
    clients: { async claim() {} },
    skipWaiting() {},
    addEventListener(name, handler) { handlers[name] = handler; },
  };
  const fetch = async request => {
    networkCalls.push(request.url);
    if (offline) throw new TypeError('offline');
    return fetchResponse.clone();
  };
  vm.runInNewContext(source, { self, caches, URL, Response, fetch, Set }, { filename: 'sw.js' });
  async function fire(type, request) {
    const promises = [];
    let response;
    const event = {
      request,
      waitUntil(promise) { promises.push(promise); },
      respondWith(promise) { response = promise; },
    };
    handlers[type](event);
    const result = response && await response;
    await Promise.all(promises);
    return { intercepted: !!response, result };
  }
  return {
    stores, networkCalls, caches, fire,
    setOffline(value) { offline = value; },
    setResponse(value) { fetchResponse = new Response(value); },
    get writeCount() { return writeCount; },
  };
}

function req(path, mode = 'navigate', method = 'GET') {
  return { url: new URL(path, scope).href, mode, method };
}

test('pre-caches the minimal public shell without needing keys or external services', async () => {
  const sw = harness();
  await sw.fire('install');
  assert.equal(sw.stores.get('studybridge-static-v2').size, 4);
  assert.equal(sw.writeCount, 0);
});

test('activation deletes only StudyBridge old caches and preserves unrelated app caches', async () => {
  const sw = harness();
  sw.stores.set('studybridge-static-v1', new Map());
  sw.stores.set('another-app-cache', new Map());
  await sw.fire('install');
  await sw.fire('activate');
  assert.equal(sw.stores.has('studybridge-static-v1'), false);
  assert.equal(sw.stores.has('another-app-cache'), true);
  assert.equal(sw.stores.has('studybridge-static-v2'), true);
});

test('successful navigation is network-first and never stores private or dynamic HTML', async () => {
  const sw = harness();
  await sw.fire('install');
  sw.setResponse('private personalised live content');
  const live = await sw.fire('fetch', req('./'));
  assert.equal(await live.result.text(), 'private personalised live content');
  assert.equal(sw.writeCount, 0);
  assert.equal(sw.stores.get('studybridge-static-v2').size, 4);
  const other = await sw.fire('fetch', req('./account'));
  assert.equal(other.intercepted, false);
});

test('offline homepage navigation returns the installed app shell', async () => {
  const sw = harness();
  await sw.fire('install');
  sw.setOffline(true);
  const hit = await sw.fire('fetch', req('./index.html'));
  assert.equal(hit.intercepted, true);
  assert.equal(await hit.result.text(), 'shell:./index.html');
});

test('API routes, off-origin requests, and POST requests bypass the worker', async () => {
  const sw = harness();
  await sw.fire('install');
  for (const request of [req('/api/ask'), req('./api/import'), req('https://other.example/'), req('./', 'navigate', 'POST')]) {
    assert.equal((await sw.fire('fetch', request)).intercepted, false);
  }
  assert.equal(sw.networkCalls.length, 0);
});

test('only known shell assets are served from the cache', async () => {
  const sw = harness();
  await sw.fire('install');
  sw.setOffline(true);
  assert.equal(await (await sw.fire('fetch', req('./favicon.svg', 'no-cors'))).result.text(), 'shell:./favicon.svg');
  assert.equal((await sw.fire('fetch', req('./student-notes.json', 'no-cors'))).intercepted, false);
});
