/*
  Warnings:

  - The values [ANNOUNCEMENT] on the enum `PostCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PostCategory_new" AS ENUM ('ANNOUNCEMENTS', 'STANDINGS', 'CS2_NEWS', 'SPONSORED');
ALTER TABLE "public"."Post" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Post" ALTER COLUMN "category" TYPE "PostCategory_new" USING ("category"::text::"PostCategory_new");
ALTER TYPE "PostCategory" RENAME TO "PostCategory_old";
ALTER TYPE "PostCategory_new" RENAME TO "PostCategory";
DROP TYPE "public"."PostCategory_old";
ALTER TABLE "Post" ALTER COLUMN "category" SET DEFAULT 'ANNOUNCEMENTS';
COMMIT;

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "category" SET DEFAULT 'ANNOUNCEMENTS';
