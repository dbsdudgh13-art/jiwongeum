// 개발용. 실제 API 키 없이 페이지 렌더링을 확인하기 위한 가짜 데이터를 만든다.
// 모든 항목 이름에 [샘플] 을 붙여 실제 제도와 헷갈릴 수 없게 한다.
// npm run sync 를 한 번 돌리면 전부 실제 데이터로 덮인다.
import { writeFile, mkdir } from 'node:fs/promises';

const orgs = ['서울특별시', '부산광역시', '경기도', '보건복지부', '중소벤처기업부', '고용노동부'];
const rows = Array.from({ length: 12 }, (_, i) => ({
  servId: `SAMPLE-${String(i + 1).padStart(3, '0')}`,
  servNm: `[샘플] ${['청년', '소상공인', '한부모', '노인'][i % 4]} 지원 사업 ${i + 1}`,
  servDgst: '개발용 샘플 데이터입니다. 실제 제도가 아닙니다.',
  jurOrgNm: orgs[i % orgs.length],
  servDtlLink: 'https://www.gov.kr/',
  sprtCn: '샘플: 금액 정보 없음',
  slctCritCn: `${['청년', '소상공인', '한부모', '노인'][i % 4]} 대상 샘플 조건`,
  aplyMtdCn: '온라인 신청 (샘플)',
  rqutPrdCn: i % 5 === 0 ? '2026.01.01 ~ 2026.03.31' : '상시신청',
}));

await mkdir('data/raw', { recursive: true });
await writeFile('data/raw/services.json', JSON.stringify(rows, null, 2) + '\n');
console.log(`샘플 ${rows.length}건 생성. 이어서 npm run normalize 실행.`);
