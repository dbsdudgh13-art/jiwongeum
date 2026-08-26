// data/raw/services.json 을 사이트가 쓰는 형태로 정규화하고, 이전 버전과의 차이를 뽑는다.
// 출력: data/normalized/services.json, data/normalized/diff.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { normalizeService, isPublishable, diffServices } from './lib.mjs';

const today = new Date().toISOString().slice(0, 10);
const OUT = 'data/normalized/services.json';
const DIFF = 'data/normalized/diff.json';

const raw = JSON.parse(await readFile('data/raw/services.json', 'utf8'));
const normalized = raw.map((r) => normalizeService(r, today));

const publishable = normalized.filter(isPublishable);
const dropped = normalized.length - publishable.length;

// id 중복 제거. 원본에 같은 ID 가 두 번 오는 경우가 있다.
const seen = new Set();
const unique = publishable.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));

let prev = [];
try {
  prev = JSON.parse(await readFile(OUT, 'utf8'));
} catch {
  // 첫 실행
}

const diff = { date: today, total: unique.length, ...diffServices(prev, unique) };

await mkdir('data/normalized', { recursive: true });
await writeFile(OUT, JSON.stringify(unique, null, 2) + '\n');
await writeFile(DIFF, JSON.stringify(diff, null, 2) + '\n');

console.log(
  `정규화 ${unique.length}건 (원본 ${raw.length}, 발행 불가 ${dropped}, 중복 ${publishable.length - unique.length})`
);
console.log(`신규 ${diff.added.length} / 변경 ${diff.changed.length} / 종료 ${diff.removed.length}`);
