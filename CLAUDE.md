# 지원금 모아

정부·지자체 지원금 정보를 정리해 공개하는 정적 사이트. Astro + 공공데이터포털 API.
수익 모델은 Google AdSense.

## 절대 규칙

1. **원본에 없는 정보를 쓰지 않는다.** 금액·기간·자격을 추정하거나 예시로 지어내지 않는다.
   사람의 돈이 걸린 정보다. 모르면 "공고 확인"이라고 쓴다.
2. **`data/` 는 기계 영역이다.** 매일 덮어쓰인다. 손으로 편집하지 않는다.
   사람과 에이전트가 쓴 글은 전부 `content/` 에 있다.
3. **`reviewed: true` 는 검수를 통과한 뒤에만 올린다.** 이 플래그가 페이지 생성 스위치다.
   writer 는 절대 직접 올리지 않는다.
4. **`public/ads.txt` 는 AdSense 승인 전에 만들지 않는다.** 미리 만들면 검증에 실패한다.
5. **얇은 조합 페이지를 만들지 않는다.** 허브는 항목 5건 이상일 때만 생성된다
   (`MIN_HUB_ITEMS`). 이 값을 낮추자는 제안은 거절한다. doorway page 판정을 부른다.

## "업데이트" 파이프라인

사용자가 `업데이트` 라고 하면 아래 순서로 실행한다.

```
1. npm run sync && npm run normalize      데이터 갱신 (API 키 없으면 건너뜀)
2. scout                                  이번 회차 대상 선정 -> queue.json
3. queue 의 항목마다 병렬로:
     writer          해설 작성 (reviewed: false)
     fact-checker    원본 대조         <- FAIL 이면 writer 재작업
     policy-guard    정책 검사         <- FAIL 이면 writer 재작업
     seo-editor      제목/설명 정리 후 reviewed: true
4. npm run linkcheck && npm run build     죽은 링크 확인 + 빌드
5. 결과 보고: 발행 n건, 반려 m건, 사유
```

- 같은 문서가 **2회 연속 FAIL 이면 사람을 부른다.** 무한 재작업 금지.
- `fact-checker` 와 `policy-guard` 는 거부권을 가진다. 결과를 무시하고 진행하지 않는다.
- 병렬 실행은 5건 단위로 끊는다.

## 자주 쓰는 명령

```bash
npm run dev        로컬 미리보기
npm test           lib.mjs 자체 검사
npm run sync       공공데이터 내려받기 (DATA_GO_KR_KEY 필요)
npm run normalize  정규화 + 이전 대비 diff
npm run linkcheck  출처 링크 생존 확인
npm run build      정적 빌드
```

API 키를 처음 받았다면 먼저 실제 응답 형태를 확인한다.

```bash
DATA_GO_KR_KEY=... node scripts/sync.mjs --probe
```

출력된 필드명을 `scripts/lib.mjs` 의 `FIELD` 에 반영하면 나머지는 건드릴 필요 없다.
