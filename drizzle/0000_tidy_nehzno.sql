CREATE TABLE "admin_meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"family" text NOT NULL,
	"match_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"explainer" text,
	"related_concepts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "concepts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"position" text NOT NULL,
	"class_year" integer,
	"height_in" integer,
	"weight_lb" integer,
	"city" text,
	"state" text,
	"roster_years" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cfbd_id" text,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stars" integer,
	"national_rank" integer,
	"high_school" text,
	"status" text NOT NULL,
	"committed_to" text,
	"bio" text,
	"on_big_board" boolean DEFAULT false NOT NULL,
	CONSTRAINT "players_slug_unique" UNIQUE("slug"),
	CONSTRAINT "players_cfbd_id_unique" UNIQUE("cfbd_id")
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"title_pattern" text,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "video_concepts" (
	"video_id" integer NOT NULL,
	"concept_id" integer NOT NULL,
	"source" text DEFAULT 'auto' NOT NULL,
	CONSTRAINT "video_concepts_video_id_concept_id_pk" PRIMARY KEY("video_id","concept_id")
);
--> statement-breakpoint
CREATE TABLE "video_players" (
	"video_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"source" text DEFAULT 'auto' NOT NULL,
	"match_score" integer,
	CONSTRAINT "video_players_video_id_player_id_pk" PRIMARY KEY("video_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "video_position_overrides" (
	"video_id" integer NOT NULL,
	"position_group" text NOT NULL,
	"source" text DEFAULT 'auto' NOT NULL,
	CONSTRAINT "video_position_overrides_video_id_position_group_pk" PRIMARY KEY("video_id","position_group")
);
--> statement-breakpoint
CREATE TABLE "video_topics" (
	"video_id" integer NOT NULL,
	"topic" text NOT NULL,
	"source" text DEFAULT 'auto' NOT NULL,
	CONSTRAINT "video_topics_video_id_topic_pk" PRIMARY KEY("video_id","topic")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"youtube_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"published_at" text NOT NULL,
	"duration_sec" integer NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"headline" text,
	"analysis" text,
	"key_moments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"series_id" integer,
	"auto_tagged" boolean DEFAULT false NOT NULL,
	"tag_confidence" integer DEFAULT 0 NOT NULL,
	"reviewed_at" text,
	"published" boolean DEFAULT false NOT NULL,
	CONSTRAINT "videos_youtube_id_unique" UNIQUE("youtube_id"),
	CONSTRAINT "videos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "video_concepts" ADD CONSTRAINT "video_concepts_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_concepts" ADD CONSTRAINT "video_concepts_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_players" ADD CONSTRAINT "video_players_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_players" ADD CONSTRAINT "video_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_position_overrides" ADD CONSTRAINT "video_position_overrides_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_topics" ADD CONSTRAINT "video_topics_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "players_position_idx" ON "players" USING btree ("position");--> statement-breakpoint
CREATE INDEX "video_concepts_concept_idx" ON "video_concepts" USING btree ("concept_id");--> statement-breakpoint
CREATE INDEX "video_players_player_idx" ON "video_players" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "video_position_overrides_group_idx" ON "video_position_overrides" USING btree ("position_group");--> statement-breakpoint
CREATE INDEX "video_topics_topic_idx" ON "video_topics" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "videos_published_idx" ON "videos" USING btree ("published","published_at");--> statement-breakpoint
CREATE INDEX "videos_series_idx" ON "videos" USING btree ("series_id");