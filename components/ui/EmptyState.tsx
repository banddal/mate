import Link from "next/link";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  body: string;
  /** 링크형 액션. 버튼 등 커스텀 액션은 children으로 전달한다. */
  href?: string;
  action?: string;
  children?: ReactNode;
  /** feed처럼 중앙 정렬 대형으로 쓸 때 "center" */
  align?: "left" | "center";
};

export function EmptyState({ icon, title, body, href, action, children, align = "left" }: EmptyStateProps) {
  const centered = align === "center";

  return (
    <section
      className={`rounded-lg border border-line bg-white shadow-soft ${centered ? "p-6 text-center" : "p-4"}`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-paper text-moss ${
          centered ? "mx-auto h-12 w-12" : "mb-3"
        }`}
      >
        {icon}
      </div>
      <p className={centered ? "mt-4 text-xl font-bold tracking-normal text-ink" : "text-sm font-semibold text-ink"}>
        {title}
      </p>
      <p className={`mt-1 text-sm leading-6 text-ink/60 ${centered ? "mt-2 leading-7 text-ink/68" : ""}`}>{body}</p>
      {href && action ? (
        <Link
          href={href}
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md mate-cta px-3 text-sm font-semibold text-white"
        >
          {action}
        </Link>
      ) : null}
      {children}
    </section>
  );
}
