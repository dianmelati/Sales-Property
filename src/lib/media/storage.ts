import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/** Abstraksi storage. Ganti driver lewat STORAGE_DRIVER tanpa menyentuh kode lain. */
export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

const CACHE = "public, max-age=31536000, immutable";

class LocalDriver implements StorageDriver {
  private root = path.join(process.cwd(), "public", "uploads");
  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return full;
  }
  async put(key: string, body: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }
  async delete(key: string) {
    await unlink(this.resolve(key)).catch((e: NodeJS.ErrnoException) => { if (e.code !== "ENOENT") throw e; });
  }
  publicUrl(key: string) { return `/uploads/${key}`; }
}

class S3Driver implements StorageDriver {
  private clientPromise: Promise<import("@aws-sdk/client-s3").S3Client> | null = null;
  private bucket = required("STORAGE_BUCKET");
  private client() {
    this.clientPromise ??= import("@aws-sdk/client-s3").then(({ S3Client }) => new S3Client({
      region: process.env.STORAGE_REGION || "auto",
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      forcePathStyle: !!process.env.STORAGE_ENDPOINT, // MinIO dan sejenisnya
      credentials: { accessKeyId: required("STORAGE_ACCESS_KEY_ID"), secretAccessKey: required("STORAGE_SECRET_ACCESS_KEY") },
    }));
    return this.clientPromise;
  }
  async put(key: string, body: Buffer, contentType: string) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client()).send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: CACHE }));
  }
  async delete(key: string) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client()).send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
  publicUrl(key: string) { return `https://${required("STORAGE_PUBLIC_HOST")}/${key}`; }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

let driver: StorageDriver | null = null;
export function getStorage(): StorageDriver {
  driver ??= process.env.STORAGE_DRIVER === "s3" ? new S3Driver() : new LocalDriver();
  return driver;
}
