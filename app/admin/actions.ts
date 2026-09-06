"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  checkPassword,
  createSessionToken,
} from "@/lib/admin/auth";
import { requireSession } from "@/lib/admin/session";
import { repo } from "@/lib/admin/repo";
import type {
  ConceptId,
  ConceptInput,
  PlayerEditableFields,
  PlayerId,
  TagUpdate,
  VideoEditorialFields,
  VideoId,
} from "@/lib/admin/contract";

/** Pages that change when tagging changes. */
function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/queue");
  revalidatePath("/big-board");
}

// ---------------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------------
export type LoginState = { error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!password) return { error: "Enter the password." };

  let ok = false;
  try {
    ok = await checkPassword(password);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Auth misconfigured." };
  }
  if (!ok) return { error: "Incorrect password." };

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
  // Only allow same-origin relative paths.
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// queue
// ---------------------------------------------------------------------------
export async function confirmVideoAction(id: string) {
  await requireSession();
  await repo.confirmVideo(id as VideoId);
  revalidateAdmin();
}

export async function saveTagsAction(id: string, tags: TagUpdate) {
  await requireSession();
  await repo.saveVideoTags(id as VideoId, tags);
  revalidateAdmin();
}

export async function archiveVideosAction(ids: string[]) {
  await requireSession();
  await repo.archiveVideos(ids as VideoId[]);
  revalidateAdmin();
}

export async function syncNowAction() {
  await requireSession();
  await repo.triggerSync();
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// concepts
// ---------------------------------------------------------------------------
function revalidateConcepts() {
  revalidatePath("/admin/concepts");
  revalidatePath("/playbook");
}

export type ConceptFormState = { error: string | null; ok: boolean };

export async function saveConceptAction(
  id: string | null,
  input: ConceptInput,
): Promise<ConceptFormState> {
  await requireSession();
  try {
    if (id) {
      await repo.updateConcept(id as ConceptId, input);
      revalidatePath(`/admin/concepts/${id}`);
    } else {
      await repo.createConcept(input);
    }
    revalidateConcepts();
    return { error: null, ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err), ok: false };
  }
}

export async function deleteConceptAction(
  id: string,
): Promise<ConceptFormState> {
  await requireSession();
  try {
    await repo.deleteConcept(id as ConceptId);
    revalidateConcepts();
    return { error: null, ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err), ok: false };
  }
}

// ---------------------------------------------------------------------------
// sheet import
// ---------------------------------------------------------------------------
export async function setImportSourceAction(url: string) {
  await requireSession();
  await repo.setImportSource(url.trim());
  revalidatePath("/admin/import");
}

export type PreviewState =
  | { ok: true; preview: Awaited<ReturnType<typeof repo.previewSheetImport>> }
  | { ok: false; error: string };

export async function previewImportAction(url: string): Promise<PreviewState> {
  await requireSession();
  try {
    const preview = await repo.previewSheetImport(url.trim() || undefined);
    return { ok: true, preview };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function applyImportAction(
  url: string,
  rowKeys?: string[],
  expectedFingerprint?: string,
) {
  await requireSession();
  const result = await repo.applySheetImport(
    url.trim(),
    rowKeys,
    expectedFingerprint,
  );
  revalidatePath("/admin/import");
  revalidatePath("/admin/players");
  revalidatePath("/big-board");
  return result;
}

// ---------------------------------------------------------------------------
// video + player edit
// ---------------------------------------------------------------------------
export async function saveEditorialAction(
  id: string,
  fields: Partial<VideoEditorialFields>,
) {
  await requireSession();
  await repo.saveVideoEditorial(id as VideoId, fields);
  revalidatePath(`/admin/video/${id}`);
  revalidateAdmin();
}

export async function setPublishedAction(id: string, published: boolean) {
  await requireSession();
  await repo.setVideoPublished(id as VideoId, published);
  revalidatePath(`/admin/video/${id}`);
  revalidateAdmin();
}

export async function savePlayerAction(
  id: string,
  fields: Partial<PlayerEditableFields>,
) {
  await requireSession();
  await repo.savePlayer(id as PlayerId, fields);
  revalidatePath(`/admin/player/${id}`);
  revalidatePath("/admin/players");
}
