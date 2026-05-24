import type { Play, Recruit } from "./types";

export interface ContentRepository {
  getRecruits(): Promise<Recruit[]>;
  getRecruitById(id: string): Promise<Recruit | undefined>;

  getPlays(): Promise<Play[]>;
  getPlayById(id: string): Promise<Play | undefined>;
}
