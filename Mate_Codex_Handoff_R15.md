# Mate — 코덱스 핸드오프 (Round 15)

> 이번 라운드: 로컬 Next dev 청크 캐시 오류 재발 방지 + Supabase/Vercel 환경변수 구분 정리.

## 증상

- 로컬 개발 화면에서 서버 오류:
  - `Cannot find module './276.js'`
  - 경로가 `C:\Users\HP\Desktop\coding test\mate\.next\...`
- 이 경로가 보이는 것은 Vercel 서버가 아니라 로컬 Next dev 서버에서 난 오류라는 뜻이다.

## 원인

- Next dev 서버가 이전 `.next` 청크를 계속 참조하는 캐시 꼬임.
- 작업 폴더 경로에 공백이 있고 dev hot update가 여러 번 겹치면서 webpack chunk cache mismatch가 재발했다.

## 코드 변경

- `next.config.mjs`
  - 개발 모드에서 webpack cache를 비활성화했다.
- `package.json`
  - `npm run dev:clean` 추가.
- `scripts/clean-next-cache.mjs`
  - `.next` generated cache만 삭제하는 안전 스크립트 추가.
- `.env.example`
  - `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SITE_URL`의 의미를 명확히 주석으로 분리했다.

## 환경변수 정리

정확한 값:

- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase Project URL
  - 예: `https://xxxxxxxxxxxx.supabase.co`
  - Vercel 앱 URL이나 `/auth/callback` 주소가 아니다.
- `NEXT_PUBLIC_SITE_URL`
  - 앱 URL
  - 로컬: `http://localhost:3000`
  - 운영: `https://mate-161company.vercel.app`
- Supabase Redirect URL
  - Supabase Dashboard에 등록하는 값
  - `https://mate-161company.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

## 시연/복구 방법

로컬에서 캐시 오류가 나면:

1. 기존 dev 서버 종료
2. 아래 명령 실행

```bash
npm run dev:clean
```

3. `http://localhost:3000/login` 접속

## 다음 확인

- Vercel Environment Variables에서 `NEXT_PUBLIC_SUPABASE_URL`이 Supabase URL인지 확인한다.
- `NEXT_PUBLIC_SITE_URL`에만 Vercel 앱 URL을 넣는다.
