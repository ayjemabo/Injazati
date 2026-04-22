import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase";
import {
  buildManagedStoragePath,
  deleteManagedFiles,
  downloadManagedFile,
  prepareManagedUpload,
  sanitizeStorageSegment
} from "@/lib/storage";

type EnsureSubmissionInput = {
  studentProfileId: string;
  roundId: string;
};

type RegisterFileInput = {
  submissionId: string;
  name: string;
  kind: "zip" | "pdf" | "image" | "document";
  sizeBytes: number;
  storagePath: string;
};

type ReviewUpdateInput = {
  submissionId: string;
  teacherId: string;
  status: "submitted" | "under_review" | "needs_revision" | "approved";
  grade: number | null;
  comment?: string;
};

type UploadPreparationInput = {
  submissionId: string;
  files: Array<{
    clientName: string;
    originalName: string;
    contentType: string;
    sizeBytes: number;
  }>;
};

async function getSubmissionStoragePrefix(submissionId: string) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const submissionResult = await supabase
    .from("submissions")
    .select("student_profile_id, round_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionResult.error) {
    throw new Error(submissionResult.error.message);
  }

  const submission = submissionResult.data;
  if (!submission) {
    return null;
  }

  const [profileResult, roundResult] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("user_id")
      .eq("id", submission.student_profile_id)
      .maybeSingle(),
    supabase
      .from("submission_rounds")
      .select("subject")
      .eq("id", submission.round_id)
      .maybeSingle()
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (roundResult.error) {
    throw new Error(roundResult.error.message);
  }

  const userId = profileResult.data?.user_id;
  if (!userId) {
    return null;
  }

  const userResult = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (userResult.error) {
    throw new Error(userResult.error.message);
  }

  const subject = sanitizeStorageSegment(roundResult.data?.subject ?? "art");
  const studentIdentifier = sanitizeStorageSegment(
    userResult.data?.username || userResult.data?.display_name || userId
  );

  return `${subject}/${studentIdentifier}`;
}

function detectFileKind(name: string): RegisterFileInput["kind"] {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";

  if (extension === "zip") {
    return "zip";
  }

  if (extension === "pdf") {
    return "pdf";
  }

  if (["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) {
    return "image";
  }

  return "document";
}

export async function prepareSubmissionUploads(input: UploadPreparationInput) {
  const storagePrefix = await getSubmissionStoragePrefix(input.submissionId);
  const uploads = [];

  for (const file of input.files) {
    const storagePath = buildManagedStoragePath(input.submissionId, file.clientName || file.originalName, {
      prefix: storagePrefix ?? undefined
    });
    const uploadTarget = await prepareManagedUpload({
      storagePath,
      contentType: file.contentType
    });

    uploads.push({
      ...uploadTarget,
      originalName: file.originalName,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes
    });
  }

  return uploads;
}

export async function ensureSubmission(input: EnsureSubmissionInput) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const existing = await supabase
    .from("submissions")
    .select("id")
    .eq("student_profile_id", input.studentProfileId)
    .eq("round_id", input.roundId)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data?.id) {
    return existing.data.id;
  }

  const created = await supabase
    .from("submissions")
    .insert({
      student_profile_id: input.studentProfileId,
      round_id: input.roundId,
      status: "draft",
      submitted_at: null
    })
    .select("id")
    .single();

  if (created.error || !created.data?.id) {
    throw new Error(created.error?.message ?? "Failed to create submission.");
  }

  return created.data.id;
}

export async function registerUploadedFile(input: Omit<RegisterFileInput, "kind"> & { kind?: RegisterFileInput["kind"] }) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const payload = {
    submission_id: input.submissionId,
    name: input.name,
    kind: input.kind ?? detectFileKind(input.name),
    size_bytes: input.sizeBytes,
    storage_path: input.storagePath
  };

  const result = await supabase.from("submission_files").insert(payload).select("id").single();
  if (result.error || !result.data?.id) {
    throw new Error(result.error?.message ?? "تعذر تسجيل الملف.");
  }

  return result.data.id;
}

async function markSubmissionSubmitted(submissionId: string) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const updateResult = await supabase
    .from("submissions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", submissionId);

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }
}

async function cleanupFailedUpload(supabase: NonNullable<ReturnType<typeof createServerSupabaseClient>>, submissionId: string, insertedFileIds: string[], storagePaths: string[]) {
  if (insertedFileIds.length > 0) {
    await supabase.from("submission_files").delete().in("id", insertedFileIds);
  }

  await deleteManagedFiles(storagePaths);

  await supabase
    .from("submissions")
    .update({
      updated_at: new Date().toISOString()
    })
    .eq("id", submissionId);
}

export async function finalizeSubmissionUploads(input: {
  submissionId: string;
  files: Array<{
    originalName: string;
    sizeBytes: number;
    storagePath: string;
    kind?: RegisterFileInput["kind"];
  }>;
}) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const insertedFileIds: string[] = [];
  const insertedStoragePaths: string[] = [];

  try {
    for (const item of input.files) {
      const fileId = await registerUploadedFile({
        submissionId: input.submissionId,
        name: item.originalName,
        sizeBytes: item.sizeBytes,
        storagePath: item.storagePath,
        kind: item.kind
      });

      insertedFileIds.push(fileId);
      insertedStoragePaths.push(item.storagePath);
    }

    await markSubmissionSubmitted(input.submissionId);
    revalidatePath("/maariduna/student");
    revalidatePath("/maariduna/teacher");
    revalidatePath("/maariduna/visitors");
    revalidatePath(`/maariduna/submissions/${input.submissionId}`);

    return insertedStoragePaths;
  } catch (error) {
    await cleanupFailedUpload(supabase, input.submissionId, insertedFileIds, insertedStoragePaths);
    throw error;
  }
}

export async function cleanupPreparedSubmissionUploads(input: {
  submissionId: string;
  storagePaths: string[];
}) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  await cleanupFailedUpload(supabase, input.submissionId, [], input.storagePaths);
}

export async function downloadSubmissionFile(input: {
  storagePath: string;
}) {
  return downloadManagedFile(input.storagePath);
}

export async function deleteSubmissionFile(input: {
  submissionId: string;
  fileId: string;
}) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const fileResult = await supabase
    .from("submission_files")
    .select("id, storage_path")
    .eq("id", input.fileId)
    .eq("submission_id", input.submissionId)
    .maybeSingle();

  if (fileResult.error) {
    throw new Error(fileResult.error.message);
  }

  if (!fileResult.data) {
    throw new Error("الملف المطلوب غير موجود.");
  }

  const deleteFileResult = await supabase
    .from("submission_files")
    .delete()
    .eq("id", input.fileId)
    .eq("submission_id", input.submissionId);

  if (deleteFileResult.error) {
    throw new Error(deleteFileResult.error.message);
  }

  await deleteManagedFiles([fileResult.data.storage_path]);

  const remainingFilesResult = await supabase
    .from("submission_files")
    .select("id", { count: "exact", head: true })
    .eq("submission_id", input.submissionId);

  if (remainingFilesResult.error) {
    throw new Error(remainingFilesResult.error.message);
  }

  const hasRemainingFiles = (remainingFilesResult.count ?? 0) > 0;
  const submissionUpdateResult = await supabase
    .from("submissions")
    .update({
      status: hasRemainingFiles ? undefined : "draft",
      submitted_at: hasRemainingFiles ? undefined : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.submissionId);

  if (submissionUpdateResult.error) {
    throw new Error(submissionUpdateResult.error.message);
  }

  revalidatePath("/maariduna/student");
  revalidatePath("/maariduna/teacher");
  revalidatePath("/maariduna/visitors");
  revalidatePath(`/maariduna/submissions/${input.submissionId}`);
}

export async function deleteSubmission(input: {
  submissionId: string;
}) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const filesResult = await supabase
    .from("submission_files")
    .select("storage_path")
    .eq("submission_id", input.submissionId);

  if (filesResult.error) {
    throw new Error(filesResult.error.message);
  }

  const storagePaths = (filesResult.data ?? []).map((file) => file.storage_path);
  await deleteManagedFiles(storagePaths);

  const deleteResult = await supabase.from("submissions").delete().eq("id", input.submissionId);
  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  revalidatePath("/maariduna/student");
  revalidatePath("/maariduna/teacher");
  revalidatePath("/maariduna/visitors");
  revalidatePath(`/maariduna/submissions/${input.submissionId}`);
}

export async function uploadSubmissionFiles(input: {
  submissionId: string;
  files: Array<{
    file: File;
    originalName: string;
  }>;
}) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const uploadedStoragePaths: string[] = [];
  const insertedFileIds: string[] = [];
  const storagePrefix = await getSubmissionStoragePrefix(input.submissionId);

  try {
    for (const item of input.files) {
      const storagePath = buildManagedStoragePath(input.submissionId, item.file.name, {
        prefix: storagePrefix ?? undefined
      });
      const uploadTarget = await prepareManagedUpload({
        storagePath,
        contentType: item.file.type || "application/octet-stream"
      });
      const fileBytes = item.file;

      if (uploadTarget.provider === "r2") {
        const response = await fetch(uploadTarget.uploadUrl!, {
          method: "PUT",
          headers: uploadTarget.uploadHeaders,
          body: fileBytes
        });

        if (!response.ok) {
          throw new Error(`فشل رفع الملف ${item.originalName}.`);
        }
      } else {
        const uploadResult = await supabase.storage.from(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "student-submissions").uploadToSignedUrl(
          uploadTarget.storagePath,
          uploadTarget.token!,
          fileBytes,
          {
            contentType: item.file.type || "application/octet-stream"
          }
        );

        if (uploadResult.error) {
          throw new Error(uploadResult.error.message);
        }
      }

      uploadedStoragePaths.push(storagePath);

      const fileId = await registerUploadedFile({
        submissionId: input.submissionId,
        name: item.originalName,
        sizeBytes: item.file.size,
        storagePath
      });

      insertedFileIds.push(fileId);
    }

    await markSubmissionSubmitted(input.submissionId);
    revalidatePath("/maariduna/student");
    revalidatePath("/maariduna/teacher");
    revalidatePath("/maariduna/visitors");
    revalidatePath(`/maariduna/submissions/${input.submissionId}`);

    return uploadedStoragePaths;
  } catch (error) {
    await cleanupFailedUpload(supabase, input.submissionId, insertedFileIds, uploadedStoragePaths);
    throw error;
  }
}

export async function applyReviewUpdate(input: ReviewUpdateInput) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const updateResult = await supabase
    .from("submissions")
    .update({
      status: input.status,
      grade: input.grade,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.submissionId);

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  if (input.comment && input.comment.trim().length > 0) {
    const commentResult = await supabase.from("review_comments").insert({
      submission_id: input.submissionId,
      teacher_id: input.teacherId,
      content: input.comment.trim()
    });

    if (commentResult.error) {
      throw new Error(commentResult.error.message);
    }
  }

  revalidatePath("/maariduna/teacher");
  revalidatePath("/maariduna/visitors");
  revalidatePath(`/maariduna/submissions/${input.submissionId}`);
}
