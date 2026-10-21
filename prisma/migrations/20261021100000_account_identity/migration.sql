-- Fail for operator review rather than merging identities or deleting accounts.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Account"
    GROUP BY "providerId", "accountId" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate provider identities require manual review before migration';
  END IF;
END $$;

CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
