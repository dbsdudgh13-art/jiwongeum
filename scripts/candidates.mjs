// scout 에게 넘길 후보 목록을 뽑는다. 판단은 하지 않고 기계적으로 거르기만 한다.
// 16MB 원본을 에이전트가 통째로 읽는 낭비를 막는 것이 목적.
//
// 사용: node scripts/candidates.mjs [개수]
import { readFile, readdir } from 'node:fs/promises';

const LIMIT = Number(process.argv[2] ?? 200);

const { services } = JSON.parse(await readFile('data/normalized/services.json', 'utf8'));
const published = new Set(
  (await readdir('content/services').catch(() => [])).map((f) => f.replace(/\.md$/, ''))
);

/** 해설 800자를 채울 만한 원자료가 있는지. 빈약한 항목을 미리 걸러낸다. */
const richness = (s) =>
  (s.support?.length ?? 0) + (s.target?.length ?? 0) + (s.criteria?.length ?? 0);

// 1회차에서 998자짜리 문서가 세 번 연속 반려됐다. 매번 다른 자리에서 같은 종류의 창작이
// 나왔고, 원인은 원자료가 본문 분량을 감당하지 못한 것이었다. 기준선을 800자 본문에
// 필요한 수준으로 올린다. 얇은 원자료를 통과시키면 writer 가 채우려고 지어낸다.
const MIN_SOURCE_CHARS = 1200;

const pool = services
  .filter((s) => s.open && !published.has(s.id) && richness(s) >= MIN_SOURCE_CHARS)
  .map((s) => ({
    ...s,
    score:
      Math.min(richness(s), 2000) / 100 +
      s.targets.length * 15 +           // 대상이 뚜렷하면 검색 의도가 분명하다
      (s.sido === 'national' ? 30 : 0), // 전국 단위가 검색 수요가 크다
  }))
  .sort((a, b) => b.score - a.score);

// 한 기관 문서만 몰아 쓰면 얇은 사이트로 보인다. 기관당 3건으로 제한한다.
const perOrg = new Map();
const picked = [];
for (const s of pool) {
  const n = perOrg.get(s.org) ?? 0;
  if (n >= 3) continue;
  perOrg.set(s.org, n + 1);
  picked.push(s);
  if (picked.length >= LIMIT) break;
}

console.log(
  JSON.stringify(
    picked.map((s) => ({
      id: s.id,
      name: s.name,
      org: s.org,
      sido: s.sido,
      targets: s.targets,
      category: s.category,
      period: s.period,
      chars: richness(s),
      summary: s.summary.slice(0, 80),
    })),
    null,
    2
  )
);
