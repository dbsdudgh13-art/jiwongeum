// 발행 문서의 기계적 결함을 잡는다. 에이전트가 놓치거나 사람이 grep 을 잊어도 걸린다.
// 판단이 필요한 검사(사실 대조, 정책 위반)는 에이전트 몫이다. 여기는 기계로 확정되는 것만.
//
// 사용: npm run contentcheck
import { readFile, readdir } from 'node:fs/promises';

const DIR = 'content/services';
const MIN_BODY = 800;

// «원본 공고» 는 정부 문서를 가리키므로 허용. 그 밖의 «원본» 은 내부 데이터 지칭이라 금지.
// 독자에게 파이프라인 사정을 말하는 표현은 policy-guard 가 반복해서 반려했다.
const BANNED = [
  { re: /원본(?!\s*공고)\s*(자료|정보|데이터)?\s*(에는|에|은|는|이|가)?\s*(나와|명시|적혀|없|비어|갱신)/, why: '독자에게 내부 데이터를 지칭했다. «공고» 로 바꿔라' },
  { re: /필드(에|가|는)/, why: '데이터 필드를 독자에게 노출했다' },
  { re: /수집된 정보/, why: '파이프라인 노출' },
  // '무조건 ~ 아닙니다' 처럼 부정문에 쓰인 경우는 단정을 부정하는 문장이라 제외한다.
  { re: /무조건(?!.*(아닙니다|않습니다|없습니다))|100%\s*(승인|지원|가능)|누구나 받을 수 있/, why: 'AdSense 과장·보증 표현' },
];

// 마크다운에 섞여 들어간 태그. 페이지에 그대로 찍힌다.
const STRAY_TAG = /^\s*<\/?(content|document|file|answer|result)>\s*$/;

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
  // 따옴표 없는 날짜는 YAML 이 Date 객체로 파싱해 z.string() 검증에서 떨어진다.
  // 빌드가 통째로 실패하는데 에러 메시지가 원인을 바로 알려주지 않아 찾기 어렵다.
  if (/^updated:\s*\d{4}-\d{2}-\d{2}\s*$/m.test(front)) {
    add('updated 날짜에 따옴표가 없다. YAML 이 Date 로 파싱해 빌드가 실패한다 -> updated: "YYYY-MM-DD"');
  }

  for (const h of body.match(/^## .*$/gm) ?? []) {
    const k = h.trim();
    headings.set(k, [...(headings.get(k) ?? []), id]);
  }
}

// 같은 h2 제목이 3개 이상 문서에 반복되면 대량생성 신호다. 두 회차 연속 반려 사유였다.
for (const [h, ids] of headings) {
  if (ids.length >= 3) problems.push(`h2 중복 ${ids.length}건: "${h}" -> ${ids.join(', ')}`);
}

console.log(`문서 ${files.length}건, h2 ${headings.size}개 검사`);
if (problems.length === 0) {
  console.log('결함 없음');
} else {
  console.error(`\n결함 ${problems.length}건:`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
