CREATE TABLE "patreon_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"teaser" text,
	"thumbnail_url" text,
	"posted_at" text,
	"published" boolean DEFAULT false NOT NULL,
	CONSTRAINT "patreon_posts_url_unique" UNIQUE("url")
);
