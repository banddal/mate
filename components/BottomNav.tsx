import Link from "next/link";

type BottomNavProps = {
  active: "feed" | "me" | "alerts" | "admin";
  showAdmin?: boolean;
};

const items = [
  { id: "feed", href: "/feed", label: "피드" },
  { id: "me", href: "/me", label: "내 활동" },
  { id: "alerts", href: "/alerts", label: "알림" },
  { id: "admin", href: "/admin", label: "관리자" }
] as const;

export function BottomNav({ active, showAdmin = false }: BottomNavProps) {
  const visibleItems = showAdmin ? items : items.filter((item) => item.id !== "admin");

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 px-5 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div
        className={`mx-auto grid max-w-md text-center text-xs font-semibold text-ink/55 ${
          showAdmin ? "grid-cols-4" : "grid-cols-3"
        }`}
      >
        {visibleItems.map((item) => (
          <Link
            key={item.id}
            className={`rounded-md px-2 py-2 ${active === item.id ? "text-moss" : ""}`}
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
