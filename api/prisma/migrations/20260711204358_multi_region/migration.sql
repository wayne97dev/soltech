-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VpnPeer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "region" TEXT NOT NULL DEFAULT 'de',
    "lastVerifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VpnPeer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VpnPeer" ("active", "address", "createdAt", "id", "lastVerifiedAt", "privateKey", "publicKey", "userId") SELECT "active", "address", "createdAt", "id", "lastVerifiedAt", "privateKey", "publicKey", "userId" FROM "VpnPeer";
DROP TABLE "VpnPeer";
ALTER TABLE "new_VpnPeer" RENAME TO "VpnPeer";
CREATE UNIQUE INDEX "VpnPeer_publicKey_key" ON "VpnPeer"("publicKey");
CREATE UNIQUE INDEX "VpnPeer_address_key" ON "VpnPeer"("address");
CREATE INDEX "VpnPeer_userId_idx" ON "VpnPeer"("userId");
CREATE INDEX "VpnPeer_region_idx" ON "VpnPeer"("region");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
