BEGIN;
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuotaLedger" DROP CONSTRAINT "QuotaLedger_userId_fkey";
ALTER TABLE "QuotaLedger" ADD CONSTRAINT "QuotaLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
