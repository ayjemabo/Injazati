"use client";

import { useMemo, useState } from "react";
import type { ClassSection, SubmissionSubject, TeacherAssignment } from "@/lib/types";
import { getSubjectLabel } from "@/lib/format";

interface TeacherAssignmentControlsProps {
  classSections: ClassSection[];
  initialAssignments: TeacherAssignment[];
}

const subjects: SubmissionSubject[] = ["art", "chinese", "math"];

function getKey(subject: SubmissionSubject, classSectionId: string) {
  return `${subject}:${classSectionId}`;
}

export function TeacherAssignmentControls({
  classSections,
  initialAssignments
}: TeacherAssignmentControlsProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    initialAssignments.map((assignment) => getKey(assignment.subject, assignment.classSectionId))
  );
  const [message, setMessage] = useState("حدد الشعب التي تدرّسها لكل مادة ثم احفظ التغييرات.");
  const [saving, setSaving] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  function toggleAssignment(subject: SubmissionSubject, classSectionId: string) {
    const key = getKey(subject, classSectionId);
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  async function saveAssignments() {
    setSaving(true);
    setMessage("جاري حفظ التعديلات...");

    const assignments = selectedKeys.map((key) => {
      const [subject, classSectionId] = key.split(":");
      return {
        subject: subject as SubmissionSubject,
        classSectionId
      };
    });

    const response = await fetch("/api/teacher-assignments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ assignments })
    });

    const payload = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(payload.error ?? "تعذر حفظ الشعب المسندة.");
      return;
    }

    setMessage("تم تحديث المواد والشعب الخاصة بحساب المعلم.");
  }

  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>التحكم في الشعب</h2>
          <p>اختر الشعب التي تدرّسها في كل مادة. هذه التحديدات تتحكم في ما يظهر لك داخل لوحة المعلم.</p>
        </div>
      </div>

      <div className="grid-2">
        {subjects.map((subject) => (
          <article className="card" key={subject} style={{ padding: 18 }}>
            <div className="section-head">
              <div>
                <h3>{`مادة ${getSubjectLabel(subject)}`}</h3>
                <p>فعّل الشعب التي تريد متابعتها في هذه المادة.</p>
              </div>
            </div>
            <div className="submission-grid">
              {classSections.map((classSection) => {
                const key = getKey(subject, classSection.id);
                const checked = selectedSet.has(key);

                return (
                  <label
                    key={key}
                    className="file-row"
                    style={{ cursor: "pointer", alignItems: "center", gap: 12 }}
                  >
                    <input
                      checked={checked}
                      onChange={() => toggleAssignment(subject, classSection.id)}
                      type="checkbox"
                    />
                    <div>
                      <strong>{classSection.name}</strong>
                      <div className="helper-copy">{classSection.gradeLabel}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <div className="inline-actions" style={{ marginTop: 18 }}>
        <button className="primary-button" disabled={saving} onClick={saveAssignments} type="button">
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </div>

      <p className="helper-copy" style={{ marginTop: 12 }}>
        {message}
      </p>
    </section>
  );
}
