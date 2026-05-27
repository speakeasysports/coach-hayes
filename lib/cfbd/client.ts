import { CfbdRecruitSchema, type CfbdRecruit } from "./types";

const BASE = "https://api.collegefootballdata.com";
const REVALIDATE_SECONDS = 60 * 60;

export function tagForClass(year: number): string {
  return `cfbd-class-${year}`;
}

export async function fetchRecruitingClass(
  year: number,
): Promise<CfbdRecruit[]> {
  const key = process.env.CFBD_API_KEY;
  if (!key) {
    throw new Error(
      "CFBD_API_KEY is not set. Add it to .env (see .env.example).",
    );
  }

  const url = `${BASE}/recruiting/players?year=${year}&classification=HighSchool`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    next: { revalidate: REVALIDATE_SECONDS, tags: [tagForClass(year)] },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `CFBD ${res.status} ${res.statusText}: ${body.slice(0, 200)}`,
    );
  }

  const json = await res.json();
  return CfbdRecruitSchema.array().parse(json);
}
