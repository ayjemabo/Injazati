"use client";

import { useRef, useState } from "react";
import { createBrowserSupabaseClient, hasPublicSupabaseEnv } from "@/lib/supabase";

interface UploadPanelProps {
  submissionId?: string;
  roundId: string;
}

type DirectoryInput = HTMLInputElement & {
  directory?: boolean;
  webkitdirectory?: boolean;
};

function getDisplayName(file: File) {
  return file.webkitRelativePath || file.name;
}

export function UploadPanel({ submissionId, roundId }: UploadPanelProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("اختر الملفات ثم اضغط رفع الملفات.");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const directoryInputRef = useRef<DirectoryInput | null>(null);

  function setDirectoryPicker(node: HTMLInputElement | null) {
    if (!node) {
      directoryInputRef.current = null;
      return;
    }

    const directoryNode = node as DirectoryInput;
    directoryNode.webkitdirectory = true;
    directoryNode.directory = true;
    directoryNode.multiple = true;
    directoryInputRef.current = directoryNode;
  }

  async function uploadFiles() {
    if (files.length === 0) {
      setMessage("لا توجد ملفات مختارة للرفع.");
      return;
    }

    setUploading(true);

    const prepareResponse = await fetch("/api/submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "prepare",
        roundId,
        submissionId,
        files: files.map((file) => ({
          clientName: file.name,
          originalName: getDisplayName(file),
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size
        }))
      })
    });

    const preparePayload = await prepareResponse.json();
    if (!prepareResponse.ok) {
      setUploading(false);
      setMessage(preparePayload.error ?? "فشل تجهيز الرفع.");
      return;
    }

    const preparedUploads = Array.isArray(preparePayload.uploads) ? preparePayload.uploads : [];
    const confirmedSubmissionId = String(preparePayload.submissionId ?? submissionId ?? "");
    const uploadedStoragePaths: string[] = [];
    let supabaseClient = null as ReturnType<typeof createBrowserSupabaseClient>;

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const upload = preparedUploads[index];

        if (!upload?.storagePath || !upload?.provider) {
          throw new Error("بيانات الرفع غير مكتملة.");
        }

        if (upload.provider === "r2") {
          if (!upload.uploadUrl) {
            throw new Error("رابط رفع Cloudflare R2 غير مكتمل.");
          }

          const uploadResponse = await fetch(upload.uploadUrl, {
            method: "PUT",
            headers: upload.uploadHeaders ?? {
              "Content-Type": file.type || "application/octet-stream"
            },
            body: file
          });

          if (!uploadResponse.ok) {
            throw new Error(`فشل رفع الملف ${getDisplayName(file)}.`);
          }
        } else {
          if (!hasPublicSupabaseEnv) {
            throw new Error("الرفع عبر Supabase يحتاج مفاتيح عامة مكتملة أو تفعيل R2.");
          }

          supabaseClient ??= createBrowserSupabaseClient();
          if (!supabaseClient) {
            throw new Error("تعذر الاتصال بخدمة التخزين.");
          }

          const uploadResult = await supabaseClient.storage
            .from(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "student-submissions")
            .uploadToSignedUrl(upload.storagePath, upload.token, file, {
              contentType: file.type || "application/octet-stream"
            });

          if (uploadResult.error) {
            throw new Error(uploadResult.error.message || `فشل رفع الملف ${getDisplayName(file)}.`);
          }
        }

        uploadedStoragePaths.push(upload.storagePath);
      }

      const finalizeResponse = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "finalize",
          roundId,
          submissionId: confirmedSubmissionId,
          files: files.map((file, index) => ({
            originalName: getDisplayName(file),
            sizeBytes: file.size,
            storagePath: uploadedStoragePaths[index]
          }))
        })
      });

      const finalizePayload = await finalizeResponse.json();
      if (!finalizeResponse.ok) {
        throw new Error(finalizePayload.error ?? "فشل اعتماد الملفات بعد الرفع.");
      }
    } catch (error) {
      if (confirmedSubmissionId && uploadedStoragePaths.length > 0) {
        await fetch("/api/submissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "cleanup",
            submissionId: confirmedSubmissionId,
            storagePaths: uploadedStoragePaths
          })
        });
      }

      setUploading(false);
      setMessage(error instanceof Error ? error.message : "فشل رفع الملفات.");
      return;
    }

    setUploading(false);
    setMessage(`تم رفع ${files.length} ملف/ملفات وإرسال التسليم بنجاح.`);
    setFiles([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (directoryInputRef.current) {
      directoryInputRef.current.value = "";
    }
  }

  function handleSelectedFiles(selected: FileList | null) {
    const nextFiles = Array.from(selected ?? []);
    setFiles(nextFiles);

    if (nextFiles.length === 0) {
      setMessage("لا توجد ملفات مختارة للرفع.");
      return;
    }

    const hasFolders = nextFiles.some((file) => file.webkitRelativePath);
    setMessage(
      hasFolders
        ? `تم اختيار ${nextFiles.length} ملف من مجلد واحد أو أكثر.`
        : `تم اختيار ${nextFiles.length} ملف.`
    );
  }

  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>رفع الملفات</h2>
          <p>يمكنك رفع ملفات منفصلة أو اختيار مجلد كامل، بما فيه PDF و ZIP والصور وأي ملفات أخرى.</p>
        </div>
        <span className="pill">رفع مباشر</span>
      </div>

      <div className="upload-dropzone">
        <strong>اختر الطريقة المناسبة</strong>
        <span>إذا كانت أعمالك داخل مجلد كامل، استخدم اختيار المجلد. إذا كانت منفصلة، استخدم اختيار الملفات.</span>
        <div className="inline-actions">
          <button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()}>
            اختيار الملفات
          </button>
          <button className="secondary-button" type="button" onClick={() => directoryInputRef.current?.click()}>
            اختيار مجلد كامل
          </button>
        </div>
        <input
          ref={fileInputRef}
          aria-label="رفع ملفات المعرض"
          className="sr-only"
          type="file"
          multiple
          onChange={(event) => handleSelectedFiles(event.target.files)}
        />
        <input
          ref={setDirectoryPicker}
          aria-label="رفع مجلد المعرض"
          className="sr-only"
          type="file"
          multiple
          onChange={(event) => handleSelectedFiles(event.target.files)}
        />
      </div>

      <div className="file-stack">
        {files.length === 0 ? (
          <p className="empty-state">لم يتم اختيار ملفات بعد. سيظهر هنا ملخص الملفات المرفوعة.</p>
        ) : (
          files.map((file) => (
            <div className="file-row" key={`${getDisplayName(file)}-${file.lastModified}`}>
              <span>{getDisplayName(file)}</span>
              <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
          ))
        )}
      </div>

      <div className="inline-actions">
        <button className="primary-button" onClick={uploadFiles} disabled={uploading} type="button">
          {uploading ? "جاري الرفع..." : "رفع الملفات"}
        </button>
      </div>

      <p className="helper-copy" style={{ marginTop: 12 }}>
        {message}
      </p>
    </section>
  );
}
