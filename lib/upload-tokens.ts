import { createHmac, timingSafeEqual } from "crypto";
import { getSessionSecret } from "@/lib/auth";

const uploadTokenTtlSeconds = 15 * 60;

type UploadTokenPayload = {
  exp: number;
  sizeBytes: number;
  storagePath: string;
  studentProfileId: string;
  submissionId: string;
};

type UploadTokenInput = Omit<UploadTokenPayload, "exp">;

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function signaturesMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function createUploadToken(input: UploadTokenInput) {
  const payload: UploadTokenPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + uploadTokenTtlSeconds
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyUploadToken(token: string, expected: UploadTokenInput) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !signaturesMatch(sign(encodedPayload), signature)) {
    return false;
  }

  let payload: UploadTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString()) as UploadTokenPayload;
  } catch {
    return false;
  }

  return (
    payload.exp >= Math.floor(Date.now() / 1000) &&
    payload.submissionId === expected.submissionId &&
    payload.studentProfileId === expected.studentProfileId &&
    payload.storagePath === expected.storagePath &&
    payload.sizeBytes === expected.sizeBytes
  );
}
