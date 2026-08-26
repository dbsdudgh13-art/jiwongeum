// 빌드 시점에 정규화 데이터를 읽는다. 파일이 없으면 빈 배열 — 스캐폴드 상태에서도 빌드가 돌아야 한다.
import { readFileSync } from 'node:fs';
import { SIDO, TARGETS, MIN_HUB_ITEMS } from './site.mjs';

const readJson = (p, fallback) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
};

export const services = readJson('data/normalized/services.json', []);
export const deadLinks = new Set(readJson('data/normalized/dead-links.json', []).map((d) => d.id));

export const byId = new Map(services.map((s) => [s.id, s]));

/** 색인시키면 안 되는 페이지: 종료됐거나 출처가 죽은 것. */
export const isNoindex = (s) => !s.open || deadLinks.has(s.id);

export const sidoName = (slug) => SIDO.find((x) => x.slug === slug)?.name ?? slug;
export const targetName = (slug) => TARGETS.find((x) => x.slug === slug)?.name ?? slug;

export const inSido = (slug) => services.filter((s) => s.sido === slug);
export const inTarget = (slug) => services.filter((s) => s.targets.includes(slug));

/** 항목이 MIN_HUB_ITEMS 미만인 허브는 만들지 않는다. 빈 조합 페이지 = doorway page. */
export const hubs = {
  sido: () => SIDO.filter((x) => inSido(x.slug).length >= MIN_HUB_ITEMS),
  target: () => TARGETS.filter((x) => inTarget(x.slug).length >= MIN_HUB_ITEMS),
};

/** 같은 대상 3개 + 같은 지역 2개. 고아 페이지를 없애기 위한 내부링크. */
export function related(s, limit = 5) {
  const pool = new Map();
  for (const t of s.targets) {
    for (const o of inTarget(t)) if (o.id !== s.id) pool.set(o.id, o);
  }
  const sameTarget = [...pool.values()].slice(0, 3);
  const sameSido = inSido(s.sido).filter((o) => o.id !== s.id && !pool.has(o.id)).slice(0, 2);
  return [...sameTarget, ...sameSido].slice(0, limit);
}
