// data/raw/services.json 을 사이트가 쓰는 형태로 정규화하고, 이전 버전과의 차이를 뽑는다.
// 출력: data/normalized/services.json, data/normalized/diff.json
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { normalizeService, isPublishable, diffServices } from './lib.mjs';

const today = new Date().toISOString().slice(0, 10);
const OUT = 'data/normalized/services.json';
const DIFF = 'data/normalized/diff.json';

// data/raw 가 오래됐는데 normalize 를 돌리면 옛 내용에 오늘 날짜만 찍힌다.
// 낡은 것보다 낡은 것을 최신인 척하는 쪽이 나쁘다. 실제로 한 번 그렇게 만들었다.
const ageHours = (Date.now() - (await stat('data/raw/services.json')).mtimeMs) / 3_600_000;
if (ageHours > 24 && !process.env.ALLOW_STALE_RAW) {
  console.error(`중단: data/raw 가 ${Math.floor(ageHours / 24)}일 지났다.`);
  console.error('이대로 정규화하면 옛 데이터에 오늘 날짜가 찍힌다. npm run sync 를 먼저 실행하라.');
  console.error('의도한 것이라면 ALLOW_STALE_RAW=1 을 붙여라.');
  process.exit(1);
}

const raw = JSON.parse(await readFile('data/raw/services.json', 'utf8'));
const normalized = raw.map((r) => normalizeService(r, today));

const publishable = normalized.filter(isPublishable);
const dropped = normalized.length - publishable.length;

// id 중복 제거. 원본에 같은 ID 가 두 번 오는 경우가 있다.
const seen = new Set();
const unique = publishable.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));

let prev = [];
try {
  prev = JSON.parse(await readFile(OUT, 'utf8')).services ?? [];
} catch {
  // 첫 실행
}

// 건수가 이전의 절반 이하로 줄면 API 장애로 보고 덮어쓰지 않는다.
// data/raw 는 저장소에 없으므로(용량) 이 비교는 정규화 결과로만 할 수 있다.
if (prev.length > 0 && unique.length < prev.length / 2) {
  console.error(`중단: ${prev.length}건 -> ${unique.length}건. API 이상으로 보임. 덮어쓰지 않음.`);
  process.exit(1);
}

const changes = diffServices(prev, unique);

// 발행된 문서(reviewed: true)의 원자료가 바뀌었는지 본다.
// 바뀌었다면 요약 박스의 금액·자격은 새 값이 되는데 해설 본문은 옛 내용을 설명하고 있어
// 페이지 안에서 모순이 생긴다. 이 경우에만 사람을 부른다.
const published = [];
for (const f of await readdir('content/services').catch(() => [])) {
  if (!f.endsWith('.md')) continue;
  if (/reviewed:\s*true/.test(await readFile(`content/services/${f}`, 'utf8'))) {
    published.push(f.replace(/\.md$/, ''));
  }
}
const affectsPublished = [...changes.changed, ...changes.removed].filter((id) =>
  published.includes(id)
);

const diff = { date: today, total: unique.length, ...changes, affectsPublished };

await mkdir('data/normalized', { recursive: true });
// 수집 기준일은 레코드마다 붙이지 않고 파일에 한 번만 둔다.
// 레코드에 넣으면 매일 전건이 변경으로 잡혀 git 이 40배 빨리 커진다(실측 확인).
await writeFile(OUT, JSON.stringify({ checkedAt: today, services: unique }, null, 2) + '\n');
await writeFile(DIFF, JSON.stringify(diff, null, 2) + '\n');

console.log(
  `정규화 ${unique.length}건 (원본 ${raw.length}, 발행 불가 ${dropped}, 중복 ${publishable.length - unique.length})`
);
console.log(`신규 ${diff.added.length} / 변경 ${diff.changed.length} / 종료 ${diff.removed.length}`);
console.log(
  affectsPublished.length === 0
    ? '발행분 영향 없음 -> 자동 반영 가능'
    : `발행분 ${affectsPublished.length}건 영향 -> 해설 재작성 필요: ${affectsPublished.join(', ')}`
);
