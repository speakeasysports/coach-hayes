# Coach Hayes Hudl — brand & asset inventory

Pulled 2026-05-23 from the live site, Linktree, and YouTube RSS. Phase 1 should source from this file rather than re-fetching.

## Identity

- **Name:** Coach Hayes Hudl (the person is Chris Hayes)
- **Location:** Calhoun, Georgia
- **Background:** 20-year high school football coach
- **Channel motto (from video descriptions):** "Connecting Fans To the Fundamentals of Football"
- **Spec tagline (preferred):** "X's & O's from a coach's perspective. Emphasis on UGA."
- **Existing about copy:** "Coach Hayes Hudl is a website designed to enhance the understanding of football for enthusiasts, providing comprehensive football analysis, in-depth player breakdowns, and evaluations of recruits."
- **Existing SEO title:** "Football Coaching Analysis: Insights & Player Breakdowns"

## Brand tokens

- Primary red: `#fc0a0e`
- Background: black
- Foreground: white
- Logo: `assets/logo-raw.png` (1536×1024 PNG — stylized mascot portrait, red/black palette, "COACH HAYES" wordmark + "CH" cap mark). Note: logo art includes its own dark backdrop panels; may want a transparent-bg variant from Coach.

## Socials (verified destinations)

| platform | URL |
|---|---|
| YouTube | https://www.youtube.com/@CoachHayesHudl |
| YouTube (channel ID) | `UCsdXFbhSfRlIl1rd9735HWw` |
| YouTube RSS | https://www.youtube.com/feeds/videos.xml?channel_id=UCsdXFbhSfRlIl1rd9735HWw |
| Instagram | https://www.instagram.com/coachhayeshudl/ |
| TikTok | https://www.tiktok.com/@coachhayeshudl |
| X / Twitter | https://www.x.com/CoachHayesHudl |
| Facebook (Linktree, newer) | https://www.facebook.com/profile.php?id=61576154827747 |
| Facebook (homepage, older) | https://www.facebook.com/760159423840625 |
| Patreon | https://www.patreon.com/c/CoachHayesHudl |
| Spotify (podcast) | https://open.spotify.com/show/3slnEdUyQJ9LwRDIWTBG5I |
| Apple Podcasts | https://podcasts.apple.com/us/podcast/coach-hayes-hudl/id1808311679 |
| Twitch | https://www.twitch.tv/coachhayeshudl |
| Linktree | https://linktr.ee/CoachHayesHudl |

## Latest videos (snapshot 2026-05-23, for home-page seed)

1. `7QizPrSj1wY` — Stars Don't Matter (2026-05-20)
2. `gVwNsBkj9iM` — Losing The College Football Fan (2026-05-20)
3. `BSBo5pxImow` — College Football Is Losing The Fan (2026-05-19)
4. `-S6tU6DymPE` — UGA 2027 TE Commit :: Jaxon Dollar (2026-05-05)
5. `rRpvZLUx2MU` — UGA 2026 RB Recruit :: Nick Peal (2026-05-05)
6. `sPBEaksBhQc` — UGA Players Who Set The Tone This Spring (2026-05-01)

Home page should pull these from the RSS feed at build time (not hardcode).

## Phase-1 decisions (locked 2026-05-23)

- **Hero tagline:** "Connecting Fans To the Fundamentals of Football" (channel motto).
- **Footer surfaces:** all live channels — YouTube, IG, TikTok, X, Facebook, Patreon, Spotify, Apple Podcasts, Twitch.
- **Facebook URL to use:** the Linktree one (`profile.php?id=61576154827747`).
- **Newsletter:** placeholder UI only; real embed deferred to Phase 5.

## Still open (ask Coach later)

- A transparent-background logo file if he has one (current art has its own dark panels baked in).
- Confirm older FB page (`/760159423840625`) can be retired.
- Newsletter provider choice for Phase 5 (ConvertKit vs Beehiiv).
