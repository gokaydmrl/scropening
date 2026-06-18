CREATE TABLE "site_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"embedding" vector,
	"created_at" timestamp DEFAULT now() NOT NULL
);
