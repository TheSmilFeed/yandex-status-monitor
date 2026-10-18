import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
const root = fileURLToPath(new URL('../frontend/', import.meta.url));
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
const port = Number(process.env.PORT || 4173);
const server = createServer(async (req, res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, '.' + requested + (requested.endsWith('/') ? 'index.html' : ''));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403); res.end(); return; }
    if (!(await stat(path)).isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(path));
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
