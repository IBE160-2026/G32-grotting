CREATE TABLE "keyword_lists" (
	"content_hash" text PRIMARY KEY NOT NULL,
	"keywords" jsonb NOT NULL,
	"prompt_version" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
