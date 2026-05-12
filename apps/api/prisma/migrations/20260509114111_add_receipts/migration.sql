-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "pdfS3Key" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptSequence" (
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReceiptSequence_pkey" PRIMARY KEY ("userId","year")
);

-- CreateIndex
CREATE INDEX "Receipt_invoiceId_idx" ON "Receipt"("invoiceId");

-- CreateIndex
CREATE INDEX "Receipt_userId_paidAt_idx" ON "Receipt"("userId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_userId_receiptNumber_key" ON "Receipt"("userId", "receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_invoiceId_paymentReference_key" ON "Receipt"("invoiceId", "paymentReference");

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptSequence" ADD CONSTRAINT "ReceiptSequence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
