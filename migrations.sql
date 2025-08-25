-- Tarot Web App Schema Fixes Migration
-- =====================================
-- This file contains the SQL commands to fix schema issues

-- 1. Add unique index on telegram_id for client upsert
-- This prevents duplicate profiles and enables upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_tarot_user_profiles_telegram_id 
ON tarot_user_profiles(telegram_id);

-- 2. Ensure telegram_id column is text (not bigint) to support both numeric and string IDs
-- If the column exists as bigint, this will need to be done carefully:
-- ALTER TABLE tarot_user_profiles ALTER COLUMN telegram_id TYPE text;

-- 3. Set default for questions_used column
-- ALTER TABLE tarot_user_profiles ALTER COLUMN questions_used SET DEFAULT 0;

-- 4. Make user_id nullable for guests (Option A implementation)
-- This allows anonymous inserts without user_id
-- ALTER TABLE tarot_user_profiles ALTER COLUMN user_id DROP NOT NULL;

-- 5. Add database-level defaults for consistency
ALTER TABLE tarot_user_profiles ALTER COLUMN is_subscribed SET DEFAULT false;
ALTER TABLE tarot_user_profiles ALTER COLUMN free_predictions_left SET DEFAULT 3;
ALTER TABLE tarot_user_profiles ALTER COLUMN questions_used SET DEFAULT 0;

-- 6. RLS Policy for Option A - Allow anonymous inserts by telegram_id only
-- This policy allows inserts from anonymous users but only with telegram_id
-- CREATE POLICY "Allow anonymous insert by telegram_id" ON tarot_user_profiles
--   FOR INSERT TO anon
--   WITH CHECK (telegram_id IS NOT NULL);

-- 7. RLS Policy to allow anonymous selects by telegram_id
-- CREATE POLICY "Allow anonymous select by telegram_id" ON tarot_user_profiles
--   FOR SELECT TO anon
--   USING (telegram_id IS NOT NULL);

-- 8. RLS Policy to allow anonymous updates by telegram_id
-- CREATE POLICY "Allow anonymous update by telegram_id" ON tarot_user_profiles
--   FOR UPDATE TO anon
--   USING (telegram_id IS NOT NULL);

-- 9. RLS policies for other tables (REQUIRED to fix 401 errors)
-- RLS политики для tarot_questions
CREATE POLICY "Allow anonymous insert to tarot_questions" ON tarot_questions
  FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "Allow anonymous select from tarot_questions" ON tarot_questions
  FOR SELECT TO anon
  USING (true);

-- RLS политики для tarot_answers
CREATE POLICY "Allow anonymous insert to tarot_answers" ON tarot_answers
  FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "Allow anonymous select from tarot_answers" ON tarot_answers
  FOR SELECT TO anon
  USING (true);

-- RLS политики для tarot_daily_cards
CREATE POLICY "Allow anonymous insert to tarot_daily_cards" ON tarot_daily_cards
  FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "Allow anonymous select from tarot_daily_cards" ON tarot_daily_cards
  FOR SELECT TO anon
  USING (true);

-- RLS политики для tarot_reviews
CREATE POLICY "Allow anonymous insert to tarot_reviews" ON tarot_reviews
  FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "Allow anonymous select from tarot_reviews" ON tarot_reviews
  FOR SELECT TO anon
  USING (true);

-- Notes:
-- - The commented policies above should be uncommented and applied in Supabase dashboard
-- - Column type changes (telegram_id to text) should be done carefully with data migration
-- - Test all changes in a development environment first

-- =====================================
-- SUMMARY OF SCHEMA CHANGES NEEDED:
-- =====================================

-- 1. telegram_id column: Should be TEXT (not bigint) to support both numeric and string IDs
-- 2. questions_used column: Should have DEFAULT 0
-- 3. user_id column: Should be NULLABLE for guests (Option A RLS implementation)
-- 4. Unique index: Required on telegram_id for upsert functionality
-- 5. RLS policies: Need to allow anonymous operations by telegram_id

-- Current code assumes:
-- - telegram_id is text type
-- - questions_used defaults to 0
-- - user_id can be null for guest users
-- - Unique constraint exists on telegram_id

-- =====================================
-- CLEANUP SCRIPT FOR CORRUPTED telegram_id VALUES:
-- =====================================

-- Remove records with JSON-like telegram_id values
-- DELETE FROM tarot_user_profiles WHERE telegram_id LIKE '{%' OR telegram_id LIKE '[%';

-- Remove records with null or empty telegram_id
-- DELETE FROM tarot_user_profiles WHERE telegram_id IS NULL OR telegram_id = '';

-- Clean up whitespace in telegram_id
-- UPDATE tarot_user_profiles SET telegram_id = TRIM(telegram_id) WHERE telegram_id != TRIM(telegram_id);

-- Show problematic records before cleanup:
-- SELECT id, telegram_id, username, created_at FROM tarot_user_profiles 
-- WHERE telegram_id IS NULL OR telegram_id = '' OR telegram_id LIKE '{%' OR telegram_id LIKE '[%';

-- =====================================
-- TABLE STRUCTURE REQUIREMENTS:
-- =====================================

-- tarot_answers table should have these columns:
-- - id (primary key)
-- - question_id (foreign key to tarot_questions.id)
-- - card_id (text, the card identifier)
-- - card_name (text, the card name) -- THIS COLUMN MIGHT BE MISSING
-- - interpretation (text, the AI interpretation)
-- - created_at (timestamp)

-- If card_name column doesn't exist, add it:
-- ALTER TABLE tarot_answers ADD COLUMN card_name text;

-- Verify table structure with:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'tarot_answers';
