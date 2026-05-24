import path from "node:path";
import { createFileRepository } from "./file-repository";

export const content = createFileRepository(
  path.resolve(process.cwd(), "content"),
);

export * from "./types";
export * from "./queries";
export type { ContentRepository } from "./repository";
