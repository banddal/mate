import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return <LoginForm canUseKakao={Boolean(process.env.KAKAO_CLIENT_ID)} />;
}
