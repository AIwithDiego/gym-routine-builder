import { LogOut } from "lucide-react";

// Plain form POST: works without JavaScript and clears the session cookie
// on the server before redirecting to /login.
export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        aria-label="Sign out"
        title="Sign out"
        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-bg-card transition-colors tap-highlight-none"
      >
        <LogOut className="w-5 h-5 text-text-secondary" />
      </button>
    </form>
  );
}
