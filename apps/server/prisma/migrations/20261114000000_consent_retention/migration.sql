-- Per-site retention of consent records, counted from each visitor's latest choice.
ALTER TABLE "Site" ADD COLUMN "consentRetentionMonths" INTEGER;
