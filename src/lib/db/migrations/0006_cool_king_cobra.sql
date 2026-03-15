CREATE TABLE `scheme_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`scheme_id` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`scheme_id`) REFERENCES `schemes`(`id`) ON UPDATE no action ON DELETE cascade
);
