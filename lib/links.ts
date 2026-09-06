export const PATREON_URL = "https://www.patreon.com/c/CoachHayesHudl";
export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@CoachHayesHudl";
export const YOUTUBE_CHANNEL_ID = "UCsdXFbhSfRlIl1rd9735HWw";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/players", label: "Players" },
  { href: "/film", label: "Film" },
  { href: "/big-board", label: "Big Board" },
  { href: "/playbook", label: "Playbook" },
  { href: "/about", label: "About" },
] as const;

export type SocialKey =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "x"
  | "facebook"
  | "patreon"
  | "spotify"
  | "apple";

export const SOCIAL_LINKS: Array<{ key: SocialKey; label: string; href: string }> = [
  { key: "youtube", label: "YouTube", href: "https://www.youtube.com/@CoachHayesHudl" },
  { key: "instagram", label: "Instagram", href: "https://www.instagram.com/coachhayeshudl/" },
  { key: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@coachhayeshudl" },
  { key: "x", label: "X (Twitter)", href: "https://www.x.com/CoachHayesHudl" },
  { key: "facebook", label: "Facebook", href: "https://www.facebook.com/profile.php?id=61576154827747" },
  { key: "patreon", label: "Patreon", href: PATREON_URL },
  { key: "spotify", label: "Spotify Podcast", href: "https://open.spotify.com/show/3slnEdUyQJ9LwRDIWTBG5I" },
  { key: "apple", label: "Apple Podcasts", href: "https://podcasts.apple.com/us/podcast/coach-hayes-hudl/id1808311679" },
];
