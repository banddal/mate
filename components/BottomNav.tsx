import Link from "next/link";
import { Bell, Home, UserRound } from "lucide-react";

type BottomNavProps = {
  active: "feed" | "me" | "alerts";
};

const items = [
  { id: "feed", href: "/feed", label: "feed", icon: Home },
  { id: "me", href: "/me", label: "my page", icon: UserRound },
  { id: "alerts", href: "/alerts", label: "alarm", icon: Bell }
] as const;

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-white/85 px-5 pb-[calc(6px+env(safe-area-inset-bottom))] pt-1 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-3 text-center text-xs font-semibold text-ink/55">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;

          return (
            <Link
              key={item.id}
              className={`mx-1 flex min-h-10 items-center justify-center rounded-lg px-2 py-1 transition ${
                isActive ? "text-moss" : "text-[#6f6278] hover:text-[#493f52]"
              }`}
              href={item.href}
              aria-label={item.label}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
