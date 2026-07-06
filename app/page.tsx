import { redirect } from "next/navigation";

type HomePageProps = {
  searchParams: {
    code?: string;
    error?: string;
    error_description?: string;
  };
};

export default function HomePage({ searchParams }: HomePageProps) {
  if (searchParams.code || searchParams.error) {
    const params = new URLSearchParams();

    if (searchParams.code) {
      params.set("code", searchParams.code);
    }

    if (searchParams.error) {
      params.set("error", searchParams.error);
    }

    if (searchParams.error_description) {
      params.set("error_description", searchParams.error_description);
    }

    redirect(`/auth/callback?${params.toString()}`);
  }

  redirect("/feed");
}
