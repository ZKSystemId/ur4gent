-- CreateTable
CREATE TABLE "PaymentSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "memo" TEXT,
    "scheduleAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" DATETIME,
    CONSTRAINT "PaymentSchedule_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlockchainEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT,
    "eventType" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "txId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockchainEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "operationalStatus" TEXT NOT NULL DEFAULT 'active',
    "strategy" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "decisionStyle" TEXT NOT NULL,
    "hederaAccountId" TEXT NOT NULL,
    "hederaPublicKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reputation" INTEGER NOT NULL,
    "balance" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Agent" ("balance", "createdAt", "decisionStyle", "hederaAccountId", "hederaPublicKey", "id", "name", "reputation", "riskLevel", "role", "status", "strategy") SELECT "balance", "createdAt", "decisionStyle", "hederaAccountId", "hederaPublicKey", "id", "name", "reputation", "riskLevel", "role", "status", "strategy" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
