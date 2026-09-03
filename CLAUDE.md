# 지원금 모아

정부·지자체 지원금 정보를 정리해 공개하는 정적 사이트. Astro + 공공데이터포털 API.
수익 모델은 Google AdSense.

> **세션을 새로 시작했다면 [docs/HANDOVER.md](docs/HANDOVER.md) 를 먼저 읽어라.**
> 현재 진행 상황, 다음에 할 일, 지금까지 반복된 실패 유형이 정리돼 있다.

## 절대 규칙

1. **원본에 없는 정보를 쓰지 않는다.** 금액·기간·자격을 추정하거나 예시로 지어내지 않는다.
   사람의 돈이 걸린 정보다. 모르면 "공고 확인"이라고 쓴다.
2. **`data/` 는 기계 영역이다.** 매일 덮어쓰인다. 손으로 편집하지 않는다.
   사람과 에이전트가 쓴 글은 전부 `content/` 에 있다.
3. **`reviewed: true` 는 검수를 통과한 뒤에만 올린다.** 이 플래그가 페이지 생성 스위치다.
   writer 는 절대 직접 올리지 않는다.
4. **`public/ads.txt` 는 AdSense 승인 전에 만들지 않는다.** 미리 만들면 검증에 실패한다.
5. **인증키는 `.env` 에만 있다.** 어떤 에이전트도 `.env` 를 읽지 않는다. 키 값을
   출력·인용·요약하지 않고, 사용자에게 채팅으로 붙여넣게 하지 않는다(편집기로 직접
   넣게 안내한다). 키가 필요한 것은 `scripts/sync.mjs` 하나뿐이고, `process.env` 로만
   읽는다. 커밋 훅이 유출을 막지만 훅은 마지막 방어선이지 첫 번째가 아니다.
6. **얇은 조합 페이지를 만들지 않는다.** 허브는 항목 5건 이상일 때만 생성된다
   (`MIN_HUB_ITEMS`). 이 값을 낮추자는 제안은 거절한다. doorway page 판정을 부른다.

## 매일 동기화는 자동이다

GitHub Actions 가 매일 04:00 KST 에 데이터를 받아온다. 사람이 개입하는 경우는 하나뿐이다.

```
발행된 문서와 무관한 변경  ->  main 에 자동 커밋. 사이트 자동 재배포
발행된 문서가 바뀐 경우    ->  PR 생성 (label: needs-review). 해설 재작성 필요
```

`needs-review` PR 이 열렸다면 머지하기 전에 `업데이트` 를 실행해 해당 문서를 다시 써야
한다. 요약 박스는 새 값으로 바뀌는데 해설 본문이 옛 내용을 설명하면 페이지 안에서
모순이 생긴다. 어느 문서인지는 `data/normalized/diff.json` 의 `affectsPublished` 에 있다.

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
                                          (linkcheck 는 국내에서만 유효하다.
                                           gov.kr 이 해외 IP 를 막는다)
5. 결과 보고: 발행 n건, 반려 m건, 사유
```

- 같은 문서가 **2회 연속 FAIL 이면 사람을 부른다.** 무한 재작업 금지.
- `fact-checker` 와 `policy-guard` 는 거부권을 가진다. 결과를 무시하고 진행하지 않는다.
- 병렬 실행은 5건 단위로 끊는다.

## 자주 쓰는 명령

```bash
npm run setup      최초 1회. 커밋 훅 활성화 + .env 생성
npm run dev        로컬 미리보기
npm test           lib.mjs 자체 검사
npm run sync       공공데이터 내려받기 (DATA_GO_KR_KEY 필요)
npm run normalize  정규화 + 이전 대비 diff
npm run linkcheck  출처 링크 생존 확인
npm run build      정적 빌드
```

## 인증키 취급

키는 `.env` 에만 둔다. 저장소에 들어가지 않고(`.gitignore`), 들어가려 하면
`.githooks/pre-commit` 이 커밋을 막는다. GitHub Actions 에서는 Secrets 가 환경변수로
주입되므로 `.env` 없이 그대로 돈다.

```bash
npm run setup      # .env 생성
# 편집기로 .env 를 열어 DATA_GO_KR_KEY 를 채운다. 명령줄에 쓰지 않는다(히스토리에 남는다)
npm run sync
```

응답 형태를 확인하려면:

```bash
node --env-file=.env scripts/sync.mjs --probe
```

출력된 필드명을 `scripts/lib.mjs` 의 `FIELD` 에 반영하면 나머지는 건드릴 필요 없다.
