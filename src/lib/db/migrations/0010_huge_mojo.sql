CREATE TABLE `file_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_item_id` text NOT NULL,
	`file_path` text NOT NULL,
	`content_before` text DEFAULT '',
	`content_after` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`schedule_item_id`) REFERENCES `schedule_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `review_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`file_path` text NOT NULL,
	`line_number` integer NOT NULL,
	`content` text NOT NULL,
	`ai_response` text DEFAULT '',
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `review_items` ADD `file_path` text;--> statement-breakpoint
ALTER TABLE `review_items` ADD `line_number` integer;