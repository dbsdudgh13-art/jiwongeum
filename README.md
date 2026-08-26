# 지원금 모아

정부·지자체 지원금 정보를 정리해 제공하는 정적 사이트. Astro + 공공데이터포털 API.
백엔드 없음, 운영 비용 0원.

설계 문서: [docs/superpowers/specs/2026-08-26-jiwongeum-design.md](docs/superpowers/specs/2026-08-26-jiwongeum-design.md)

## 시작하기

```bash
npm install
npm run seed    # 개발용 샘플 데이터. 실제 API 키가 없어도 화면을 볼 수 있다
npm run dev
```

## 실제 데이터 연결

### 1. API 키 발급

[공공데이터포털](https://www.data.go.kr/data/15113968/openapi.do)에서
「행정안전부_대한민국 공공서비스(혜택) 정보」 활용신청. 무료, 자동 승인.

### 2. 응답 형태 확인 (최초 1회)

```bash
DATA_GO_KR_KEY=발급받은키 node scripts/sync.mjs --probe
```

출력된 필드명을 `scripts/lib.mjs` 의 `FIELD` 에 반영한다. 요청 URL이 기본값과 다르면
`DATA_GO_KR_ENDPOINT` 로 덮어쓴다.

### 3. 동기화

```bash
DATA_GO_KR_KEY=발급받은키 npm run sync
npm run normalize
```

## 배포

1. GitHub **public** 저장소로 push (public이어야 Actions 시간이 무제한)
2. Cloudflare Pages에서 저장소 연결
   - 빌드 명령 `npm run build`
   - 출력 디렉터리 `dist`
   - Cloudflare가 push마다 자동 빌드하므로 배포용 워크플로는 두지 않았다
3. 저장소 Settings → Secrets → `DATA_GO_KR_KEY` 등록 (매일 자동 동기화용)
4. 도메인이 정해지면 `src/lib/site.mjs` 의 `SITE.url` 과 `public/robots.txt` 를 교체

## 문서 발행 흐름

Claude Code에서 `업데이트` 라고 하면 아래가 순서대로 돈다.

```
sync + normalize → scout → writer → fact-checker → policy-guard → seo-editor → build
```

`fact-checker` 와 `policy-guard` 는 거부권을 가진다. 둘 다 통과해야
`content/services/<id>.md` 의 `reviewed` 가 `true` 로 올라가고, 그때 비로소 페이지가
생성된다. 자세한 절차는 [CLAUDE.md](CLAUDE.md).

## AdSense

승인 신청은 배포하고 색인이 30페이지 이상 쌓인 뒤에 한다. 승인 전 준비물과 순서는
설계 문서의 「AdSense 대응」 절에 정리했다.

승인되면:

1. `src/lib/site.mjs` 의 `SITE.adsenseClient` 에 `ca-pub-XXXXXXXX` 입력
2. `public/ads.txt` 를 만들고 AdSense가 알려주는 한 줄을 그대로 넣는다

`ads.txt` 를 승인 전에 만들면 검증에 실패한다. 반드시 승인 후에 추가할 것.

## 구조

```
data/raw/          API 스냅샷 — 기계가 매일 덮어쓴다. 손대지 않는다
data/normalized/   정규화 데이터 + diff + 죽은 링크 목록
content/services/  서비스별 해설 문서 (에이전트가 작성)
content/guides/    가이드 글 (사람이 작성)
src/lib/           site.mjs(설정), data.mjs(빌드 시 데이터 조회)
src/pages/         라우트
scripts/           동기화·정규화·링크검사·테스트
.claude/agents/    분야별 에이전트 5종
```

## 명령

```bash
npm run dev        로컬 미리보기
npm test           lib.mjs 자체 검사
npm run seed       개발용 샘플 데이터 생성
npm run sync       공공데이터 내려받기
npm run normalize  정규화 + diff
npm run linkcheck  출처 링크 생존 확인
npm run build      정적 빌드
```
