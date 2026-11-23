CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"job" text NOT NULL,
	"analysis" text NOT NULL,
	"gaps" text,
	"letter" text,
	"letter_check" text,
	"fingerprint" text NOT NULL,
	"seq" integer NOT NULL,
	"match_score" integer NOT NULL,
	"letter_rev" integer DEFAULT 0 NOT NULL,
	"gaps_rev" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_student_id_seq_unique" UNIQUE("student_id","seq")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;