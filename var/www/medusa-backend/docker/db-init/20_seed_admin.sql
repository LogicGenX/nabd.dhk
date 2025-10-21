-- Seeds the default Admin Lite login for local development.
-- Password corresponds to "supersecret12345678" hashed with scrypt to match Medusa's format.
DO $$
BEGIN
  IF to_regclass('public.user') IS NOT NULL THEN
    INSERT INTO "user" (id, email, role, password_hash, created_at, updated_at, deleted_at)
    VALUES (
      'usr_seed_admin_lite',
      'admin@nabd.dhk',
      'admin',
      'c2NyeXB0AAEAAAABAAAAAdmFLO4qlNTTFTkGHFOKZaoz4TZn7wksajkzvTkrzbICzzd+4QtA8SPJGG/zpaKHN+7XPgpyg13F4gpR4X1KxqY64Zf0inyf2Zxvsq6q1rok',
      NOW(),
      NOW(),
      NULL
    )
    ON CONFLICT (email) DO UPDATE
    SET
      role = EXCLUDED.role,
      password_hash = EXCLUDED.password_hash,
      deleted_at = NULL,
      updated_at = NOW();
  END IF;
END;
$$;
