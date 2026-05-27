import { z } from "zod";

export const POSITIONS = [
  "QB",
  "RB",
  "WR",
  "TE",
  "OL",
  "DL",
  "LB",
  "DB",
  "ATH",
  "K",
  "P",
] as const;

export const STATUSES = ["Uncommitted", "Committed"] as const;

export const PositionSchema = z.enum(POSITIONS);
export type Position = z.infer<typeof PositionSchema>;

export const StatusSchema = z.enum(STATUSES);
export type Status = z.infer<typeof StatusSchema>;

const VideoIdRegex = /^[A-Za-z0-9_-]{11}$/;

export const RecruitSchema = z
  .object({
    position: PositionSchema,
    name: z.string().min(1),
    classYear: z.number().int().min(2024).max(2035),
    stars: z.number().int().min(0).max(5).nullable(),
    height: z.string().min(1).nullable(),
    weight: z.number().int().min(100).max(450).nullable(),
    highSchool: z.string().min(1).nullable(),
    status: StatusSchema,
    committedTeam: z.string().min(1).nullable(),
    videoId: z.string().regex(VideoIdRegex).nullable(),
  })
  .strict()
  // Committed implies a team; Uncommitted implies no team. The sheet UI
  // doesn't enforce this, so we cross-check on read.
  .refine(
    (r) => (r.status === "Committed" ? r.committedTeam != null : true),
    { path: ["committedTeam"], message: "Committed status requires a team" },
  );
export type Recruit = z.infer<typeof RecruitSchema>;
