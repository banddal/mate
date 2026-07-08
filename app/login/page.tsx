import { LoginForm } from "./LoginForm";
import { isDevAuthBypassEnabled } from "@/lib/dev-auth";

type LoginPageProps = {
  searchParams: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <LoginForm
      canUseDevAuth={isDevAuthBypassEnabled()}
      initialError={searchParams.error}
    />
  );
}
