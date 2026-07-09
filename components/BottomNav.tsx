import Link from "next/link";

type BottomNavProps = {
  active: "feed" | "me" | "alerts";
};

const items = [
  { id: "feed", href: "/feed", label: "feed" },
  { id: "me", href: "/me", label: "my page" },
  { id: "alerts", href: "/alerts", label: "alarm" }
] as const;

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 px-5 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-3 text-center text-xs font-semibold text-ink/55">
        {items.map((item) => (
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
