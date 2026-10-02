-- Internal runtime state follows the existing Supabase Data API isolation policy.
ALTER TABLE "RuntimeHeartbeat" ENABLE ROW LEVEL SECURITY;

-- Preserve enabled account interests on watches that existed before the beta.
-- Watches explicitly created with "all categories" after that migration retain their choice.
UPDATE "Watch" w SET "interests" = ARRAY(
  SELECT i."type" FROM "UserInterest" i WHERE i."userId" = w."userId" AND i."enabled" ORDER BY i."type"
) WHERE cardinality(w."interests") = 0 AND w."createdAt" < (
  SELECT "started_at" FROM "_prisma_migrations" WHERE "migration_name" = '20261002000000_reliable_beta' ORDER BY "started_at" LIMIT 1
);
