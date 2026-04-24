import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import {
  cleanupPreparedSubmissionUploads,
  ensureSubmission,
  finalizeSubmissionUploads,
  prepareSubmissionUploads
} from "@/lib/live-actions";
import { createUploadToken, verifyUploadToken } from "@/lib/upload-tokens";

type FinalizedUploadInput = {
  kind?: "zip" | "pdf" | "image" | "document";
  originalName: string;
  sizeBytes: number;
  storagePath: string;
  uploadToken: string;
};

type CleanupUploadInput = {
  sizeBytes: number;
  storagePath: string;
  uploadToken: string;
};

async function resolveStudentContext(sessionUserId: string) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return {
      error: { ok: false, error: "إعدادات الخادم لـ Supabase غير مكتملة.", status: 500 as const }
    };
  }

  const ownProfileResult = await supabase
    .from("student_profiles")
    .select("id, user_id")
    .eq("user_id", sessionUserId)
    .maybeSingle();

  if (ownProfileResult.error) {
    return {
      error: { ok: false, error: ownProfileResult.error.message, status: 500 as const }
    };
  }

  const ownProfile = ownProfileResult.data;
  if (!ownProfile) {
    return {
      error: { ok: false, error: "لا يوجد ملف طالب مرتبط بهذا الحساب.", status: 400 as const }
    };
  }

  return { supabase, ownProfile };
}

function toFiniteSize(value: unknown) {
  const sizeBytes = Number(value ?? 0);
  return Number.isFinite(sizeBytes) && sizeBytes >= 0 ? sizeBytes : 0;
}

function parseFinalizeFiles(files: unknown[]): FinalizedUploadInput[] {
  return files.map((item: unknown) => {
    const record = item as Record<string, unknown>;
    const kind = String(record.kind ?? "");

    return {
      originalName: String(record.originalName ?? ""),
      sizeBytes: toFiniteSize(record.sizeBytes),
      storagePath: String(record.storagePath ?? ""),
      uploadToken: String(record.uploadToken ?? ""),
      kind: kind === "zip" || kind === "pdf" || kind === "image" || kind === "document" ? kind : undefined
    };
  });
}

function parseCleanupFiles(files: unknown[]): CleanupUploadInput[] {
  return files.map((item: unknown) => {
    const record = item as Record<string, unknown>;

    return {
      sizeBytes: toFiniteSize(record.sizeBytes),
      storagePath: String(record.storagePath ?? ""),
      uploadToken: String(record.uploadToken ?? "")
    };
  });
}

function verifyPreparedUploads(input: {
  files: CleanupUploadInput[];
  studentProfileId: string;
  submissionId: string;
}) {
  return input.files.every((file) =>
    verifyUploadToken(file.uploadToken, {
      submissionId: input.submissionId,
      studentProfileId: input.studentProfileId,
      storagePath: file.storagePath,
      sizeBytes: file.sizeBytes
    })
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session || session.role !== "student") {
      return NextResponse.json({ ok: false, error: "غير مصرح لك برفع الملفات." }, { status: 403 });
    }

    const context = await resolveStudentContext(session.userId);
    if ("error" in context && context.error) {
      const error = context.error;
      return NextResponse.json({ ok: false, error: error.error }, { status: error.status });
    }

    const { supabase, ownProfile } = context;

    const body = await request.json();

    const requestedSubmissionId = String(body.submissionId ?? "");
    const roundId = String(body.roundId ?? "");

    if (requestedSubmissionId) {
      const existingSubmissionResult = await supabase
        .from("submissions")
        .select("id, student_profile_id")
        .eq("id", requestedSubmissionId)
        .maybeSingle();

      if (existingSubmissionResult.error) {
        return NextResponse.json({ ok: false, error: existingSubmissionResult.error.message }, { status: 500 });
      }

      if (!existingSubmissionResult.data || existingSubmissionResult.data.student_profile_id !== ownProfile.id) {
        return NextResponse.json({ ok: false, error: "هذا التسليم لا يخص هذا الطالب." }, { status: 403 });
      }
    }

    const submissionId =
      requestedSubmissionId ||
      (await ensureSubmission({
        studentProfileId: ownProfile.id,
        roundId
      }));

    if (body.action === "prepare") {
      const files = Array.isArray(body.files) ? body.files : [];
      if (files.length === 0) {
        return NextResponse.json({ ok: false, error: "لم يتم إرسال أي ملفات." }, { status: 400 });
      }

      const uploads = await prepareSubmissionUploads({
        submissionId,
        files: files.map((item: unknown) => {
          const record = item as Record<string, unknown>;
          return {
            clientName: String(record.clientName ?? ""),
            originalName: String(record.originalName ?? ""),
            contentType: String(record.contentType ?? "application/octet-stream"),
            sizeBytes: toFiniteSize(record.sizeBytes)
          };
        })
      });

      return NextResponse.json({
        ok: true,
        submissionId,
        uploads: uploads.map((upload) => ({
          ...upload,
          uploadToken: createUploadToken({
            submissionId,
            studentProfileId: ownProfile.id,
            storagePath: upload.storagePath,
            sizeBytes: upload.sizeBytes
          })
        }))
      });
    }

    if (body.action === "finalize") {
      const files = Array.isArray(body.files) ? body.files : [];
      if (files.length === 0) {
        return NextResponse.json({ ok: false, error: "لم يتم إرسال بيانات الملفات النهائية." }, { status: 400 });
      }

      const finalizedFiles = parseFinalizeFiles(files);
      if (!verifyPreparedUploads({ files: finalizedFiles, studentProfileId: ownProfile.id, submissionId })) {
        return NextResponse.json({ ok: false, error: "بيانات الرفع غير صالحة أو منتهية." }, { status: 403 });
      }

      const storagePaths = await finalizeSubmissionUploads({
        submissionId,
        files: finalizedFiles.map(({ originalName, sizeBytes, storagePath, kind }) => ({
          originalName,
          sizeBytes,
          storagePath,
          kind
        }))
      });

      return NextResponse.json({ ok: true, submissionId, storagePaths });
    }

    if (body.action === "cleanup") {
      const cleanupFiles = Array.isArray(body.files) ? parseCleanupFiles(body.files) : [];
      const legacyStoragePaths = Array.isArray(body.storagePaths) ? body.storagePaths : [];
      if (legacyStoragePaths.length > 0 && cleanupFiles.length === 0) {
        return NextResponse.json({ ok: false, error: "بيانات تنظيف الرفع غير صالحة." }, { status: 403 });
      }

      if (!verifyPreparedUploads({ files: cleanupFiles, studentProfileId: ownProfile.id, submissionId })) {
        return NextResponse.json({ ok: false, error: "بيانات تنظيف الرفع غير صالحة أو منتهية." }, { status: 403 });
      }

      const storagePaths = cleanupFiles.map((file) => file.storagePath);
      if (storagePaths.length > 0) {
        await cleanupPreparedSubmissionUploads({
          submissionId,
          storagePaths
        });
      }

      return NextResponse.json({ ok: true, submissionId });
    }

    return NextResponse.json({ ok: false, error: "طلب رفع غير معروف." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
