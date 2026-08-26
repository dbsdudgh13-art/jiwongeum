// data.go.kr 공공서비스(보조금24) 목록을 통째로 내려받아 data/raw/services.json 으로 저장한다.
// LLM 을 쓰지 않는다. GitHub Actions 가 매일 무인 실행한다.
//
// 사용:
//   DATA_GO_KR_KEY=... node scripts/sync.mjs           전체 동기화
//   DATA_GO_KR_KEY=... node scripts/sync.mjs --probe   1건만 받아 실제 필드명 출력
//
// 키가 없으면 기존 스냅샷을 그대로 두고 정상 종료한다. 빌드를 막지 않기 위함.
import { writeFile, readFile, mkdir, access } from 'node:fs/promises';

const KEY = process.env.DATA_GO_KR_KEY;
// 공공데이터포털 상세 페이지의 '요청 URL' 과 다르면 이 환경변수로 덮어쓴다.
const ENDPOINT =
  process.env.DATA_GO_KR_ENDPOINT ?? 'https://api.odcloud.kr/api/gov24/v3/serviceList';
const PER_PAGE = 500;
const OUT = 'data/raw/services.json';
const probe = process.argv.includes('--probe');

if (!KEY) {
  console.warn('DATA_GO_KR_KEY 없음. 동기화를 건너뛴다. 기존 스냅샷 유지.');
  process.exit(0);
}

const fetchPage = async (page) => {
  const url = `${ENDPOINT}?page=${page}&perPage=${probe ? 1 : PER_PAGE}&serviceKey=${encodeURIComponent(KEY)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url.replace(KEY, '***')}`);
  return res.json();
};

const first = await fetchPage(1);
const rows = first.data ?? first.body?.items ?? [];

if (probe) {
  console.log('응답 최상위 키:', Object.keys(first).join(', '));
  console.log('총 건수:', first.totalCount ?? '(모름)');
  console.log('레코드 필드명:');
  for (const [k, v] of Object.entries(rows[0] ?? {})) {
    console.log(`  ${k} = ${String(v).slice(0, 60)}`);
  }
  console.log('\n위 필드명을 scripts/lib.mjs 의 FIELD 에 반영하면 끝.');
  process.exit(0);
}

const total = first.totalCount ?? rows.length;
const pages = Math.ceil(total / PER_PAGE);
const all = [...rows];

for (let p = 2; p <= pages; p++) {
  const body = await fetchPage(p);
  all.push(...(body.data ?? body.body?.items ?? []));
  process.stdout.write(`\r${all.length}/${total}`);
}

// 받아온 게 기존보다 반 이하로 줄었으면 API 장애를 의심하고 덮어쓰지 않는다.
try {
  await access(OUT);
  const prev = JSON.parse(await readFile(OUT, 'utf8'));
  if (prev.length > 0 && all.length < prev.length / 2) {
    console.error(`\n중단: ${prev.length}건 -> ${all.length}건. API 이상으로 보임. 덮어쓰지 않음.`);
    process.exit(1);
  }
} catch {
  // 첫 실행이면 비교 대상 없음
}

await mkdir('data/raw', { recursive: true });
await writeFile(OUT, JSON.stringify(all, null, 2) + '\n');
console.log(`\n저장: ${OUT} (${all.length}건)`);
