CREATE TABLE "User" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "Category" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '', "color" TEXT NOT NULL, "icon" TEXT NOT NULL, "userId" TEXT NOT NULL, CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
CREATE TABLE "Transaction" ("id" TEXT NOT NULL PRIMARY KEY, "description" TEXT NOT NULL, "amount" INTEGER NOT NULL, "date" TEXT NOT NULL, "type" TEXT NOT NULL, "userId" TEXT NOT NULL, "categoryId" TEXT, CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE);
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
