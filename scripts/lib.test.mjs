import assert from 'node:assert/strict';
import { slugify, sidoOf, targetsOf, isOpen, normalizeService, isPublishable, diffServices } from './lib.mjs';

const T = '2026-08-26';

// slugify
assert.equal(slugify('SVC-001'), 'svc-001');
assert.equal(slugify('  A B  '), 'a-b');
assert.equal(slugify(''), 'unknown');

// sidoOf
assert.equal(sidoOf('서울특별시 관악구'), 'seoul');
assert.equal(sidoOf('경기도 수원시'), 'gyeonggi');
assert.equal(sidoOf('강원특별자치도청'), 'gangwon');
assert.equal(sidoOf('보건복지부'), 'central');

// targetsOf
assert.deepEqual(targetsOf('청년 대상 창업 지원'), ['youth']);
assert.ok(targetsOf('소상공인 자영업자').includes('small-business'));
assert.deepEqual(targetsOf('해당 없음'), []);

// isOpen — 마지막 날짜 기준, 판단 불가면 열림
assert.equal(isOpen('상시신청', T), true);
assert.equal(isOpen('', T), true);
assert.equal(isOpen('2026.01.01 ~ 2026.03.31', T), false);
assert.equal(isOpen('2026.01.01 ~ 2026.12.31', T), true);

// normalizeService — 후보 필드명 중 존재하는 것을 집는다
const row = {
  servId: 'SVC-100',
  servNm: '청년 월세 지원',
  servDgst: '청년 1인가구 월세 보조',
  jurOrgNm: '서울특별시',
  servDtlLink: 'https://www.gov.kr/x',
  sprtCn: '월 20만원',
  rqutPrdCn: '2026.01.01 ~ 2026.12.31',
};
const n = normalizeService(row, T);
assert.equal(n.id, 'svc-100');
assert.equal(n.sido, 'seoul');
assert.deepEqual(n.targets, ['youth']);
assert.equal(n.open, true);
assert.equal(isPublishable(n), true);

// 출처 링크 없으면 발행 금지 (YMYL: 출처 없는 페이지를 내보내지 않는다)
assert.equal(isPublishable({ ...n, sourceUrl: '' }), false);

// diffServices — checkedAt 만 다른 건 변경으로 치지 않는다
const a = [{ id: 'x', name: 'A', checkedAt: '2026-08-25' }, { id: 'y', name: 'B', checkedAt: '2026-08-25' }];
const b = [{ id: 'x', name: 'A', checkedAt: T }, { id: 'z', name: 'C', checkedAt: T }];
assert.deepEqual(diffServices(a, b), { added: ['z'], changed: [], removed: ['y'] });
assert.deepEqual(diffServices(a, [{ id: 'x', name: 'A2', checkedAt: T }]).changed, ['x']);

console.log('lib.test.mjs: 모든 검사 통과');
