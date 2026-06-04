ALTER TABLE "user_onboarding" ADD COLUMN IF NOT EXISTS "gender" text CHECK ("gender" IN ('male', 'female'));
ALTER TABLE "user_onboarding" ADD COLUMN IF NOT EXISTS "gender_prompt_dismissed" boolean NOT NULL DEFAULT false;
