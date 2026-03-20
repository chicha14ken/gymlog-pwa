"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Clock, Trophy, CalendarDays } from "lucide-react";

const items = [
  {
    href: "/",
    label: "記録",
    Icon: Dumbbell,
    isActive: (p: string) => p === "/" || p.startsWith("/workout") || p.startsWith("/exercises"),
  },
  {
    href: "/history",
    label: "履歴",
    Icon: Clock,
    isActive: (p: string) => p.startsWith("/history"),
  },
  {
    href: "/plan",
    label: "プラン",
    Icon: CalendarDays,
    isActive: (p: string) => p.startsWith("/plan"),
  },
  {
    href: "/pr",
    label: "PR",
    Icon: Trophy,
    isActive: (p: string) => p.startsWith("/pr"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-rim bg-ivory/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center">
        {items.map(({ href, label, Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 pb-6 transition-opacity active:opacity-60"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  active ? "bg-terra-light" : ""
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={2}
                  className={`transition-colors ${
                    active ? "stroke-terracotta" : "stroke-pale"
                  }`}
                />
              </span>
              <span
                className={`text-[10px] transition-colors ${
                  active ? "text-terracotta font-bold" : "text-pale font-medium"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
