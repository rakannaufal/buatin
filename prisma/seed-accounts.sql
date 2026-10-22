-- ===================================================================
-- SQL SEED: Akun Asli Terverifikasi untuk Buatin (Supabase Production)
-- Jalankan di Supabase Dashboard -> SQL Editor (tab "Untitled query")
-- ===================================================================

DO $$
DECLARE
  -- Hash untuk password: rakannaufal1106
  v_pwd_hash text := '6afdf396238d7ff6ab54bb3070db404a:e57604351734cbbe6d64284744826cacbbe8e18d7ffafb4c3bf6edc15a598103e97277186cc9e28359860be3848fc8176b653a7e411afc45c5672dd3f9281c44';
  v_owner_id text := gen_random_uuid()::text;
  v_admin_id text := gen_random_uuid()::text;
  v_user_id  text := gen_random_uuid()::text;
  v_curr_id  text;
BEGIN
  -- 1. OWNER: naufalarakn432@gmail.com
  IF EXISTS (SELECT 1 FROM "User" WHERE email = 'naufalarakn432@gmail.com') THEN
    SELECT id INTO v_curr_id FROM "User" WHERE email = 'naufalarakn432@gmail.com';
    UPDATE "User"
    SET role = 'owner', "emailVerified" = true, status = 'active', "twoFactorEnabled" = false, "updatedAt" = NOW()
    WHERE id = v_curr_id;

    DELETE FROM "Account" WHERE "userId" = v_curr_id AND "providerId" = 'credential';
    INSERT INTO "Account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, v_curr_id, 'credential', v_curr_id, v_pwd_hash, NOW(), NOW());
  ELSE
    INSERT INTO "User" (id, name, email, "emailVerified", role, status, "twoFactorEnabled", "createdAt", "updatedAt")
    VALUES (v_owner_id, 'Naufal Rakan (Owner)', 'naufalarakn432@gmail.com', true, 'owner', 'active', false, NOW(), NOW());

    INSERT INTO "Account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, v_owner_id, 'credential', v_owner_id, v_pwd_hash, NOW(), NOW());
  END IF;

  -- 2. ADMIN: naufalrakan234@gmail.com
  IF EXISTS (SELECT 1 FROM "User" WHERE email = 'naufalrakan234@gmail.com') THEN
    SELECT id INTO v_curr_id FROM "User" WHERE email = 'naufalrakan234@gmail.com';
    UPDATE "User"
    SET role = 'admin', "emailVerified" = true, status = 'active', "twoFactorEnabled" = false, "updatedAt" = NOW()
    WHERE id = v_curr_id;

    DELETE FROM "Account" WHERE "userId" = v_curr_id AND "providerId" = 'credential';
    INSERT INTO "Account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, v_curr_id, 'credential', v_curr_id, v_pwd_hash, NOW(), NOW());
  ELSE
    INSERT INTO "User" (id, name, email, "emailVerified", role, status, "twoFactorEnabled", "createdAt", "updatedAt")
    VALUES (v_admin_id, 'Naufal Rakan (Admin)', 'naufalrakan234@gmail.com', true, 'admin', 'active', false, NOW(), NOW());

    INSERT INTO "Account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, v_admin_id, 'credential', v_admin_id, v_pwd_hash, NOW(), NOW());
  END IF;

  -- 3. USER: naufalrakan783@gmail.com
  IF EXISTS (SELECT 1 FROM "User" WHERE email = 'naufalrakan783@gmail.com') THEN
    SELECT id INTO v_curr_id FROM "User" WHERE email = 'naufalrakan783@gmail.com';
    UPDATE "User"
    SET role = 'user', "emailVerified" = true, status = 'active', "twoFactorEnabled" = false, "updatedAt" = NOW()
    WHERE id = v_curr_id;

    DELETE FROM "Account" WHERE "userId" = v_curr_id AND "providerId" = 'credential';
    INSERT INTO "Account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, v_curr_id, 'credential', v_curr_id, v_pwd_hash, NOW(), NOW());
  ELSE
    INSERT INTO "User" (id, name, email, "emailVerified", role, status, "twoFactorEnabled", "createdAt", "updatedAt")
    VALUES (v_user_id, 'Naufal Rakan (User)', 'naufalrakan783@gmail.com', true, 'user', 'active', false, NOW(), NOW());

    INSERT INTO "Account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, v_user_id, 'credential', v_user_id, v_pwd_hash, NOW(), NOW());
  END IF;

  RAISE NOTICE 'Semua akun asli (Owner, Admin, User) berhasil dibuat!';
END $$;
