import { z } from "zod";

export const CfbdRecruitTypeSchema = z.enum([
  "HighSchool",
  "JUCO",
  "PrepSchool",
]);
export type CfbdRecruitType = z.infer<typeof CfbdRecruitTypeSchema>;

export const CfbdRecruitSchema = z.object({
  // CFBD returns this as a numeric string, not a number. Treat it as opaque.
  id: z.string().min(1),
  name: z.string(),
  recruitType: CfbdRecruitTypeSchema.nullable().optional(),
  year: z.number().int(),
  ranking: z.number().int().nullable(),
  stars: z.number().int().min(0).max(5).nullable(),
  rating: z.number().nullable(),
  position: z.string().nullable(),
  height: z.number().nullable(),
  weight: z.number().nullable(),
  school: z.string().nullable(),
  committedTo: z.string().nullable(),
  city: z.string().nullable(),
  stateProvince: z.string().nullable(),
});
export type CfbdRecruit = z.infer<typeof CfbdRecruitSchema>;
