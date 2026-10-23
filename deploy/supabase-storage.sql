-- Idempotent provider configuration, separate from application schema migrations.
-- S3 credentials remain in hosting secrets; browser access has no policies.
BEGIN;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('buatin-references', 'buatin-references', false, 20971520, ARRAY['application/octet-stream'])
ON CONFLICT (id) DO NOTHING;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'buatin-references' AND public) THEN
    RAISE EXCEPTION 'Existing reference bucket is public; review access before enabling uploads';
  END IF;
END $$;
COMMIT;
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'buatin-references';
