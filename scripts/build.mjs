import { cp, mkdir, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await mkdir(new URL('dist/', root), { recursive: true });
await cp(new URL('frontend/', root), new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/.nojekyll', root), '');
console.log('Static frontend copied to dist/. No dependencies or secrets required.');
