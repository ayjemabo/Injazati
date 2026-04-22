import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const sessionCookieName = "maariduna_student_session";
const sessionSecret = process.env.SESSION_SECRET || "maariduna-dev-session-secret";

export type AppSession = {
  userId: string;
  role: "student" | "teacher" | "admin" | "visitor";
};

export function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, stored] = storedHash.split(":");
  if (!salt || !stored) {
    return false;
  }

  const derived = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(stored, "hex");

  if (derived.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derived, storedBuffer);
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret).update(payload).digest("hex");
}

export async function createAppSession(userId: string, role: AppSession["role"]) {
  const session: AppSession = { userId, role };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = sign(payload);
  const store = await cookies();

  store.set(sessionCookieName, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export async function createStudentSession(userId: string) {
  return createAppSession(userId, "student");
}

export async function createTeacherSession(userId: string) {
  return createAppSession(userId, "teacher");
}

export async function createVisitorSession(userId: string) {
  return createAppSession(userId, "visitor");
}

export async function clearAppSession() {
  const store = await cookies();
  store.delete(sessionCookieName);
}

export async function clearStudentSession() {
  return clearAppSession();
}

export async function getAppSession() {
  const store = await cookies();
  const raw = store.get(sessionCookieName)?.value;

  if (!raw) {
    return null;
  }

  const [payload, signature] = raw.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as AppSession;
  } catch {
    return null;
  }
}

export async function getStudentSession() {
  const session = await getAppSession();
  return session?.role === "student" ? session : null;
}
