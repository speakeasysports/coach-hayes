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

export const RECRUIT_STATUSES = [
  "target",
  "offered",
  "visit",
  "commit",
  "signed",
  "flip-watch",
  "decommit",
  "off-board",
] as const;

export const PositionSchema = z.enum(POSITIONS);
export type Position = z.infer<typeof PositionSchema>;

export const RecruitStatusSchema = z.enum(RECRUIT_STATUSES);
export type RecruitStatus = z.infer<typeof RecruitStatusSchema>;

const SlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be kebab-case (a-z, 0-9, hyphens)");

export const VideoIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{11}$/, "must be an 11-character YouTube video ID");
export type VideoId = z.infer<typeof VideoIdSchema>;

export const RecruitSchema = z
  .object({
    id: SlugSchema,
    name: z.string().min(1),
    position: PositionSchema,
    classYear: z.number().int().min(2024).max(2035),
    status: RecruitStatusSchema,
    videoIds: z.array(VideoIdSchema).default([]),
    notes: z.string().min(1).optional(),
  })
  .strict();
export type Recruit = z.infer<typeof RecruitSchema>;

export const PlaySchema = z
  .object({
    id: SlugSchema,
    name: z.string().min(1),
    formation: z.string().min(1),
    opponent: z.string().min(1).optional(),
    season: z.number().int().min(2000).max(2099).optional(),
    videoIds: z.array(VideoIdSchema).default([]),
    timestamp: z.number().int().nonnegative().optional(),
    notes: z.string().min(1).optional(),
  })
  .strict();
export type Play = z.infer<typeof PlaySchema>;
