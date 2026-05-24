import { SOCIAL_LINKS } from "@/lib/links";
import { SocialIcon } from "./social-icon";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-black">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
        <p className="text-sm text-muted">
          © {year} Coach Hayes Hudl. All rights reserved.
        </p>

        <ul className="flex flex-wrap items-center justify-center gap-2">
          {SOCIAL_LINKS.map((s) => (
            <li key={s.key}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-zinc-300 transition-colors hover:border-brand-red hover:text-white"
              >
                <SocialIcon name={s.key} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
