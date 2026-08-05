CREATE TABLE `concepts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`label` text NOT NULL,
	`family` text NOT NULL,
	`match_patterns` text DEFAULT '[]' NOT NULL,
	`explainer` text,
	`related_concepts` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `concepts_slug_unique` ON `concepts` (`slug`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`position` text NOT NULL,
	`class_year` integer,
	`height_in` integer,
	`weight_lb` integer,
	`city` text,
	`state` text,
	`roster_years` text DEFAULT '[]' NOT NULL,
	`cfbd_id` text,
	`aliases` text DEFAULT '[]' NOT NULL,
	`stars` integer,
	`national_rank` integer,
	`high_school` text,
	`status` text NOT NULL,
	`committed_to` text,
	`bio` text,
	`on_big_board` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_slug_unique` ON `players` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `players_cfbd_id_unique` ON `players` (`cfbd_id`);--> statement-breakpoint
CREATE INDEX `players_position_idx` ON `players` (`position`);--> statement-breakpoint
CREATE TABLE `series` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`title_pattern` text,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_slug_unique` ON `series` (`slug`);--> statement-breakpoint
CREATE TABLE `video_concepts` (
	`video_id` integer NOT NULL,
	`concept_id` integer NOT NULL,
	`source` text DEFAULT 'auto' NOT NULL,
	PRIMARY KEY(`video_id`, `concept_id`),
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `video_concepts_concept_idx` ON `video_concepts` (`concept_id`);--> statement-breakpoint
CREATE TABLE `video_players` (
	`video_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`source` text DEFAULT 'auto' NOT NULL,
	`match_score` integer,
	PRIMARY KEY(`video_id`, `player_id`),
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `video_players_player_idx` ON `video_players` (`player_id`);--> statement-breakpoint
CREATE TABLE `video_position_overrides` (
	`video_id` integer NOT NULL,
	`position_group` text NOT NULL,
	`source` text DEFAULT 'auto' NOT NULL,
	PRIMARY KEY(`video_id`, `position_group`),
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `video_position_overrides_group_idx` ON `video_position_overrides` (`position_group`);--> statement-breakpoint
CREATE TABLE `video_topics` (
	`video_id` integer NOT NULL,
	`topic` text NOT NULL,
	`source` text DEFAULT 'auto' NOT NULL,
	PRIMARY KEY(`video_id`, `topic`),
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `video_topics_topic_idx` ON `video_topics` (`topic`);--> statement-breakpoint
CREATE TABLE `videos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`youtube_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`published_at` text NOT NULL,
	`duration_sec` integer NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`headline` text,
	`analysis` text,
	`key_moments` text DEFAULT '[]' NOT NULL,
	`series_id` integer,
	`auto_tagged` integer DEFAULT false NOT NULL,
	`tag_confidence` integer DEFAULT 0 NOT NULL,
	`reviewed_at` text,
	`published` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `videos_youtube_id_unique` ON `videos` (`youtube_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `videos_slug_unique` ON `videos` (`slug`);--> statement-breakpoint
CREATE INDEX `videos_published_idx` ON `videos` (`published`,`published_at`);--> statement-breakpoint
CREATE INDEX `videos_series_idx` ON `videos` (`series_id`);