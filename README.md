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

엔드포인트와 필드명은 확인을 마쳤다.

- `https://api.odcloud.kr/api/gov24/v3/serviceList` (전체 10,957건, 2026-08 기준)
- 응답 필드는 한글이다: `서비스ID`, `서비스명`, `지원내용`, `지원대상`, `선정기준`,
  `신청기한`, `신청방법`, `소관기관명`, `소관기관유형`, `상세조회URL` 등
- 응답 형태를 다시 보고 싶으면 `node scripts/sync.mjs --probe`

### 2. 동기화

```bash
npm run setup
# 편집기로 .env 를 열어 DATA_GO_KR_KEY 를 채운다
npm run sync
npm run normalize
```

인증키는 **Decoding** 키를 쓴다. 코드가 한 번 더 인코딩하므로 Encoding 키를 넣으면
인증에 실패한다.

키는 `.env` 에만 둔다. `.gitignore` 에 있고, 실수로 스테이징하면
`.githooks/pre-commit` 이 커밋을 막는다(64자 hex 문자열도 함께 막는다).
`npm run setup` 이 훅 경로를 설정하므로 저장소를 새로 받으면 한 번 실행해야 한다.
명령줄에 키를 직접 쓰지 마라 — 셸 히스토리에 남는다.

`data/raw/` 는 17MB라 저장소에 넣지 않는다. `npm run sync` 로 언제든 다시 만든다.

## 지역 분류

`소관기관유형` 이 중앙행정기관·공공기관이면 전국, 그 밖에는 기관명에 광역단체 정식
명칭이 있을 때만 그 지역으로 분류한다. 판정이 안 되는 약 7%(대부분 지방공기업)는
지역을 비워 두고 지역 허브에서만 제외한다. 상세 페이지는 정상 생성된다.

축약형 매칭은 일부러 하지 않는다. `경기도 광주시` 가 광주광역시로 새는 사고가 있었다.

행정구역이 바뀌면 `src/lib/site.mjs` 의 `SIDO` 만 고친다. 2026-08 기준 전남과 광주는
`전남광주통합특별시` 로 통합되어 있다.

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
