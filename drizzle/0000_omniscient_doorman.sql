CREATE TABLE "ai_usage" (
	"scope" text NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_usage_scope_day_pk" PRIMARY KEY("scope","day")
);
