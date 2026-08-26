import { SIDO, NATIONAL, TARGETS } from '../src/lib/site.mjs';

// 실제 응답 필드명. Swagger(gov24/v3/serviceList) 와 --probe 출력으로 확인함.
const FIELD = {
  id: '서비스ID',
  name: '서비스명',
  summary: '서비스목적요약',
  org: '소관기관명',
  orgType: '소관기관유형',
  dept: '부서명',
  sourceUrl: '상세조회URL',
  supportType: '지원유형',
  target: '지원대상',
  criteria: '선정기준',
  support: '지원내용',
  applyMethod: '신청방법',
  receiver: '접수기관',
  contact: '전화문의',
  period: '신청기한',
  category: '서비스분야',
  userType: '사용자구분',
  updatedAt: '수정일시',
};

const get = (row, key) => {
  const v = row?.[FIELD[key]];
  return v === undefined || v === null ? '' : String(v).trim();
};

// 신청방법·전화문의는 '||' 로 여러 값을 이어붙여 준다.
const list = (row, key) =>
  get(row, key)
    .split('||')
    .map((s) => s.trim())
    .filter(Boolean);

/** 20260129201825 형태의 타임스탬프를 YYYY-MM-DD 로. 형식이 다르면 빈 문자열. */
export function parseStamp(v) {
  const m = String(v ?? '').match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** 서비스 ID를 URL 안전한 slug 로. */
export function slugify(id) {
  const clean = String(id ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || 'unknown';
}

/**
 * 소관기관에서 지역 slug 를 정한다.
 * - 중앙행정기관 / 공공기관 -> 전국
 * - 그 밖에는 기관명에 광역단체 정식 명칭이 들어 있을 때만 그 지역
 * - 판정 불가면 빈 문자열. 지역 허브에서 빠질 뿐 상세 페이지는 정상 생성된다.
 *
 * 축약형('부산시설공단' 의 '부산')은 일부러 보지 않는다. '경기도 광주시' 가
 * 광주광역시로 새는 사고가 실제로 났다. 틀리게 넣느니 비워 두는 편이 낫다.
 * ponytail: 미분류 약 7%(대부분 지방공기업). 문제가 되면 기관코드 매핑을 붙인다.
 */
export function sidoOf(orgName, orgType) {
  const t = String(orgType ?? '');
  if (t === '중앙행정기관' || t === '공공기관') return NATIONAL.slug;
  const s = String(orgName ?? '');
  return SIDO.find((x) => s.includes(x.name))?.slug ?? '';
}

/** 본문 텍스트에서 대상 slug 목록 추론. */
export function targetsOf(...texts) {
  const hay = texts.filter(Boolean).join(' ');
  return TARGETS.filter((t) => t.keywords.some((k) => hay.includes(k))).map((t) => t.slug);
}

/**
 * 신청기한이 이미 지났는지 판단. 판단 불가면 열린 것으로 본다.
 * 열린 걸 닫혔다고 숨기는 쪽이 더 큰 손해다.
 */
export function isOpen(periodText, today) {
  const s = String(periodText ?? '');
  if (/상시|연중|수시|접수중/.test(s)) return true;
  const dates = [...s.matchAll(/(\d{4})[.\-\/년\s]+(\d{1,2})[.\-\/월\s]+(\d{1,2})/g)].map(
    (m) => `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  );
  if (dates.length === 0) return true;
  return dates[dates.length - 1] >= today;
}

/** 원본 API 행 하나를 사이트가 쓰는 형태로 정규화. */
export function normalizeService(row, today) {
  const org = get(row, 'org');
  const orgType = get(row, 'orgType');
  return {
    id: slugify(get(row, 'id')),
    name: get(row, 'name'),
    summary: get(row, 'summary'),
    org,
    orgType,
    dept: get(row, 'dept'),
    sourceUrl: get(row, 'sourceUrl'),
    supportType: get(row, 'supportType'),
    target: get(row, 'target'),
    criteria: get(row, 'criteria'),
    support: get(row, 'support'),
    applyMethod: list(row, 'applyMethod'),
    receiver: get(row, 'receiver'),
    contact: list(row, 'contact'),
    period: get(row, 'period'),
    category: get(row, 'category'),
    userType: get(row, 'userType'),
    sourceUpdatedAt: parseStamp(get(row, 'updatedAt')),
    sido: sidoOf(org, orgType),
    targets: targetsOf(
      get(row, 'summary'),
      get(row, 'target'),
      get(row, 'criteria'),
      get(row, 'category'),
      get(row, 'userType')
    ),
    open: isOpen(get(row, 'period'), today),
    checkedAt: today,
  };
}

/** 발행 가능한 최소 데이터가 있는지. 빈 껍데기 페이지를 막는 게 목적. */
export function isPublishable(s) {
  return Boolean(
    s.id && s.id !== 'unknown' && s.name && s.sourceUrl && (s.support || s.target)
  );
}

/** 이전 스냅샷 대비 신규/변경/종료 산출. */
export function diffServices(prev, next) {
  const prevMap = new Map(prev.map((s) => [s.id, s]));
  const nextMap = new Map(next.map((s) => [s.id, s]));
  // checkedAt 은 매일 바뀌므로 비교에서 뺀다. 안 그러면 매일 전건 변경으로 잡힌다.
  const strip = ({ checkedAt, ...rest }) => JSON.stringify(rest);
  return {
    added: next.filter((s) => !prevMap.has(s.id)).map((s) => s.id),
    changed: next
      .filter((s) => prevMap.has(s.id) && strip(prevMap.get(s.id)) !== strip(s))
      .map((s) => s.id),
    removed: prev.filter((s) => !nextMap.has(s.id)).map((s) => s.id),
  };
}
