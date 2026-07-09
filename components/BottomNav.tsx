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
    <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 px-5 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-3 text-center text-xs font-semibold text-ink/55">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;

          return (
            <Link
              key={item.id}
              className={`mx-1 flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition ${
                isActive ? "bg-moss/12 text-moss" : "text-ink/58 hover:bg-paper/70 hover:text-ink"
              }`}
              href={item.href}
              aria-label={item.label}
            >
              <Icon className="h-6 w-6" aria-hidden />
              <span className="text-[11px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
