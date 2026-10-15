# 비 내리고 땅 굳는다

임하리의 이미지, 상세 정보와 세계관을 소개하는 정적 웹사이트입니다.

## Vercel에서 배포

1. 이 GitHub 저장소를 Vercel에 Import합니다.
2. Framework Preset은 Other, Root Directory는 저장소 루트를 사용합니다.
3. Build Command는 `node build.mjs`, Output Directory는 `dist`를 사용합니다.
4. Deploy를 누릅니다. vercel.json에 같은 설정이 포함되어 있습니다.

설정 참고: https://vercel.com/docs/project-configuration/vercel-json

## 주요 파일

- index.html: 첫 화면
- hari.html: 하리 상세 정보
- world.html: 세계관
- images.html: 이미지 목록
- app.js, gallery.js, styles.css: 동작 및 스타일
- gallery-data.json: 외부 이미지 104장의 목록
- rainy-classroom.png, hari-smile.webp, favicon.svg: 사이트 이미지
- NanumBrushScript-Regular.ttf, OFL.txt: 나눔 손글씨 붓체 및 라이선스
- gentle-rain.wav, credits.json: 빗소리와 출처·편집 정보

페이지 제목은 한국어 작품명으로 설정되어 있습니다.

## 자산 정보

- 나눔 손글씨 붓체: Google Fonts 배포본. OFL.txt 라이선스 포함.
- 빗소리: kvgarlic의 CC0 녹음을 편집. credits.json에 출처와 편집 정보 포함.
- 작품 이미지와 작품 설정의 권리는 원작자에게 있습니다.

## 최신 배포와 캐시

- 배포마다 `build.mjs`가 페이지·코드·데이터의 버전 주소와 `site-version.json`을 자동 생성합니다.
- HTML·코드·설정 데이터는 저장하지 않으며, 이미지·폰트·오디오는 내용이 변경될 때 주소가 바뀝니다.
- 열린 페이지는 복귀 시와 1분 간격으로 배포 버전을 확인합니다.
- 구버전이 남은 방문자는 `/refresh`로 접속하면 캐시 정리 요청 후 최신 홈으로 이동합니다. 쿠키·저장소는 지우지 않습니다.
- 로컬 확인: `node build.mjs` 실행 후 `dist`를 정적 서버로 엽니다.
