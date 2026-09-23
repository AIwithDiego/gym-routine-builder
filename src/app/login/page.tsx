import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/safe-next";

export const metadata: Metadata = {
  title: "Sign in · Gym Routine Builder",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <header className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-bg-card border border-border-default flex items-center justify-center">
            <Dumbbell className="w-7 h-7 text-accent-green" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Gym Routine Builder
            </h1>
            <p className="text-text-secondary">Sign in to your routines</p>
          </div>
        </header>
        <LoginForm next={safeNextPath(next)} />
      </div>
    </main>
  );
}
