-- Tarot Web App Authentication RLS Policies Migration
-- =====================================================
-- This file contains RLS policies for authenticated Telegram users

-- First, let's ensure RLS is enabled on all tables
ALTER TABLE tarot_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_daily_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_answers ENABLE ROW LEVEL SECURITY;

-- Drop old permissive anonymous policies (if they exist)
DROP POLICY IF EXISTS "Allow anonymous insert to tarot_questions" ON tarot_questions;
DROP POLICY IF EXISTS "Allow anonymous select from tarot_questions" ON tarot_questions;
DROP POLICY IF EXISTS "Allow anonymous insert to tarot_answers" ON tarot_answers;
DROP POLICY IF EXISTS "Allow anonymous select from tarot_answers" ON tarot_answers;
DROP POLICY IF EXISTS "Allow anonymous insert to tarot_daily_cards" ON tarot_daily_cards;
DROP POLICY IF EXISTS "Allow anonymous select from tarot_daily_cards" ON tarot_daily_cards;
DROP POLICY IF EXISTS "Allow anonymous insert to tarot_reviews" ON tarot_reviews;
DROP POLICY IF EXISTS "Allow anonymous select from tarot_reviews" ON tarot_reviews;
DROP POLICY IF EXISTS "Allow anonymous insert by telegram_id" ON tarot_user_profiles;
DROP POLICY IF EXISTS "Allow anonymous select by telegram_id" ON tarot_user_profiles;
DROP POLICY IF EXISTS "Allow anonymous update by telegram_id" ON tarot_user_profiles;

-- ===========================================
-- AUTHENTICATION-BASED RLS POLICIES
-- ===========================================

-- 1. tarot_user_profiles table policies
-- Allow users to see and update their own profile (authenticated users)
CREATE POLICY "Users can view own profile" ON tarot_user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own profile" ON tarot_user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Allow authenticated users to insert profiles (for themselves)
CREATE POLICY "Users can insert own profile" ON tarot_user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IS NULL);

-- Allow anon users to see profiles by telegram_id (for backward compatibility)
CREATE POLICY "Anon can view profiles by telegram_id" ON tarot_user_profiles
  FOR SELECT TO anon
  USING (telegram_id IS NOT NULL);

-- Allow anon users to insert/update profiles by telegram_id (for backward compatibility)
CREATE POLICY "Anon can upsert profiles by telegram_id" ON tarot_user_profiles
  FOR INSERT TO anon
  WITH CHECK (telegram_id IS NOT NULL);

CREATE POLICY "Anon can update profiles by telegram_id" ON tarot_user_profiles
  FOR UPDATE TO anon
  USING (telegram_id IS NOT NULL)
  WITH CHECK (telegram_id IS NOT NULL);

-- Allow creation of profiles by server (service role)
CREATE POLICY "Service role can manage profiles" ON tarot_user_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. tarot_questions table policies
-- Authenticated users can access their own questions
CREATE POLICY "Users can view own questions" ON tarot_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tarot_user_profiles 
      WHERE tarot_user_profiles.user_id::text = auth.uid()::text 
      AND tarot_user_profiles.user_id = tarot_questions.user_id
    )
  );

CREATE POLICY "Users can insert own questions" ON tarot_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tarot_user_profiles 
      WHERE tarot_user_profiles.user_id::text = auth.uid()::text 
      AND tarot_user_profiles.user_id = user_id
    )
  );

-- Allow anon users to access questions (for backward compatibility)
CREATE POLICY "Anon can view all questions" ON tarot_questions
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert questions" ON tarot_questions
  FOR INSERT TO anon
  WITH CHECK (true);

-- 3. tarot_daily_cards table policies
-- Authenticated users can access their own daily cards
CREATE POLICY "Users can view own daily cards" ON tarot_daily_cards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tarot_user_profiles 
      WHERE tarot_user_profiles.user_id::text = auth.uid()::text 
      AND tarot_user_profiles.user_id = tarot_daily_cards.user_id
    )
  );

CREATE POLICY "Users can insert own daily cards" ON tarot_daily_cards
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tarot_user_profiles 
      WHERE tarot_user_profiles.user_id::text = auth.uid()::text 
      AND tarot_user_profiles.user_id = user_id
    )
  );

-- Allow anon users to access daily cards (for backward compatibility)
CREATE POLICY "Anon can view all daily cards" ON tarot_daily_cards
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert daily cards" ON tarot_daily_cards
  FOR INSERT TO anon
  WITH CHECK (true);

-- 4. tarot_reviews table policies
-- Reviews can be read by all users, but only owners can insert
CREATE POLICY "All users can view reviews" ON tarot_reviews
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert own reviews" ON tarot_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tarot_user_profiles 
      WHERE tarot_user_profiles.user_id::text = auth.uid()::text 
      AND tarot_user_profiles.user_id = user_id
    )
  );

-- Allow anon users to insert reviews (for backward compatibility)
CREATE POLICY "Anon can insert reviews" ON tarot_reviews
  FOR INSERT TO anon
  WITH CHECK (true);

-- 5. tarot_answers table policies
-- Authenticated users can access answers to their own questions
CREATE POLICY "Users can view own answers" ON tarot_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tarot_questions
      JOIN tarot_user_profiles ON tarot_user_profiles.user_id = tarot_questions.user_id
      WHERE tarot_user_profiles.user_id::text = auth.uid()::text 
      AND tarot_questions.id = tarot_answers.question_id
    )
  );

CREATE POLICY "Users can insert own answers" ON tarot_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tarot_questions
      JOIN tarot_user_profiles ON tarot_user_profiles.user_id = tarot_questions.user_id
      WHERE tarot_user_profiles.user_id::text = auth.uid()::text 
      AND tarot_questions.id = question_id
    )
  );

-- Allow anon users to access answers (for backward compatibility)
CREATE POLICY "Anon can view all answers" ON tarot_answers
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert answers" ON tarot_answers
  FOR INSERT TO anon
  WITH CHECK (true);

-- ===========================================
-- HELPER POLICIES FOR SERVICE OPERATIONS
-- ===========================================

-- Allow service role to perform all operations (for server-side functions)
CREATE POLICY "Service role full access to questions" ON tarot_questions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to daily cards" ON tarot_daily_cards
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to reviews" ON tarot_reviews
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to answers" ON tarot_answers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ===========================================
-- DATABASE STRUCTURE REQUIREMENTS
-- ===========================================

-- Ensure user_id column in all related tables matches the user_id from auth
-- This assumes user_id stores the UUID from auth.users table

-- Check if we need to add/modify columns for proper relationships
-- (These should be run only if the columns don't exist or have wrong type)

-- For tarot_user_profiles, ensure user_id can store auth UUID
-- ALTER TABLE tarot_user_profiles ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Add index for better performance on auth lookups
CREATE INDEX IF NOT EXISTS idx_tarot_user_profiles_user_id ON tarot_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tarot_questions_user_id ON tarot_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_tarot_daily_cards_user_id ON tarot_daily_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_tarot_reviews_user_id ON tarot_reviews(user_id);

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Run these queries to verify the policies are working:

-- 1. Check if RLS is enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename LIKE 'tarot_%' AND schemaname = 'public';

-- 2. List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename LIKE 'tarot_%' AND schemaname = 'public';

-- 3. Test authentication by checking current user
-- SELECT auth.uid(), auth.role();

-- ===========================================
-- NOTES FOR IMPLEMENTATION
-- ===========================================

-- 1. The auth-with-telegram endpoint should ensure that:
--    - user_id in tarot_user_profiles matches auth.uid()
--    - The JWT token contains the correct user ID

-- 2. When creating a user profile, the user_id should be set to the 
--    authenticated user's UUID from the auth system

-- 3. All client-side operations will now require authentication
--    before accessing any data

-- 4. The telegram_id can still be used for user lookup, but
--    the auth.uid() is what controls access to data
