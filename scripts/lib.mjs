import { SIDO, TARGETS } from '../src/lib/site.mjs';

// ponytail: 실제 API 응답을 아직 못 봤다. 후보 필드명을 나열해 먼저 맞는 걸 쓴다.
// API 키 발급 후 응답 한 건 찍어보고 여기만 확정하면 나머지는 안 건드려도 된다.
const FIELD = {
  id: ['servId', 'SVC_ID', 'serviceId'],
  name: ['servNm', 'SVC_NM', 'serviceName'],
  summary: ['servDgst', 'SVC_DGST', 'summary'],
  org: ['jurOrgNm', 'JUR_ORG_NM', 'orgNm'],
  ministry: ['jurMnofNm', 'JUR_MNOF_NM'],
  sourceUrl: ['servDtlLink', 'SVC_DTL_LINK', 'detailUrl'],
  support: ['sprtCn', 'alwServCn', 'SPRT_CN'],
  criteria: ['slctCritCn', 'SLCT_CRIT_CN'],
  applyMethod: ['aplyMtdCn', 'APLY_MTD_CN'],
  period: ['rqutPrdCn', 'aplyPrdCn', 'RQUT_PRD_CN'],
  target: ['trgterIndvdlArray', 'TRGTER_INDVDL_ARRAY'],
  theme: ['intrsThemaArray', 'INTRS_THEMA_ARRAY'],
  lifecycle: ['lifeArray', 'LIFE_ARRAY'],
};

const pick = (row, keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

/** 서비스 ID를 URL 안전한 slug 로. 원본 ID가 이미 영숫자면 그대로 쓴다. */
export function slugify(id) {
  const s = String(id ?? '').trim().toLowerCase();
  const clean = s.replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '');
  return clean || 'unknown';
}

/** 기관명에서 시도 slug 추론. 못 찾으면 중앙부처로 본다. */
export function sidoOf(orgName) {
  const s = String(orgName ?? '');
  for (const { slug, name } of SIDO) {
    if (slug === 'central') continue;
    // '서울특별시' -> '서울', '경기도' -> '경기' 로도 매칭
    const short = name.replace(/(특별자치도|특별자치시|특별시|광역시|도)$/, '');
    if (s.includes(name) || (short.length >= 2 && s.includes(short))) return slug;
  }
  return 'central';
}

/** 본문 텍스트에서 대상 slug 목록 추론. */
export function targetsOf(...texts) {
  const hay = texts.filter(Boolean).join(' ');
  return TARGETS.filter((t) => t.keywords.some((k) => hay.includes(k))).map((t) => t.slug);
}

/**
 * 신청기한 문자열이 이미 지났는지 판단. 판단 불가면 열린 것으로 본다.
 * (닫힌 걸 열렸다고 보는 실수보다, 열린 걸 닫혔다고 숨기는 실수가 더 나쁘다)
 */
export function isOpen(periodText, today) {
  const s = String(periodText ?? '');
  if (/상시|연중|수시/.test(s)) return true;
  const dates = [...s.matchAll(/(\d{4})[.\-\/년\s]+(\d{1,2})[.\-\/월\s]+(\d{1,2})/g)].map(
    (m) => `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  );
  if (dates.length === 0) return true;
  return dates[dates.length - 1] >= today;
}

/** 원본 API 행 하나를 사이트가 쓰는 형태로 정규화. */
export function normalizeService(row, today) {
  const id = slugify(pick(row, FIELD.id));
  const org = pick(row, FIELD.org) || pick(row, FIELD.ministry);
  const period = pick(row, FIELD.period);
  const criteria = pick(row, FIELD.criteria);
  const support = pick(row, FIELD.support);
  const summary = pick(row, FIELD.summary);
  return {
    id,
    name: pick(row, FIELD.name),
    summary,
    org,
    ministry: pick(row, FIELD.ministry),
    sourceUrl: pick(row, FIELD.sourceUrl),
    support,
    criteria,
    applyMethod: pick(row, FIELD.applyMethod),
    period,
    sido: sidoOf(org),
    targets: targetsOf(summary, criteria, pick(row, FIELD.target), pick(row, FIELD.lifecycle)),
    open: isOpen(period, today),
    checkedAt: today,
  };
}

/** 발행 가능한 최소 데이터가 있는지. 빈 껍데기 페이지를 막는 게 목적. */
export function isPublishable(s) {
  return Boolean(
    s.id && s.id !== 'unknown' && s.name && s.sourceUrl && (s.support || s.criteria)
  );
}

/** 이전 스냅샷 대비 신규/변경/종료 산출. */
export function diffServices(prev, next) {
  const prevMap = new Map(prev.map((s) => [s.id, s]));
  const nextMap = new Map(next.map((s) => [s.id, s]));
  const added = next.filter((s) => !prevMap.has(s.id)).map((s) => s.id);
  const removed = prev.filter((s) => !nextMap.has(s.id)).map((s) => s.id);
  const changed = next
    .filter((s) => {
      const p = prevMap.get(s.id);
      if (!p) return false;
      // checkedAt 은 매일 바뀌므로 비교에서 뺀다. 안 그러면 매일 전건 변경으로 잡힌다.
      const strip = ({ checkedAt, ...rest }) => JSON.stringify(rest);
      return strip(p) !== strip(s);
    })
    .map((s) => s.id);
  return { added, changed, removed };
}
