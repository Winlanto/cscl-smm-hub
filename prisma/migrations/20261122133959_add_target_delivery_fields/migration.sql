/*
  Warnings:

  - A unique constraint covering the columns `[postId,platform,channelKey]` on the table `PostTarget` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PostTarget_postId_platform_key";

-- AlterTable
ALTER TABLE "PostTarget" ADD COLUMN     "apiResponse" JSONB,
ADD COLUMN     "channelKey" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "customText" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "PostTarget_postId_platform_channelKey_key" ON "PostTarget"("postId", "platform", "channelKey");
