// 발행된 페이지의 출처 원문 링크가 살아있는지 확인한다.
// 죽은 링크는 data/normalized/dead-links.json 에 기록되고, 해당 페이지는 noindex 처리된다.
// 출처가 사라진 정부 지원금 페이지를 색인에 남겨두면 오정보가 된다.
import { readFile, writeFile, readdir } from 'node:fs/promises';

const CONCURRENCY = 8;
const TIMEOUT_MS = 10_000;

const services = JSON.parse(await readFile('data/normalized/services.json', 'utf8'));
const published = new Set(
  (await readdir('content/services').catch(() => [])).map((f) => f.replace(/\.md$/, ''))
);
const targets = services.filter((s) => published.has(s.id) && s.sourceUrl);

const alive = async (url) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
    // HEAD 를 막아둔 정부 사이트가 많다. 405/501 이면 GET 으로 한 번 더.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
    }
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const dead = [];
const queue = [...targets];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const s = queue.pop();
      if (!(await alive(s.sourceUrl))) dead.push({ id: s.id, url: s.sourceUrl });
    }
  })
);

await writeFile('data/normalized/dead-links.json', JSON.stringify(dead, null, 2) + '\n');
console.log(`링크 검사 ${targets.length}건, 죽은 링크 ${dead.length}건`);
if (dead.length) console.log(dead.map((d) => `  ${d.id} -> ${d.url}`).join('\n'));
