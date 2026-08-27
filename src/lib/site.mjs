// 배포 후 커스텀 도메인이 생기면 url 한 줄만 교체한다.
export const SITE = {
  url: 'https://jiwongeum-13u.pages.dev',
  name: '지원금 모아',
  tagline: '정부·지자체 지원금을 한 곳에서',
  description:
    '중앙부처와 지자체가 운영하는 지원금·보조금 제도를 대상별·지역별로 정리했습니다. 자격 조건과 신청 방법을 공식 공고 기준으로 안내합니다.',
  operator: '지원금 모아 편집팀',
  contactEmail: 'dbsdudgh13@gmail.com',
  // AdSense 승인 후에만 채운다. 값이 있어야 광고 스크립트가 붙는다.
  adsenseClient: '',
  // Search Console 소유권 확인용. 확인이 끝난 뒤에도 지우면 소유권이 풀린다.
  googleSiteVerification: 'ULJ_U1WOToQmNEe1VG5eYBXgSItYeC_KNoztW2EKBKg',
};

// 대상 허브. slug 는 URL 이 되므로 바꾸면 링크가 깨진다.
export const TARGETS = [
  { slug: 'youth', name: '청년', keywords: ['청년', '대학생', '취업준비생'] },
  { slug: 'senior', name: '노인', keywords: ['노인', '어르신', '고령'] },
  { slug: 'small-business', name: '소상공인', keywords: ['소상공인', '자영업'] },
  { slug: 'single-parent', name: '한부모', keywords: ['한부모', '조손'] },
  { slug: 'disabled', name: '장애인', keywords: ['장애인'] },
  { slug: 'farmer', name: '농어업인', keywords: ['농업인', '어업인', '귀농'] },
  { slug: 'jobseeker', name: '구직자', keywords: ['구직', '실업', '취업'] },
  { slug: 'parenting', name: '임신·육아', keywords: ['임신', '출산', '육아', '보육', '아동'] },
];

// 실제 데이터의 소관기관명에 나타나는 광역단체 정식 명칭. 2026-08 기준.
// 전남과 광주는 '전남광주통합특별시' 로 통합되어 있다. 행정구역이 또 바뀌면 여기만 고친다.
export const SIDO = [
  { slug: 'seoul', name: '서울특별시' },
  { slug: 'busan', name: '부산광역시' },
  { slug: 'daegu', name: '대구광역시' },
  { slug: 'incheon', name: '인천광역시' },
  { slug: 'daejeon', name: '대전광역시' },
  { slug: 'ulsan', name: '울산광역시' },
  { slug: 'sejong', name: '세종특별자치시' },
  { slug: 'gyeonggi', name: '경기도' },
  { slug: 'gangwon', name: '강원특별자치도' },
  { slug: 'chungbuk', name: '충청북도' },
  { slug: 'chungnam', name: '충청남도' },
  { slug: 'jeonbuk', name: '전북특별자치도' },
  { slug: 'jeonnam-gwangju', name: '전남광주통합특별시' },
  { slug: 'gyeongbuk', name: '경상북도' },
  { slug: 'gyeongnam', name: '경상남도' },
  { slug: 'jeju', name: '제주특별자치도' },
];

// 중앙행정기관과 공공기관이 운영하는 전국 단위 제도.
export const NATIONAL = { slug: 'national', name: '전국(중앙부처·공공기관)' };


// 시군구 허브는 이 건수 미만이면 만들지 않는다. doorway page 방지.
export const MIN_HUB_ITEMS = 5;
