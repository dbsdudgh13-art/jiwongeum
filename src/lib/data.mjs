// 빌드 시점에 정규화 데이터를 읽는다. 파일이 없으면 빈 배열 — 스캐폴드 상태에서도 빌드가 돌아야 한다.
import { readFileSync } from 'node:fs';
import { SIDO, NATIONAL, TARGETS, MIN_HUB_ITEMS } from './site.mjs';

const readJson = (p, fallback) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
};

const snapshot = readJson('data/normalized/services.json', { checkedAt: '', services: [] });
/** 전체 데이터의 수집 기준일. 레코드마다 들고 있지 않고 여기 한 곳에만 있다. */
export const checkedAt = snapshot.checkedAt;
export const services = snapshot.services ?? [];
export const deadLinks = new Set(readJson('data/normalized/dead-links.json', []).map((d) => d.id));

export const byId = new Map(services.map((s) => [s.id, s]));

/** 색인시키면 안 되는 페이지: 종료됐거나 출처가 죽은 것. */
export const isNoindex = (s) => !s.open || deadLinks.has(s.id);

// 전국(중앙부처) 도 지역 허브의 하나로 취급한다. 미분류('')는 이름이 없다.
export const REGIONS = [NATIONAL, ...SIDO];
export const sidoName = (slug) => REGIONS.find((x) => x.slug === slug)?.name ?? '';
export const targetName = (slug) => TARGETS.find((x) => x.slug === slug)?.name ?? slug;

export const inSido = (slug) => services.filter((s) => s.sido === slug);
export const inTarget = (slug) => services.filter((s) => s.targets.includes(slug));

/** 항목이 MIN_HUB_ITEMS 미만인 허브는 만들지 않는다. 빈 조합 페이지 = doorway page. */
export const hubs = {
  sido: () => REGIONS.filter((x) => inSido(x.slug).length >= MIN_HUB_ITEMS),
  target: () => TARGETS.filter((x) => inTarget(x.slug).length >= MIN_HUB_ITEMS),
};

/**
 * 관련 지원금 추천. 같은 대상 3건 + 같은 지역 2건.
 *
 * pool 은 **실제로 페이지가 생성된 서비스**여야 한다. 전체 데이터에서 고르면
 * 아직 해설이 없는 서비스로 링크가 걸려 404 가 된다. 실제로 그렇게 나갔었다.
 */
export function related(s, pool, limit = 5) {
  const sameTarget = pool.filter((o) => o.id !== s.id && o.targets.some((t) => s.targets.includes(t)));
  const picked = sameTarget.slice(0, 3);
  const ids = new Set([s.id, ...picked.map((o) => o.id)]);
  const sameSido = s.sido
    ? pool.filter((o) => !ids.has(o.id) && o.sido === s.sido).slice(0, 2)
    : [];
  return [...picked, ...sameSido].slice(0, limit);
}
