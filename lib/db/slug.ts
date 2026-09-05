/**
 * Slug minting, shared by the ingest pipeline and the admin's sheet import.
 *
 * These lived only in scripts/ingest.ts, so the import path grew its own
 * inline version that disagreed on apostrophes and trailing dashes — and had
 * no uniqueness check at all against a NOT NULL UNIQUE column.
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Mint a slug not present in `taken`; claims it. */
export function mintSlug(
  base: string,
  fallback: string,
  taken: Set<string>,
): string {
  let slug = slugify(base) || fallback;
  if (taken.has(slug)) {
    let n = 2;
    while (taken.has(`${slug}-${n}`)) n++;
    slug = `${slug}-${n}`;
  }
  taken.add(slug);
  return slug;
}
