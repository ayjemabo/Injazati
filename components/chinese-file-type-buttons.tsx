"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getChineseFileTypeLabel } from "@/lib/chinese-file-type";
import type { ChineseFileType } from "@/lib/types";

interface ChineseFileTypeButtonsProps {
  defaultType?: ChineseFileType | null;
  fileId: string;
  submissionId: string;
}

export function ChineseFileTypeButtons({
  defaultType = null,
  fileId,
  submissionId
}: ChineseFileTypeButtonsProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ChineseFileType | null>(defaultType);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveType(nextType: ChineseFileType) {
    const nextSelectedType = selectedType === nextType ? null : nextType;
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/chinese-file-types", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        submissionId,
        fileId,
        chineseFileType: nextSelectedType
      })
    });
    const payload = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(payload.error ?? "تعذر حفظ نوع الملف.");
      return;
    }

    setSelectedType(nextSelectedType);
    setMessage("تم الحفظ.");
    router.refresh();
  }

  return (
    <div style={{ marginTop: 10 }}>
      <span className="helper-copy">نوع الملف</span>
      <div className="inline-actions" style={{ marginTop: 8 }}>
        {(["solution", "model"] as ChineseFileType[]).map((type) => (
          <button
            className={selectedType === type ? "primary-button" : "secondary-button"}
            disabled={saving}
            key={type}
            onClick={() => saveType(type)}
            type="button"
          >
            {getChineseFileTypeLabel(type)}
          </button>
        ))}
      </div>
      {message ? (
        <p className="helper-copy" style={{ marginTop: 6 }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
