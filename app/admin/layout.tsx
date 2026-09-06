import type { Metadata } from "next";
import Link from "next/link";
import { hasSession } from "@/lib/admin/session";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The login page lives under /admin but must not render the shell.
  if (!(await hasSession())) return <>{children}</>;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <nav className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border pb-4">
        <Link href="/admin" className="text-sm font-semibold text-white">
          Admin
        </Link>
        <AdminLink href="/admin/queue">Queue</AdminLink>
        <AdminLink href="/admin/players">Players</AdminLink>
        <AdminLink href="/admin/concepts">Concepts</AdminLink>
        <AdminLink href="/admin/content">Content</AdminLink>
        <AdminLink href="/admin/import">Import</AdminLink>
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted transition-colors hover:text-white"
          >
            View site ↗
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-muted transition-colors hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
      {children}
    </div>
  );
}

function AdminLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-zinc-300 transition-colors hover:text-white"
    >
      {children}
    </Link>
  );
}
