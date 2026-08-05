import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isCorrectPassword, sessionToken } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Only redirect to same-site admin paths — never to a supplied URL. */
function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/admin(?:\/|$)/.test(next)
    ? next
    : "/admin/review";
}

async function loginAction(formData: FormData) {
  "use server";
  const attempt = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  if (!(await isCorrectPassword(attempt))) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, await sessionToken(attempt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  redirect(next);
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const configured = Boolean(process.env.ADMIN_PASSWORD);

  return (
    <section className="mx-auto w-full max-w-sm px-4 py-16 sm:px-6">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
        Admin
      </span>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Sign in</h1>

      {!configured ? (
        <p className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm text-zinc-300">
          <code className="text-white">ADMIN_PASSWORD</code> is not set, so the
          admin area is locked. Add it to <code>.env</code> (see{" "}
          <code>.env.example</code>) and restart.
        </p>
      ) : (
        <form action={loginAction} className="mt-8 flex flex-col gap-4">
          <input type="hidden" name="next" value={safeNext(params.next)} />
          <label className="flex flex-col gap-2 text-sm text-zinc-300">
            Password
            <input
              type="password"
              name="password"
              required
              autoFocus
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-white outline-none focus:border-brand-red"
            />
          </label>
          {params.error && (
            <p className="text-sm text-brand-red">Wrong password, try again.</p>
          )}
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md border border-brand-red bg-brand-red/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red/20"
          >
            Sign in
          </button>
        </form>
      )}
    </section>
  );
}
