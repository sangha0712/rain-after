import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, 'dist');
const filenames = (await readdir(root)).filter((name) =>
  /\.(?:html|css|js|json|svg|png|webp|wav|ttf|txt)$/.test(name) && name !== 'vercel.json'
).sort();
const files = new Map(await Promise.all(filenames.map(async (name) =>
  [name, await readFile(join(root, name))]
)));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 16);
const releaseHash = createHash('sha256');
for (const [name, bytes] of files) releaseHash.update(name).update('\0').update(bytes);
releaseHash.update(await readFile(join(root, 'build.mjs')));
releaseHash.update(await readFile(join(root, 'vercel.json')));
const release = releaseHash.digest('hex').slice(0, 16);
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

await mkdir(output, { recursive: true });
for (const [name, bytes] of files) {
  let result = bytes;
  if (/\.(?:html|css|js)$/.test(name)) {
    let text = bytes.toString('utf8');
    for (const [asset, source] of files) {
      // Text files move together; unchanged large media keep their cache keys.
      const version = /\.(?:html|css|js|json)$/.test(asset) ? release : digest(source);
      const pattern = new RegExp(`(['"(])(${escapeRegExp(asset)})(?=['")#])`, 'g');
      text = text.replace(pattern, `$1$2?v=${version}`);
    }
    if (name.endsWith('.html')) {
      text = text.replace('</head>', `<meta name="site-version" content="${release}"></head>`);
    }
    result = Buffer.from(text);
  }
  await writeFile(join(output, name), result);
}
await writeFile(join(output, 'site-version.json'), JSON.stringify({ version: release }) + '\n');
await writeFile(join(output, 'refresh.html'), `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0;url=/?v=${release}"><title>최신 페이지로 이동</title>
<script>location.replace('/?v=${release}');</script></head>
<body><p>최신 페이지로 이동 중.</p><a href="/?v=${release}">최신 페이지 열기</a></body></html>\n`);
console.log(`Built ${files.size + 2} files; release ${release}`);
