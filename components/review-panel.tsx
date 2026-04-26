"use client";

import { FormEvent, useState } from "react";
import { getChineseFileTypeLabel } from "@/lib/chinese-file-type";
import type { ChineseFileType, SubmissionStatus, SubmissionSubject } from "@/lib/types";

interface ReviewPanelProps {
  defaultChineseFileType?: ChineseFileType | null;
  submissionId: string;
  defaultStatus: SubmissionStatus;
  defaultGrade: number | null;
  subject: SubmissionSubject;
}

export function ReviewPanel({
  defaultChineseFileType = null,
  submissionId,
  defaultStatus,
  defaultGrade,
  subject
}: ReviewPanelProps) {
  const [status, setStatus] = useState<SubmissionStatus>(defaultStatus);
  const [grade, setGrade] = useState(defaultGrade?.toString() ?? "");
  const [comment, setComment] = useState("");
  const [chineseFileType, setChineseFileType] = useState<ChineseFileType | null>(defaultChineseFileType);
  const [message, setMessage] = useState("يمكنك تحديث الحالة والدرجة وإضافة تعليق جديد.");
  const [saving, setSaving] = useState(false);
  const isChineseSubmission = subject === "chinese";

  function toggleChineseFileType(nextType: ChineseFileType) {
    setChineseFileType((current) => (current === nextType ? null : nextType));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        submissionId,
        status,
        grade,
        comment,
        chineseFileType: isChineseSubmission ? chineseFileType : undefined
      })
    });

    const payload = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(payload.error ?? "تعذر حفظ المراجعة.");
      return;
    }

    setComment("");
    setMessage("تم حفظ المراجعة بنجاح. حدّث الصفحة لرؤية البيانات الجديدة إذا لزم.");
  }

  return (
    <form className="grid-auto" onSubmit={handleSubmit}>
      <select className="secondary-button" value={status} onChange={(event) => setStatus(event.target.value as SubmissionStatus)}>
        <option value="submitted">مُرسل</option>
        <option value="under_review">قيد المراجعة</option>
        <option value="needs_revision">يحتاج تعديل</option>
        <option value="approved">معتمد</option>
      </select>
      <input
        className="text-input"
        value={grade}
        onChange={(event) => setGrade(event.target.value)}
        placeholder="أدخل الدرجة"
      />
      {isChineseSubmission ? (
        <div>
          <span className="helper-copy">نوع ملف الصيني</span>
          <div className="inline-actions" style={{ marginTop: 8 }}>
            {(["solution", "model"] as ChineseFileType[]).map((type) => (
              <button
                className={chineseFileType === type ? "primary-button" : "secondary-button"}
                key={type}
                onClick={() => toggleChineseFileType(type)}
                type="button"
              >
                {getChineseFileTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <textarea
        className="text-input"
        rows={4}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="أضف تعليقاً جديداً للطالب"
      />
      <button className="primary-button" disabled={saving} type="submit">
        {saving ? "جاري الحفظ..." : "حفظ التقييم"}
      </button>
      <p className="helper-copy">{message}</p>
    </form>
  );
}
