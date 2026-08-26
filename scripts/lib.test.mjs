import assert from 'node:assert/strict';
import {
  slugify, sidoOf, targetsOf, isOpen, parseStamp,
  normalizeService, isPublishable, diffServices,
} from './lib.mjs';

const T = '2026-08-26';

// slugify
assert.equal(slugify('000000465790'), '000000465790');
assert.equal(slugify('SVC-001'), 'svc-001');
assert.equal(slugify(''), 'unknown');

// parseStamp — API 는 20260129201825 형태로 준다
assert.equal(parseStamp('20260129201825'), '2026-01-29');
assert.equal(parseStamp(''), '');
assert.equal(parseStamp('없음'), '');

// sidoOf — 기관유형이 먼저, 그 다음 기관명의 광역 정식 명칭
assert.equal(sidoOf('교육부', '중앙행정기관'), 'national');
assert.equal(sidoOf('한국장학재단', '공공기관'), 'national');
assert.equal(sidoOf('서울특별시 관악구', '시군구'), 'seoul');
assert.equal(sidoOf('경기도 광주시', '시군구'), 'gyeonggi');       // 광주광역시로 새면 안 된다
assert.equal(sidoOf('전남광주통합특별시 영암군', '시군구'), 'jeonnam-gwangju');
assert.equal(sidoOf('강원특별자치도교육청', '교육청'), 'gangwon');
// 광역 정식 명칭이 없는 지방공기업은 비워 둔다. 틀리게 넣지 않는다
assert.equal(sidoOf('부산시설공단', '지방공기업'), '');
assert.equal(sidoOf('시흥도시공사', '지방공기업'), '');

// targetsOf
assert.deepEqual(targetsOf('청년 대상 지원'), ['youth']);
assert.ok(targetsOf('보육·교육', '3~5세 유아').includes('parenting'));
assert.deepEqual(targetsOf('해당 없음'), []);

// isOpen
assert.equal(isOpen('상시신청', T), true);
assert.equal(isOpen('', T), true);
assert.equal(isOpen('2026.01.01 ~ 2026.03.31', T), false);
assert.equal(isOpen('2026.01.01 ~ 2026.12.31', T), true);

// normalizeService — 실제 응답 한 건(유아학비 지원)을 축약한 형태
const row = {
  '서비스ID': '000000465790',
  '서비스명': '유아학비 (누리과정) 지원',
  '서비스목적요약': '유치원에 다니는 3~5세 아동에게 유아학비 지원',
  '서비스분야': '보육·교육',
  '선정기준': '국공립 및 사립유치원에 다니는 3~5세',
  '지원대상': '국공립 및 사립유치원에 다니는 3~5세 유아',
  '지원내용': '국공립 100,000원, 사립 280,000원',
  '지원유형': '현금(감면)',
  '신청방법': '기타 온라인신청||방문신청',
  '전화문의': '교육부/02-6222-6060||0079에듀콜/1544-0079',
  '신청기한': '상시신청',
  '접수기관': '주민센터',
  '상세조회URL': 'https://www.gov.kr/portal/rcvfvrSvc/dtlEx/000000465790',
  '소관기관명': '교육부',
  '소관기관유형': '중앙행정기관',
  '부서명': '영유아재정과',
  '사용자구분': '개인',
  '수정일시': '20260129201825',
};
const n = normalizeService(row, T);
assert.equal(n.id, '000000465790');
assert.equal(n.name, '유아학비 (누리과정) 지원');
assert.equal(n.sido, 'national');
assert.equal(n.open, true);
assert.equal(n.sourceUpdatedAt, '2026-01-29');
// '||' 로 이어진 값은 배열로 쪼갠다
assert.deepEqual(n.applyMethod, ['기타 온라인신청', '방문신청']);
assert.equal(n.contact.length, 2);
assert.ok(n.targets.includes('parenting'));
assert.equal(isPublishable(n), true);

// 없는 필드는 빈 문자열이지 undefined 가 아니다 (템플릿에서 undefined 가 찍히면 안 된다)
const empty = normalizeService({}, T);
assert.equal(empty.name, '');
assert.deepEqual(empty.applyMethod, []);
assert.equal(isPublishable(empty), false);

// 출처 링크 없으면 발행 금지 (YMYL: 출처 없는 페이지를 내보내지 않는다)
assert.equal(isPublishable({ ...n, sourceUrl: '' }), false);

// diffServices — checkedAt 만 다른 건 변경으로 치지 않는다
const a = [{ id: 'x', name: 'A', checkedAt: '2026-08-25' }, { id: 'y', name: 'B', checkedAt: '2026-08-25' }];
const b = [{ id: 'x', name: 'A', checkedAt: T }, { id: 'z', name: 'C', checkedAt: T }];
assert.deepEqual(diffServices(a, b), { added: ['z'], changed: [], removed: ['y'] });
assert.deepEqual(diffServices(a, [{ id: 'x', name: 'A2', checkedAt: T }]).changed, ['x']);

console.log('lib.test.mjs: 모든 검사 통과');
