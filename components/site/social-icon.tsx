import type { SocialKey } from "@/lib/links";

type Props = { name: SocialKey; className?: string };

export function SocialIcon({ name, className = "h-5 w-5" }: Props) {
  switch (name) {
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
          <path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.4A3 3 0 0 0 .5 6.5 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.5 3 3 0 0 0 2.1 2.1C4.5 20 12 20 12 20s7.5 0 9.4-.4a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-5.5 31 31 0 0 0-.5-5.5ZM9.6 15.5v-7l6.3 3.5-6.3 3.5Z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className={className}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
          <path d="M16.5 2h-3v13.2a2.8 2.8 0 1 1-2.8-2.8c.3 0 .5 0 .8.1V9.4a6 6 0 1 0 5 5.9V8.6a7.3 7.3 0 0 0 4.5 1.5V7a4.4 4.4 0 0 1-4.5-5Z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
          <path d="M17.5 3h3.3l-7.2 8.2L22 21h-6.7l-5.2-6.8L4 21H.7l7.7-8.8L0 3h6.8l4.7 6.2L17.5 3Zm-1.2 16h1.8L7.8 4.9H5.9l10.4 14.1Z" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
          <path d="M22 12a10 10 0 1 0-11.6 9.9V15h-2.5v-3h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12H16l-.4 3h-2.2v6.9A10 10 0 0 0 22 12Z" />
        </svg>
      );
    case "patreon":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
          <circle cx="15" cy="9.5" r="5.5" />
          <rect x="3" y="4" width="3.5" height="16" />
        </svg>
      );
    case "spotify":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.7 14.4a.7.7 0 0 1-1 .2c-2.6-1.6-5.9-2-9.8-1.1a.7.7 0 1 1-.3-1.4c4.2-1 7.9-.5 10.8 1.3.4.2.5.6.3 1Zm1.2-2.7a.9.9 0 0 1-1.2.3c-3-1.8-7.5-2.3-11-1.3a.9.9 0 1 1-.5-1.7c4-1.2 9-.6 12.4 1.5.4.3.5.8.3 1.2Zm.1-2.8c-3.5-2.1-9.4-2.3-12.8-1.3a1 1 0 1 1-.6-2c4-1.2 10.4-1 14.4 1.4a1.1 1.1 0 0 1-1 1.9Z" />
        </svg>
      );
    case "apple":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
          <path d="M12 1.7A9.3 9.3 0 0 0 6.7 18.6a.5.5 0 0 0 .8-.5l-.4-1.5a7.7 7.7 0 1 1 9.8 0l-.4 1.5a.5.5 0 0 0 .8.5A9.3 9.3 0 0 0 12 1.7Zm0 4.8a4.5 4.5 0 0 0-2.7 8.1.5.5 0 0 0 .8-.5l-.3-1a3 3 0 1 1 4.4 0l-.3 1a.5.5 0 0 0 .8.5A4.5 4.5 0 0 0 12 6.5Zm0 4.5a1.8 1.8 0 0 0-1.8 2.1l1 7.4a.8.8 0 0 0 1.6 0l1-7.4A1.8 1.8 0 0 0 12 11Z" />
        </svg>
      );
    case "twitch":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
          <path d="M4 2 2 6v14h5v3h3l3-3h4l6-6V2H4Zm17 11-3 3h-5l-3 3v-3H6V4h15v9ZM11 7h2v6h-2V7Zm6 0h2v6h-2V7Z" />
        </svg>
      );
  }
}
