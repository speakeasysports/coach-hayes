This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Content

Recruits and plays live as one JSON file per entity under `content/`:

```
content/
  recruits/<slug>.json   # one recruit per file — fields in lib/content/types.ts
  plays/<slug>.json      # one play per file — fields in lib/content/types.ts
```

Add a new recruit by dropping a JSON file matching `RecruitSchema` (see `lib/content/types.ts`). Same for plays. Filenames don't have to match `id`, but keeping them aligned makes things easier to find.

Validate everything with:

```bash
npm run validate:content
```

The validator checks every file against the Zod schema and reports problems with file paths and field locations. It exits non-zero on failure, so it's safe to run in CI.

Page code reads content through a single import:

```ts
import { content } from "@/lib/content";

const recruits = await content.getRecruits();
const recruit = await content.getRecruitById("jaxon-dollar");
```

The file-backed store can be swapped for a headless CMS later by replacing the implementation in `lib/content/index.ts` — page code stays put.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
