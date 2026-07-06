import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <LoginForm
      canUseKakao={Boolean(process.env.KAKAO_CLIENT_ID)}
      initialError={searchParams.error}
    />
  );
}
