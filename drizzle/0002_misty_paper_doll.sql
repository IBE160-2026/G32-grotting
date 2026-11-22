CREATE TABLE "local_meta" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_meta_single_row" CHECK ("local_meta"."id" = 1)
);
