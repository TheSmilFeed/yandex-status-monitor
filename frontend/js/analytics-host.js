export function isPublishedSite(address) {
  const url = new URL(address);
  return url.protocol === 'https:' && url.hostname === 'thesmilfeed.github.io' && url.pathname.startsWith('/yandex-status-monitor/');
}
