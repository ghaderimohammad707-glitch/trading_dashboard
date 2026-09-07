/**
 * Auth Page — simplified (no Convex auth needed)
 * Just stores user in localStorage and redirects to dashboard
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthPage({ redirectAfterAuth = "/dashboard" }: { redirectAfterAuth?: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto sign-in as anonymous
    const user = { name: "معامله‌گر", email: "trader@local", isAnonymous: true };
    localStorage.setItem("nabz_user", JSON.stringify(user));
    navigate(redirectAfterAuth, { replace: true });
  }, [navigate, redirectAfterAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">در حال ورود...</div>
    </div>
  );
}
