import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasSession } from "@/lib/admin/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in: send them on rather than rendering a login form
  // wrapped in the admin shell, where the first submit button on the page
  // is Sign out.
  if (await hasSession()) {
    redirect(next?.startsWith("/admin") ? next : "/admin");
  }

  return (
    <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-24">
      <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
      <p className="mt-2 text-sm text-muted">
        Enter the admin password to continue.
      </p>
      <LoginForm next={next ?? "/admin"} />
    </section>
  );
}
