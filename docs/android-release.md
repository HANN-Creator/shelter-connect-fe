# Android 배포 서명

개발용 debug 빌드는 기존 `debug.keystore`를 사용한다. release APK/AAB는 별도의 개인 업로드 키가 없으면 빌드를 중단한다. 파일명을 바꾼 debug 키도 인증서 정보를 검사해 거절한다.

다음 항목을 저장소 밖 `~/.gradle/gradle.properties` 또는 CI의 비밀 환경변수에 설정한다. 비밀번호를 명령줄 인자나 프로젝트의 `gradle.properties`에 넣지 않는다.

```properties
SHELTER_UPLOAD_STORE_FILE=/absolute/private/path/upload.jks
SHELTER_UPLOAD_STORE_PASSWORD=...
SHELTER_UPLOAD_KEY_ALIAS=...
SHELTER_UPLOAD_KEY_PASSWORD=...
```

`cd android && ./gradlew :app:bundleRelease`로 빌드한다. 배포 담당자가 업로드 키를 보관·백업하고 Google Play App Signing과 연결해야 한다. 이 변경은 키 생성이나 스토어 배포를 하지 않는다.

수정 확인: 설정 누락, 잘못된 비밀번호, debug 인증서는 실패하고, 별도의 임시 개인 키는 검증을 통과해야 한다. `preReleaseBuild`와 `validateSigningRelease` 모두 검증 작업에 의존하므로 release 빌드에 공개 debug 키가 자동으로 들어가지 않는다.

[Android 공식 서명 안내](https://developer.android.com/studio/publish/app-signing)
