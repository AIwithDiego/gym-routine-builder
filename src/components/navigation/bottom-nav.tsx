"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Dumbbell, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Today", icon: Home },
  { href: "/routines", label: "Routines", icon: List },
  { href: "/machines", label: "Machines", icon: Dumbbell },
  { href: "/metrics", label: "Metrics", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-bg-card border-t border-border-default pb-safe z-40">
      <div className="flex items-center justify-around h-full max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-20 h-full",
                "tap-highlight-none transition-colors",
                isActive
                  ? "text-accent-green"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
