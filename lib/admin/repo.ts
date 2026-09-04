/**
 * The active AdminRepository.
 *
 * This file is the single seam between the admin UI and the store. Every
 * route and server action imports `repo` from here and depends only on the
 * interface in ./contract, so switching implementations is a one-line change.
 *
 * mockRepo (./mock) remains for local UI work without a database — point
 * `repo` at it if you want fixtures instead of the real ingest output.
 */
import type { AdminRepository } from "./contract";
import { dbRepo } from "./db-repo";

export const repo: AdminRepository = dbRepo;
export type { AdminRepository };
