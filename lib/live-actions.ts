import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase";

const storageBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "student-submissions";

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

function getSafeStoragePath(submissionId: string, name: string) {
  const extension = name.includes(".") ? `.${name.split(".").pop()?.toLowerCase()}` : "";
  return `${submissionId}/${Date.now()}-${crypto.randomUUID()}${extension}`;
}

export async function prepareSubmissionUploads(input: UploadPreparationInput) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const uploads = [];

  for (const file of input.files) {
    const storagePath = getSafeStoragePath(input.submissionId, file.clientName || file.originalName);
    const signedUpload = await supabase.storage.from(storageBucket).createSignedUploadUrl(storagePath);

    if (signedUpload.error || !signedUpload.data?.token) {
      throw new Error(signedUpload.error?.message ?? "تعذر تجهيز رابط الرفع.");
    }

    uploads.push({
      storagePath,
      token: signedUpload.data.token,
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

  if (storagePaths.length > 0) {
    await supabase.storage.from(storageBucket).remove(storagePaths);
  }

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
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase server environment is not configured.");
  }

  const result = await supabase.storage.from(storageBucket).download(input.storagePath);
  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "تعذر تنزيل الملف.");
  }

  return result.data;
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

  const storageDeleteResult = await supabase.storage.from(storageBucket).remove([fileResult.data.storage_path]);
  if (storageDeleteResult.error) {
    throw new Error(storageDeleteResult.error.message);
  }

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
  if (storagePaths.length > 0) {
    const storageDeleteResult = await supabase.storage.from(storageBucket).remove(storagePaths);
    if (storageDeleteResult.error) {
      throw new Error(storageDeleteResult.error.message);
    }
  }

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

  try {
    for (const item of input.files) {
      const storagePath = getSafeStoragePath(input.submissionId, item.file.name);
      const fileBytes = new Uint8Array(await item.file.arrayBuffer());
      const uploadResult = await supabase.storage.from(storageBucket).upload(storagePath, fileBytes, {
        upsert: true,
        contentType: item.file.type || "application/octet-stream"
      });

      if (uploadResult.error) {
        throw new Error(uploadResult.error.message);
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
