import { S3Client, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/config/env";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const IMAGE_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type AllowedImageMime = keyof typeof IMAGE_EXT;

export async function uploadImageToR2(contentType: AllowedImageMime) {
  const key = `images/${crypto.randomUUID()}.${IMAGE_EXT[contentType]}`;
  const putUrl = await getSignedUrl(
    r2Client,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 3600 },
  );
  return{
    putUrl,
    publicUrl: `${env.R2_PUBLIC_URL}/${key}`,
    key,
  }
}

export async function checkR2Connection(): Promise<boolean> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: env.R2_BUCKET_NAME,
      MaxKeys: 1,
    });
    await r2Client.send(command, { abortSignal: AbortSignal.timeout(10000) });
    return true;
  } catch (error) {
    console.error("Error checking R2 connection:", error);
    return false;
  }
}
