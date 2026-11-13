-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "csrfToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "origins" TEXT[],
    "publicKey" TEXT NOT NULL,
    "secretKeyHash" TEXT NOT NULL,
    "ipHashSalt" TEXT NOT NULL,
    "draftConfig" JSON NOT NULL,
    "draftUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedRevision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyVersion" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "note" TEXT,
    "config" JSON NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedBy" TEXT,

    CONSTRAINT "PolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "subjectId" TEXT,
    "revision" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "categories" JSONB NOT NULL,
    "services" JSONB NOT NULL,
    "language" TEXT,
    "pageUrl" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "clientTimestamp" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminSession_userId_idx" ON "AdminSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Site_publicKey_key" ON "Site"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "Site_secretKeyHash_key" ON "Site"("secretKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyVersion_siteId_revision_key" ON "PolicyVersion"("siteId", "revision");

-- CreateIndex
CREATE INDEX "ConsentRecord_siteId_receivedAt_idx" ON "ConsentRecord"("siteId", "receivedAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_siteId_consentId_idx" ON "ConsentRecord"("siteId", "consentId");

-- CreateIndex
CREATE INDEX "ConsentRecord_siteId_subjectId_idx" ON "ConsentRecord"("siteId", "subjectId");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyVersion" ADD CONSTRAINT "PolicyVersion_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

