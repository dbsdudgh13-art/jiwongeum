// 발행된 페이지의 출처 원문 링크가 살아있는지 확인한다.
// 죽은 링크는 data/normalized/dead-links.json 에 기록되고, 해당 페이지는 noindex 처리된다.
// 출처가 사라진 정부 지원금 페이지를 색인에 남겨두면 오정보가 된다.
//
// 반드시 국내에서 실행한다. gov.kr 은 해외 IP 를 막는다. GitHub Actions 에서 돌렸더니
// 6건 전부 죽었다고 나왔고, 실제로는 전부 살아 있었다. 그대로 반영됐으면 사이트 전체가
// noindex 처리될 뻔했다.
import { readFile, writeFile, readdir } from 'node:fs/promises';

const CONCURRENCY = 8;
const TIMEOUT_MS = 15_000;

// 링크가 죽었는지 판단하려면 그 서버에 닿을 수 있어야 한다. 대부분이 실패하면
// 링크가 아니라 이쪽 네트워크가 문제다. 그 경우 결과를 쓰지 않고 종료한다.
const MASS_FAILURE_RATIO = 0.5;
const MIN_SAMPLE = 3;

// 기본 UA 는 차단당하기 쉽다. 정부 사이트는 브라우저가 아닌 요청을 막는 경우가 많다.
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

const OUT = 'data/normalized/dead-links.json';

const { services } = JSON.parse(await readFile('data/normalized/services.json', 'utf8'));
const published = new Set(
  (await readdir('content/services').catch(() => [])).map((f) => f.replace(/\.md$/, ''))
);
const targets = services.filter((s) => published.has(s.id) && s.sourceUrl);

if (targets.length === 0) {
  console.log('검사할 발행 문서가 없다.');
  process.exit(0);
}

const alive = async (url) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: HEADERS });
    // HEAD 를 막아둔 정부 사이트가 많다. 405/501 이면 GET 으로 한 번 더.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: HEADERS });
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

const ratio = dead.length / targets.length;
if (targets.length >= MIN_SAMPLE && ratio >= MASS_FAILURE_RATIO) {
  console.error(
    `중단: ${targets.length}건 중 ${dead.length}건 실패(${Math.round(ratio * 100)}%).\n` +
      '정부 사이트가 한꺼번에 사라지는 일은 없다. 네트워크 차단이나 장애로 본다.\n' +
      `${OUT} 을 덮어쓰지 않는다. 국내 네트워크에서 다시 실행하라.`
  );
  process.exit(1);
}

await writeFile(OUT, JSON.stringify(dead, null, 2) + '\n');
console.log(`링크 검사 ${targets.length}건, 죽은 링크 ${dead.length}건`);
if (dead.length) console.log(dead.map((d) => `  ${d.id} -> ${d.url}`).join('\n'));
