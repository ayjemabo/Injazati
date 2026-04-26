import Link from "next/link";
import { notFound } from "next/navigation";
import { ChineseFileTypeButtons } from "@/components/chinese-file-type-buttons";
import { ReviewPanel } from "@/components/review-panel";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { StudentSubmissionActions } from "@/components/student-submission-actions";
import { getAppSession } from "@/lib/auth";
import { getSubmissionView } from "@/lib/dashboard";
import { formatDate, getSubjectLabel } from "@/lib/format";
import {
  MAARIDUNA_HOME_PATH,
  MAARIDUNA_STUDENT_PATH,
  MAARIDUNA_TEACHER_PATH
} from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function SubmissionDetailsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAppSession();
  const data = await getSubmissionView(id);

  if (!data) {
    notFound();
  }

  const canView =
    session?.role === "admin" ||
    session?.role === "visitor" ||
    (session?.role === "teacher" && data.assignedTeacherIds.includes(session.userId)) ||
    (session?.role === "student" && session.userId === data.student.id);
  const isStudentOwner = session?.role === "student" && session.userId === data.student.id;
  const canReview =
    session?.role === "admin" || (session?.role === "teacher" && data.assignedTeacherIds.includes(session.userId));

  if (!canView) {
    return (
      <Shell
        title="تفاصيل التسليم"
        subtitle="يجب تسجيل الدخول بالحساب الصحيح لعرض هذه الصفحة."
      >
        <section className="card">
          <div className="section-head">
            <div>
              <h2>غير مصرح بالوصول</h2>
              <p>هذه الصفحة متاحة للطالب نفسه أو للمعلم أو للمشرف.</p>
            </div>
          </div>
          <div className="inline-actions">
            <Link className="primary-button" href={MAARIDUNA_HOME_PATH}>
              العودة إلى الرئيسية
            </Link>
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell
      title={`تفاصيل تسليم ${data.student.displayName}`}
      subtitle="عرض موحد للملفات، حالة التسليم، ملاحظات المعلم، والدرجة الحالية مع بنية جاهزة للربط مع التخزين السحابي والمعاينة."
    >
      <section className="grid-3">
        <article className="summary-card">
          <div>
            <p className="summary-label">الطالب</p>
            <strong className="summary-value">{data.student.displayName}</strong>
            <p className="summary-hint">{data.student.email}</p>
          </div>
        </article>
        <article className="summary-card">
          <div>
            <p className="summary-label">الجولة</p>
            <strong className="summary-value">{data.round.title}</strong>
            <p className="summary-hint">{`${getSubjectLabel(data.round.subject)} • ${data.classSection.gradeLabel}`}</p>
          </div>
        </article>
        <article className="summary-card">
          <div>
            <p className="summary-label">الحالة الحالية</p>
            <div style={{ marginTop: 8 }}>
              <StatusBadge status={data.submission.status} />
            </div>
            <p className="summary-hint">الدرجة: {data.submission.grade ?? "غير مرصودة"}</p>
          </div>
        </article>
      </section>

      <section className="grid-2" style={{ marginTop: 18 }}>
        <article className="card">
          <div className="section-head">
            <div>
              <h2>الملفات المرفقة</h2>
              <p>تدعم الصفحة معاينة PDF وربط التنزيل من التخزين السحابي لاحقاً.</p>
            </div>
          </div>
          <ul className="list-reset">
            {data.files.map((file) => (
              <li className="file-row" key={file.id}>
                <div>
                  <strong>{file.name}</strong>
                  <div className="helper-copy">
                    {file.kind.toUpperCase()} - {file.sizeLabel}
                  </div>
                  {canReview && data.round.subject === "chinese" ? (
                    <ChineseFileTypeButtons
                      defaultType={file.chineseFileType}
                      fileId={file.id}
                      submissionId={data.submission.id}
                    />
                  ) : null}
                </div>
                <div className="inline-actions">
                  {file.previewUrl ? (
                    <a className="secondary-button" href={file.previewUrl} target="_blank" rel="noreferrer">
                      معاينة
                    </a>
                  ) : null}
                  {file.downloadUrl ? (
                    <a className="secondary-button" href={file.downloadUrl}>
                      تنزيل
                    </a>
                  ) : (
                    <button className="secondary-button" type="button" disabled>
                      غير متاح
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>تعليقات المعلم</h2>
              <p>كل تعليق مرتبط بزمن المراجعة ويظهر للطالب داخل الصفحة. مصدر البيانات: {data.source === "supabase" ? "Supabase" : "mock"}.</p>
            </div>
          </div>
          <div className="submission-grid">
            {data.comments.length === 0 ? (
              <p className="empty-state">لا توجد تعليقات حالياً.</p>
            ) : (
              data.comments.map((comment) => (
                <div className="comment-box" key={comment.id}>
                  <strong>{comment.teacherName}</strong>
                  <div className="helper-copy">{formatDate(comment.createdAt)}</div>
                  <p>{comment.content}</p>
                </div>
              ))
            )}
          </div>

          <div className="card" style={{ marginTop: 18, padding: 18 }}>
            <div className="section-head">
              <div>
                <h3>إجراءات المراجعة</h3>
                <p>عناصر واجهة جاهزة للربط مع تحديثات الحالة والدرجة الفعلية.</p>
              </div>
            </div>
            {canReview ? (
              <ReviewPanel
                submissionId={data.submission.id}
                defaultStatus={data.submission.status}
                defaultGrade={data.submission.grade}
              />
            ) : (
              <p className="helper-copy">هذه الصفحة للعرض فقط في حساب الطالب أو الزائر. التعديل متاح للمعلم أو المشرف فقط.</p>
            )}
          </div>
        </article>
      </section>

      {isStudentOwner ? (
        <StudentSubmissionActions
          files={data.files.map((file) => ({ id: file.id, name: file.name }))}
          submissionId={data.submission.id}
        />
      ) : null}

      <div className="inline-actions" style={{ marginTop: 18 }}>
        <Link className="ghost-link" href={MAARIDUNA_TEACHER_PATH}>
          العودة إلى لوحة المعلم
        </Link>
        <Link className="ghost-link" href={MAARIDUNA_STUDENT_PATH}>
          العودة إلى مساحة الطالب
        </Link>
      </div>
    </Shell>
  );
}
