import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createServerSupabaseClient } from "@/lib/supabase";

const supabaseBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "student-submissions";
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2Bucket = process.env.R2_BUCKET;

const R2_PREFIX = "r2:";
const SUPABASE_PREFIX = "supabase:";

export type StorageProvider = "supabase" | "r2";

export type PreparedUploadTarget = {
  storagePath: string;
  provider: StorageProvider;
  token?: string;
  uploadUrl?: string;
  uploadHeaders?: Record<string, string>;
};

type ParsedStoragePath = {
  provider: StorageProvider;
  objectKey: string;
};

type DownloadedFile = {
  bytes: Uint8Array;
  contentType: string | null;
};

export const hasR2StorageEnv = Boolean(r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2Bucket);

let cachedR2Client: S3Client | null | undefined;

function getFileExtension(name: string) {
  return name.includes(".") ? `.${name.split(".").pop()?.toLowerCase()}` : "";
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function getR2Client() {
  if (!hasR2StorageEnv) {
    throw new Error("Cloudflare R2 environment is not configured.");
  }

  if (!cachedR2Client) {
    cachedR2Client = new S3Client({
      region: "auto",
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId!,
        secretAccessKey: r2SecretAccessKey!
      },
      forcePathStyle: true
    });
  }

  return cachedR2Client;
}

function parseStoragePath(storagePath: string): ParsedStoragePath {
  if (storagePath.startsWith(R2_PREFIX)) {
    return {
      provider: "r2",
      objectKey: storagePath.slice(R2_PREFIX.length)
    };
  }

  if (storagePath.startsWith(SUPABASE_PREFIX)) {
    return {
      provider: "supabase",
      objectKey: storagePath.slice(SUPABASE_PREFIX.length)
    };
  }

  return {
    provider: "supabase",
    objectKey: storagePath
  };
}

async function streamToUint8Array(stream: unknown): Promise<Uint8Array> {
  if (stream && typeof stream === "object" && "transformToByteArray" in stream) {
    const transformToByteArray = (stream as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray;
    return transformToByteArray.call(stream);
  }

  if (stream instanceof ReadableStream) {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    return merged;
  }

  if (stream && typeof stream === "object" && Symbol.asyncIterator in stream) {
    const chunks: Buffer[] = [];

    for await (const chunk of stream as AsyncIterable<Uint8Array | Buffer | string>) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
        continue;
      }

      chunks.push(Buffer.from(chunk));
    }

    return new Uint8Array(Buffer.concat(chunks));
  }

  throw new Error("Unsupported download stream.");
}

export function buildManagedStoragePath(
  submissionId: string,
  name: string,
  options?: {
    prefix?: string;
  }
) {
  const pathPrefix = options?.prefix ? `${trimSlashes(options.prefix)}/` : "";
  const objectKey = `${pathPrefix}${submissionId}/${Date.now()}-${crypto.randomUUID()}${getFileExtension(name)}`;
  return hasR2StorageEnv ? `${R2_PREFIX}${objectKey}` : objectKey;
}

export async function prepareManagedUpload(input: {
  storagePath: string;
  contentType: string;
}): Promise<PreparedUploadTarget> {
  const parsed = parseStoragePath(input.storagePath);
  const contentType = input.contentType || "application/octet-stream";

  if (parsed.provider === "r2") {
    const client = getR2Client();
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: r2Bucket,
        Key: parsed.objectKey,
        ContentType: contentType
      }),
      { expiresIn: 60 * 10 }
    );

    return {
      storagePath: input.storagePath,
      provider: "r2",
      uploadUrl,
      uploadHeaders: {
        "Content-Type": contentType
      }
    };
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const signedUpload = await supabase.storage.from(supabaseBucket).createSignedUploadUrl(parsed.objectKey);
  if (signedUpload.error || !signedUpload.data?.token) {
    throw new Error(signedUpload.error?.message ?? "تعذر تجهيز رابط الرفع.");
  }

  return {
    storagePath: input.storagePath,
    provider: "supabase",
    token: signedUpload.data.token
  };
}

export async function createManagedPreviewUrl(storagePath: string, expiresIn = 60 * 60) {
  const parsed = parseStoragePath(storagePath);

  if (parsed.provider === "r2") {
    if (!hasR2StorageEnv) {
      return null;
    }

    const client = getR2Client();
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: r2Bucket,
        Key: parsed.objectKey
      }),
      { expiresIn }
    );
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return null;
  }

  const signedUrlResult = await supabase.storage.from(supabaseBucket).createSignedUrl(parsed.objectKey, expiresIn);
  return signedUrlResult.data?.signedUrl ?? null;
}

export async function downloadManagedFile(storagePath: string): Promise<DownloadedFile> {
  const parsed = parseStoragePath(storagePath);

  if (parsed.provider === "r2") {
    const client = getR2Client();
    const result = await client.send(
      new GetObjectCommand({
        Bucket: r2Bucket,
        Key: parsed.objectKey
      })
    );

    if (!result.Body) {
      throw new Error("تعذر تنزيل الملف.");
    }

    return {
      bytes: await streamToUint8Array(result.Body),
      contentType: result.ContentType ?? null
    };
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const result = await supabase.storage.from(supabaseBucket).download(parsed.objectKey);
  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "تعذر تنزيل الملف.");
  }

  return {
    bytes: new Uint8Array(await result.data.arrayBuffer()),
    contentType: result.data.type || null
  };
}

export async function deleteManagedFiles(storagePaths: string[]) {
  if (storagePaths.length === 0) {
    return;
  }

  const supabaseKeys: string[] = [];
  const r2Keys: string[] = [];

  for (const storagePath of storagePaths) {
    const parsed = parseStoragePath(storagePath);
    if (parsed.provider === "r2") {
      r2Keys.push(parsed.objectKey);
    } else {
      supabaseKeys.push(parsed.objectKey);
    }
  }

  if (supabaseKeys.length > 0) {
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase server environment is not configured.");
    }

    const result = await supabase.storage.from(supabaseBucket).remove(supabaseKeys);
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  if (r2Keys.length > 0) {
    const client = getR2Client();
    const result = await client.send(
      new DeleteObjectsCommand({
        Bucket: r2Bucket,
        Delete: {
          Objects: r2Keys.map((key) => ({ Key: key })),
          Quiet: true
        }
      })
    );

    if (result.Errors && result.Errors.length > 0) {
      throw new Error(result.Errors[0]?.Message ?? "تعذر حذف الملفات من التخزين.");
    }
  }
}
