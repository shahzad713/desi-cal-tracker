-- Day 10: Stripe billing (test mode). Pro = unlimited AI scans.
-- isPro is set ONLY from signature-verified Stripe webhooks — never from
-- client claims, never from query params.
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "isPro" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
