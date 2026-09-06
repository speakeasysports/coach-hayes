import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

/**
 * The public site's chrome. It lives here rather than in the root layout so
 * that /admin does not inherit it — the admin used to render the public
 * header above its own nav, which put two navigation bars on screen with
 * "Players" in both, and a Support on Patreon button inside Coach's own
 * admin.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </>
  );
}
