import { BottomNav } from "@/components/navigation/bottom-nav";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 bottom-nav-safe">{children}</main>
      <BottomNav />
    </div>
  );
}
