-- Migration: Add user_id to watchlist for per-user data isolation
-- Run this in your Supabase SQL editor or via the Supabase CLI.

-- 1. Add user_id column referencing auth.users
ALTER TABLE watchlist
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Drop the old global unique constraint on symbol (if it exists)
ALTER TABLE watchlist
  DROP CONSTRAINT IF EXISTS watchlist_symbol_key;

-- 3. Add a per-user unique constraint so each user can have their own entry per symbol
ALTER TABLE watchlist
  DROP CONSTRAINT IF EXISTS watchlist_symbol_user_unique;

ALTER TABLE watchlist
  ADD CONSTRAINT watchlist_symbol_user_unique UNIQUE (symbol, user_id);

-- 4. Enable Row-Level Security on the table
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view own watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can insert own watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can delete own watchlist" ON watchlist;

-- 6. Create RLS policies
-- SELECT: users can only read their own rows
CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: users can only insert rows for themselves
CREATE POLICY "Users can insert own watchlist"
  ON watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only delete their own rows
CREATE POLICY "Users can delete own watchlist"
  ON watchlist FOR DELETE
  USING (auth.uid() = user_id);
