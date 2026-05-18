-- ================================================================
-- จั่วกัน — SQL Migrations
-- รันใน Supabase SQL Editor ตามลำดับ
-- ================================================================

-- 1. User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  credits       INTEGER NOT NULL DEFAULT 0,
  total_wins    INTEGER NOT NULL DEFAULT 0,
  total_losses  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Game rooms
CREATE TABLE IF NOT EXISTS game_rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  host_id       UUID NOT NULL REFERENCES auth.users(id),
  max_players   INTEGER NOT NULL DEFAULT 4,
  bet_credits   INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'waiting', -- waiting | playing | finished
  player_count  INTEGER NOT NULL DEFAULT 1,
  state         JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);

-- 3. Room members
CREATE TABLE IF NOT EXISTS room_members (
  room_id     UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seat_index  INTEGER NOT NULL DEFAULT 0,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- 4. Credit requests (PromptPay topup)
CREATE TABLE IF NOT EXISTS credit_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  credits       INTEGER NOT NULL,
  amount_thb    NUMERIC(10,2) NOT NULL,
  package_label TEXT NOT NULL,
  slip_url      TEXT,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_requests_user ON credit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_requests_status ON credit_requests(status);

-- 5. System config (PromptPay number, admin email ฯลฯ)
CREATE TABLE IF NOT EXISTS system_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ตั้งค่าเริ่มต้น
INSERT INTO system_config (key, value)
VALUES
  ('promptpay_number', '0812345678'),  -- *** แก้เบอร์ PromptPay ***
  ('admin_email',      'admin@example.com')  -- *** แก้ admin email ***
ON CONFLICT DO NOTHING;

-- 6. Game history
CREATE TABLE IF NOT EXISTS game_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID REFERENCES game_rooms(id),
  winner_id     UUID REFERENCES auth.users(id),
  participants  JSONB,
  bet_credits   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Function: add_credits (admin approve topup)
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles SET credits = credits + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_requests ENABLE ROW LEVEL SECURITY;

-- user_profiles: อ่านได้ทุกคน, แก้ได้เฉพาะตัวเอง
CREATE POLICY "profiles_read" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- game_rooms: อ่านได้ทุกคน, สร้าง/แก้ได้เมื่อ login
CREATE POLICY "rooms_read" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON game_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "rooms_update_host" ON game_rooms FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "rooms_delete_host" ON game_rooms FOR DELETE USING (auth.uid() = host_id);

-- room_members
CREATE POLICY "members_read" ON room_members FOR SELECT USING (true);
CREATE POLICY "members_insert" ON room_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_delete_own" ON room_members FOR DELETE USING (auth.uid() = user_id);

-- credit_requests: เห็นเฉพาะของตัวเอง
CREATE POLICY "credits_own" ON credit_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credits_insert" ON credit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- Supabase Realtime: เปิดใช้ game_rooms table
-- ไปที่ Database → Replication → เพิ่ม game_rooms และ room_members
-- ================================================================
