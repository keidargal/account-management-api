-- CreateTable
CREATE TABLE "pessoas" (
    "personId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pessoas_pkey" PRIMARY KEY ("personId")
);

-- CreateTable
CREATE TABLE "accounts" (
    "accountId" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "balance" DECIMAL(19,4) NOT NULL,
    "dailyWithdrawealLimit" DECIMAL(19,4) NOT NULL,
    "activeFlag" BOOLEAN NOT NULL DEFAULT true,
    "accountType" INTEGER NOT NULL,
    "createDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "transactions" (
    "transactionId" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "value" DECIMAL(19,4) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("transactionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "pessoas_document_key" ON "pessoas"("document");

-- CreateIndex
CREATE INDEX "transactions_accountId_idx" ON "transactions"("accountId");

-- CreateIndex
CREATE INDEX "transactions_transactionDate_idx" ON "transactions"("transactionDate");

-- CreateIndex
CREATE INDEX "transactions_accountId_transactionDate_idx" ON "transactions"("accountId", "transactionDate");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "pessoas"("personId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;
