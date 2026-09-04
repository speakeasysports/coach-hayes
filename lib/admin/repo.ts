/**
 * The active AdminRepository.
 *
 * Currently the in-memory mock. When worktree-drizzle-migration lands its
 * implementation, this file is the ONLY thing that changes — every route and
 * action imports `repo` from here and depends on the interface, not the store.
 */
import type { AdminRepository } from "./contract";
import { mockRepo } from "./mock";

export const repo: AdminRepository = mockRepo;
export type { AdminRepository };
