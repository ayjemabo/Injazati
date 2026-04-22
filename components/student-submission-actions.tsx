"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface StudentSubmissionActionsProps {
  submissionId: string;
  files: Array<{
    id: string;
    name: string;
  }>;
}

export function StudentSubmissionActions({
  submissionId,
  files
}: StudentSubmissionActionsProps) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState("يمكنك حذف ملف منفرد أو حذف التسليم بالكامل.");

  async function deleteFile(fileId: string, fileName: string) {
    const confirmed = window.confirm(`هل تريد حذف الملف "${fileName}"؟`);
    if (!confirmed) {
      return;
    }

    setBusyKey(`file:${fileId}`);
    const response = await fetch("/api/student-submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "delete-file",
        submissionId,
        fileId
      })
    });

    const payload = await response.json();
    setBusyKey(null);

    if (!response.ok) {
      setMessage(payload.error ?? "تعذر حذف الملف.");
      return;
    }

    setMessage("تم حذف الملف.");
    router.refresh();
  }

  async function deleteWholeSubmission() {
    const confirmed = window.confirm("هل تريد حذف هذا التسليم بالكامل؟ سيتم حذف كل الملفات والتعليقات المرتبطة به.");
    if (!confirmed) {
      return;
    }

    setBusyKey("submission");
    const response = await fetch("/api/student-submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "delete-submission",
        submissionId
      })
    });

    const payload = await response.json();
    setBusyKey(null);

    if (!response.ok) {
      setMessage(payload.error ?? "تعذر حذف التسليم.");
      return;
    }

    router.push("/maariduna/student");
    router.refresh();
  }

  return (
    <section className="card" style={{ marginTop: 18 }}>
      <div className="section-head">
        <div>
          <h2>إدارة التسليم</h2>
          <p>هذه الخيارات متاحة للطالبة صاحبة التسليم فقط.</p>
        </div>
      </div>

      <div className="submission-grid">
        {files.map((file) => (
          <div className="file-row" key={file.id}>
            <span>{file.name}</span>
            <button
              className="secondary-button"
              disabled={busyKey !== null}
              onClick={() => deleteFile(file.id, file.name)}
              type="button"
            >
              {busyKey === `file:${file.id}` ? "جاري الحذف..." : "حذف الملف"}
            </button>
          </div>
        ))}
      </div>

      <div className="inline-actions" style={{ marginTop: 18 }}>
        <button
          className="secondary-button"
          disabled={busyKey !== null}
          onClick={deleteWholeSubmission}
          type="button"
        >
          {busyKey === "submission" ? "جاري حذف التسليم..." : "حذف التسليم بالكامل"}
        </button>
      </div>

      <p className="helper-copy" style={{ marginTop: 12 }}>
        {message}
      </p>
    </section>
  );
}
