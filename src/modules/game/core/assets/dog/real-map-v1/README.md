# 맵 이동용 방향별 강아지 에셋 (real-v1 확장)

2026.09.28 백엔드팀 전달(`shelter-dog-map-v1.zip`, 검수용). `real-v1`(오른쪽 3/4뷰 8종)에
DOWN(앞모습)/UP(뒷모습) 걷기·서있기를 더한 것 — LEFT는 RIGHT를 좌우 반전해서 씀, 실제
사이드 8종 PNG는 그대로.

| 방향 | 서 있기 | 걷기 |
| --- | --- | --- |
| DOWN | 1프레임 | 16프레임 × 90ms |
| UP | 1프레임 | 16프레임 × 90ms |
| RIGHT | 기존 `real-v1` 16프레임 | 기존 `real-v1` 48프레임 × 30ms |
| LEFT | RIGHT를 `flipX` | RIGHT를 `flipX` |

모두 투명 PNG, 64×64, 발 기준점 `(32, 60)` — `real-v1`과 동일. WALK 한 주기는 방향 상관없이
1,440ms. DOWN/UP IDLE은 정지 자세(1프레임)만 있음 — SIT/SNIFF 등 다른 행동의 방향별 그림은
아직 없어서, 방향 에셋 없는 행동은 기존 `real-v1`의 단일 방향(RIGHT) 그림으로 표시하고
LEFT일 때만 반전한다 (`spritePlayback.ts`의 `selectDirectionalClip` 참고).

원본 배포(`shelter-dog-map-v1.zip`)엔 검수용 강아지 1마리로 이걸 확인하는 자체 재생기·
검수 화면·네트워크 조회 코드(`frontend-F12.patch`)가 같이 왔는데, 그건 이미 이 레포에
merge된 [F-12] 매니페스트 재생 엔진([[spritePlayback.ts]], [[DogSprite.tsx]])과 똑같은
역할을 다시 만든 것이라 코드는 가져오지 않고 여기 그림 파일 4장 + `mapDirections` 매니페스트
데이터만 기존 엔진에 얹었다. 원본 `README.md`/`manifest.json`/`checksums.sha256`/
`generation-prompts.txt`는 참고용으로 보호소 커넥트 Obsidian 쪽에도 남겨둠.

체크섬은 원본 배포분의 `checksums.sha256`로 확인 완료.
