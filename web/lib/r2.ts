import { S3Client } from "@aws-sdk/client-s3";

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!_client) {
    if (!process.env.R2_ACCOUNT_ID) throw new Error("Falta R2_ACCOUNT_ID");
    if (!process.env.R2_ACCESS_KEY_ID) throw new Error("Falta R2_ACCESS_KEY_ID");
    if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error("Falta R2_SECRET_ACCESS_KEY");

    _client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

export function getR2Bucket(): string {
  if (!process.env.R2_BUCKET_NAME) throw new Error("Falta R2_BUCKET_NAME");
  return process.env.R2_BUCKET_NAME;
}

export function getR2PublicUrl(): string {
  if (!process.env.R2_PUBLIC_URL) throw new Error("Falta R2_PUBLIC_URL");
  return process.env.R2_PUBLIC_URL;
}
