"use client";

import { FormEvent, useState } from "react";
import type { SubmissionStatus } from "@/lib/types";

interface ReviewPanelProps {
  submissionId: string;
  defaultStatus: SubmissionStatus;
  defaultGrade: number | null;
}

export function ReviewPanel({
  submissionId,
  defaultStatus,
  defaultGrade
}: ReviewPanelProps) {
  const [status, setStatus] = useState<SubmissionStatus>(defaultStatus);
  const [grade, setGrade] = useState(defaultGrade?.toString() ?? "");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("يمكنك تحديث الحالة والدرجة وإضافة تعليق جديد.");
  const [saving, setSaving] = useState(false);

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
        comment
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
