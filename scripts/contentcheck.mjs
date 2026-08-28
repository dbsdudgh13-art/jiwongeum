// 발행 문서의 기계적 결함을 잡는다. 에이전트가 놓치거나 사람이 grep 을 잊어도 걸린다.
// 판단이 필요한 검사(사실 대조, 정책 위반)는 에이전트 몫이다. 여기는 기계로 확정되는 것만.
//
// 사용: npm run contentcheck
import { readFile, readdir } from 'node:fs/promises';

const DIR = 'content/services';
const MIN_BODY = 800;

// «원본 공고» 는 정부 문서를 가리키므로 허용. 그 밖의 «원본» 은 내부 데이터 지칭이라 금지.
const BANNED = [
  { re: /원본(?!\s*공고)\s*(자료|정보|데이터)?\s*(에는|에|은|는|이|가)?\s*(나와|명시|적혀|없|비어|갱신)/, why: '독자에게 내부 데이터를 지칭했다. «공고» 로 바꿔라' },
  { re: /필드(에|가|는)/, why: '데이터 필드를 독자에게 노출했다' },
  { re: /수집된 정보/, why: '파이프라인 노출' },
  // '무조건 ~ 아닙니다' 처럼 부정문에 쓰인 경우는 단정을 부정하는 문장이라 제외한다.
  { re: /무조건(?!.*(아닙니다|않습니다|없습니다))|100%\s*(승인|지원|가능)|누구나 받을 수 있/, why: 'AdSense 과장·보증 표현' },

  // policy-guard 가 여러 문서에서 글자 그대로 반복된다고 잡아낸 상투구.
  // 문장 틀이 같으면 제목이 달라도 '겉만 바꾼' 대량생성으로 판정된다.
  // 한 번 쓰였다고 문제인 표현은 아니지만, 쓰지 않는 편이 안전하므로 아예 막는다.
  // 새 상투구가 적발되면 여기에 추가한다.
  { re: /가 운영하는 사업(으로|입니다)/, why: '여러 문서에서 반복된 도입부 상투구다. 이 제도에 맞는 문장으로 다시 써라' },
  { re: /안내되어 있고, 접수는/, why: '여러 문서에서 반복된 접수 안내 상투구다' },
  { re: /확인하는 것이 정확합니다/, why: '여러 문서에서 반복된 맺음 상투구다' },
  { re: /시기는 접수기관마다 다르다/, why: '여러 문서에서 반복된 h2 상투구다. 원본 period 문구는 본문에서 쓰고 제목은 달리 지어라' },
];

const STRAY_TAG = /^\s*<\/?(content|document|file|answer|result)>\s*$/;

// 같은 h2 가 이 개수 이상 문서에 반복되면 대량생성 신호다.
const MIN_DOCS = 3;

const files = (await readdir(DIR)).filter((f) => f.endsWith('.md'));
const problems = [];
const headings = new Map();

for (const f of files) {
  const id = f.replace(/\.md$/, '');
  const raw = await readFile(`${DIR}/${f}`, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) {
    problems.push(`${id}: 프론트매터를 찾을 수 없다`);
    continue;
  }
  const [, front, body] = m;
  const add = (msg) => problems.push(`${id}: ${msg}`);

  raw.split('\n').forEach((line, i) => {
    if (STRAY_TAG.test(line)) add(`${i + 1}행에 태그가 섞였다 -> ${line.trim()}`);
    for (const { re, why } of BANNED) {
      if (re.test(line)) add(`${i + 1}행: ${why}\n      "${line.trim().slice(0, 60)}..."`);
    }
  });

  const chars = body.replace(/\s/g, '').length;
  if (chars < MIN_BODY) add(`본문 ${chars}자. 최소 ${MIN_BODY}자 미달`);

  const faq = (front.match(/^\s+- q:/gm) ?? []).length;
  if (faq !== 3) add(`FAQ ${faq}개. 3개여야 한다`);

  if (!/^title:/m.test(front)) add('title 없음');
  if (!/^description:/m.test(front)) add('description 없음');
  if (!/^updated:/m.test(front)) add('updated 없음');
  // 따옴표 없는 날짜는 YAML 이 Date 로 파싱해 z.string() 검증에서 떨어진다.
  if (/^updated:\s*\d{4}-\d{2}-\d{2}\s*$/m.test(front)) {
    add('updated 날짜에 따옴표가 없다. YAML 이 Date 로 파싱해 빌드가 실패한다');
  }

  for (const h of body.match(/^## .*$/gm) ?? []) {
    const k = h.trim();
    headings.set(k, [...(headings.get(k) ?? []), id]);
  }
}

for (const [h, ids] of headings) {
  if (ids.length >= MIN_DOCS) problems.push(`h2 중복 ${ids.length}건: "${h}" -> ${ids.join(', ')}`);
}

console.log(`문서 ${files.length}건, h2 ${headings.size}개 검사`);
if (problems.length === 0) {
  console.log('결함 없음');
} else {
  console.error(`\n결함 ${problems.length}건:`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
