# CLAUDE.md

이 레포에서 작업할 때 참고할 규칙. 기획/아키텍처 상세는 [docs/](./docs/project-overview.md) 참고.

## 프로젝트
보호소 커넥트 — 도트 강아지와 대화하며 알아가는 입양 서비스, React Native 프론트엔드.
백엔드(Spring Boot)는 [HANN-Creator/shelter-connect](https://github.com/HANN-Creator/shelter-connect)에
실제 구현·배포됨(`https://shelter-connect-dev.onrender.com`, Render 무료 — 15분 미사용 시 슬립, 첫 요청
최대 1분). 이 레포는 REST API만 호출하고 Supabase DB에 직접 연결하지 않는다 — **단, 로그인은 예외로
FE가 Supabase Auth SDK를 직접 씀** ([docs/api-conventions.md](./docs/api-conventions.md),
[docs/auth.md](./docs/auth.md)).

## 명령어
```sh
npm start              # Metro
npm run ios            # iOS 시뮬레이터
npm run android        # Android 에뮬레이터
npm run lint            # eslint
npx tsc --noEmit        # 타입 체크
npm test                # jest
cd ios && pod install   # 네이티브 의존성 변경 후
```

## 아키텍처 규칙 ([docs/project-overview.md](./docs/project-overview.md) 상세)
- `src/modules/*` 도메인의 **내부 구현**끼리 직접 참조 금지 — 단, 화면(`GameScreen.tsx`처럼 core가 아닌
  최상위 컴포넌트)이 다른 도메인의 **공개 API/hooks**를 가져다 쓰는 건 허용(예: `modules/game/GameScreen.tsx`가
  `modules/dog/hooks/useShelterDogs.ts` 사용). 화면은 여러 도메인을 조합하는 지점이라 그럼
- `src/shared`는 어디서나 참조 가능
- `src/modules/game/core`는 RN 전용 API(`Platform.OS`, `Dimensions` 등) 직접 호출 금지, `modules/dog`의
  타입만 참조 가능(함수·hooks는 안 됨) — 웹 이식성 유지. `dogStateMachine.ts`가 `modules/dog/types.ts`의
  `DogBehaviorSettings` 타입만 import하는 게 그 예
- 이미지는 Skia `useImage`로만 로드 (`Image`/`require()` 직접 사용 금지)

## 브랜치 규칙
- `main` — 배포 가능 상태만 유지, 직접 푸시 금지
- 작업 브랜치: `feature/<설명>`, `fix/<설명>`, `chore/<설명>` (예: `feature/shelter-list-screen`)
- 브랜치 하나당 하나의 논리적 변경 단위

## 작업 ID
백엔드 레포(HANN-Creator/shelter-connect)가 PR·커밋에 `[B-14]`, `[Q-02]`처럼 작업 ID를 붙이는 방식을
따른다. 이 레포는 `F-XX`(Frontend) 접두사를 쓴다. 새 기능/작업 단위를 시작할 때
[docs/task-log.md](./docs/task-log.md)에 다음 번호로 한 줄 추가하고, 그 번호를 커밋 제목과 PR 제목
양쪽에 붙인다. 버그 수정처럼 독립 작업이 아닌 후속 커밋(같은 PR 안에서 리뷰 반영 등)은 새 ID 없이
같은 PR의 제목 ID를 따라간다.

## 커밋 규칙
[Conventional Commits](https://www.conventionalcommits.org/) 형식 앞에 작업 ID를 붙인다: `[F-XX] feat: ...`
```
[F-02] feat: 보호소 목록 화면 추가
[F-05] fix: 강아지 상태머신 전환 확률 버그 수정
```

## PR 규칙
- `main`으로 머지하는 모든 변경은 PR을 통해서만 (직접 push 금지)
- PR 제목은 커밋 컨벤션과 동일한 형식(`[F-XX] ...`)
- 머지 전 필수: `npx tsc --noEmit`, `npm run lint` 통과
- PR 본문에 변경 이유와 테스트 방법 간단히 기재
- game 모듈(`src/modules/game/core`) 변경 시 RN 전용 API 미사용 여부 리뷰에서 확인
- 리뷰 없이 self-merge 지양 — 1인 개발이라도 CI(lint/typecheck) 통과는 머지 조건

## 알려진 함정
- **같은 style 객체 참조를 서로 다른 컴포넌트에 재사용하지 말 것** — 예: `const s = {flex:1}; <GestureHandlerRootView style={s}><View style={s}>`.
  이 환경(RN 0.87 + Fabric + react-native-screens native-stack)에서 부모/자식이 동일 style
  객체 참조를 공유하면 `<Text>`가 화면에 전혀 그려지지 않는(배경은 정상, 글자만 안 보이는)
  버그가 재현됨. `StyleSheet.create`든 인라인 객체든 상관없이, 컴포넌트마다 별개의 객체를 쓸 것.
- **`__tests__/App.test.tsx` (RN 기본 스모크 테스트)는 현재 실패함** — F-14에서 `jest.config.js`의
  `transformIgnorePatterns`에 `react-native-url-polyfill`/`@react-native-async-storage`를 추가하고
  `lucide-react-native`는 `moduleNameMapper`로 CJS 빌드(`dist/cjs/...js`)에 매핑해서 ESM `import`
  파싱 실패(이전에 기록된 원인)는 고쳤다. 그런데 그 너머에서 **진짜 reanimated/worklets mock 버그**가
  나왔다 — `GameScreen.tsx` → `Joystick.tsx`의 `react-native-reanimated` import가 mock으로 치환되는데
  (`moduleNameMapper`의 `react-native-reanimated/mock`), 그 mock 자체가 초기화 중
  `"[Reanimated] setCSSEventHandler is not available in JSReanimated"`로 던진다. 2026.09.25 리뷰에서
  "reanimated mock 버그로 기록했던 건 오진, 실제 원인은 url-polyfill"이라고 정리했던 건 **그 리뷰 시점에
  url-polyfill 에러가 먼저 터져서 이 reanimated 에러까지 도달한 적이 없었기 때문** — 둘 다 실재하는
  별개의 버그다. reanimated mock 쪽은 이번 F-14 범위(홈 화면) 밖이라 안 건드림. `tsc`/`lint`는 정상,
  PR 게이트는 그 둘만 요구하므로 당장 막히진 않음.

## 확인 필요한 미결 사항
[docs/project-overview.md](./docs/project-overview.md) 하단 "확인 필요" 섹션 참고 — 스프라이트 규격,
타일 단위 환산, `SUPABASE_ANON_KEY` 등 백엔드/그래픽 담당자 확인 대기 중.
