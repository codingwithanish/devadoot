-- CreateEnum
CREATE TYPE "AgentSource" AS ENUM ('marketplace', 'custom');

-- CreateEnum
CREATE TYPE "MonitoringType" AS ENUM ('UI', 'API', 'Both');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('open', 'closed');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" "AgentSource" NOT NULL,
    "marketplaceId" TEXT,
    "customEndpoint" TEXT,
    "monitoring" "MonitoringType" NOT NULL,
    "welcomeMessage" TEXT NOT NULL DEFAULT '',
    "ruleNL" TEXT NOT NULL,
    "ruleStructured" JSONB,
    "collectors" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentSite" (
    "agentId" TEXT NOT NULL,
    "site" TEXT NOT NULL,

    CONSTRAINT "AgentSite_pkey" PRIMARY KEY ("agentId","site")
);

-- CreateTable
CREATE TABLE "AgentUrlPattern" (
    "agentId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,

    CONSTRAINT "AgentUrlPattern_pkey" PRIMARY KEY ("agentId","pattern")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "agentId" TEXT,
    "url" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "ruleSnapshot" JSONB NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Url" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceAgent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "chatEndpoint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceAgent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgentSite" ADD CONSTRAINT "AgentSite_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentUrlPattern" ADD CONSTRAINT "AgentUrlPattern_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
