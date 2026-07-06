# Mate — 코덱스 핸드오프 (Round 12)

> 이번 라운드: `/login`에서 매직링크 버튼이 눌려도 반응이 없어 보이는 문제 대응.

## 증상

- 이메일을 입력하고 `매직링크 받기`를 눌러도 화면 메시지가 바뀌지 않음.
- 가장 유력한 원인은 브라우저에서 Supabase client 생성 시 `NEXT_PUBLIC_SUPABASE_URL` 또는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 없어 예외가 발생하는 것.

## 코드 변경

- `/login`에서 Supabase 공개 환경변수 존재 여부를 먼저 확인한다.
- 공개 환경변수가 없으면 로그인 박스 위에 즉시 경고를 표시한다.
- 매직링크/카카오 로그인 클릭 시 발생하는 예외를 catch해서 화면에 메시지로 보여준다.
- Supabase Auth가 반환하는 error message도 fallback 문구 뒤에 붙여 진단 가능하게 했다.

## 시연 페이지

- `/login`

시연 방법:

1. Vercel 환경변수 없이 `/login` 접근
   - 환경변수 누락 경고가 보여야 한다.
2. Vercel에 아래 환경변수를 넣고 redeploy
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
3. `/login`에서 이메일 입력 후 `매직링크 받기`
   - 성공 시 메일 확인 안내가 보여야 한다.
   - 실패 시 Supabase error message가 화면에 보여야 한다.

## 필요한 Vercel 환경변수

- `NEXT_PUBLIC_SITE_URL=https://mate-161company.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 필요한 Supabase 설정

Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://mate-161company.vercel.app`
- Redirect URLs:
  - `https://mate-161company.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

## 다음 라운드 추천

- 로그인 성공 후 `/onboarding`에서 실제 Supabase 프로필 저장/OTP 요청까지 배포 환경에서 점검
- `/cards/[id]/applicants` 호스트 전용 신청자 목록
