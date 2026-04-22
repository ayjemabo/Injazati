import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { SummaryCard } from "@/components/summary-card";
import { TeacherAssignmentControls } from "@/components/teacher-assignment-controls";
import { getAppSession } from "@/lib/auth";
import { getDataset } from "@/lib/data";
import { getTeacherDashboard } from "@/lib/dashboard";
import { formatDate, getSubjectLabel } from "@/lib/format";
import {
  MAARIDUNA_HOME_PATH,
  maaridunaSubmissionPath
} from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function TeacherPage({
  searchParams
}: {
  searchParams?: Promise<{ tab?: string; classId?: string; name?: string }>;
}) {
  const session = await getAppSession();
  if (!session || session.role !== "teacher") {
    return (
      <Shell
        title="صفحة المعلم"
        subtitle="تحتاج إلى تسجيل دخول المعلم أولاً."
      >
        <section className="card">
          <div className="section-head">
            <div>
              <h2>تسجيل دخول مطلوب</h2>
              <p>ارجع إلى الرئيسية وسجّل دخول المعلم باسم المستخدم وكلمة المرور.</p>
            </div>
          </div>
          <Link className="primary-button" href={MAARIDUNA_HOME_PATH}>
            العودة إلى الرئيسية
          </Link>
        </section>
      </Shell>
    );
  }

  const params = await searchParams;
  const activeTab = params?.tab === "controls" ? "controls" : "submissions";
  const selectedClassId = String(params?.classId ?? "").trim();
  const nameQuery = String(params?.name ?? "").trim();
  const { teacher, cards } = await getTeacherDashboard(session.userId);
  const dataset = await getDataset();
  const filteredCards = selectedClassId && selectedClassId !== "all"
    ? cards.filter((card) => card.classSection.id === selectedClassId)
    : cards;
  const teacherAssignments = dataset.teacherAssignments.filter((assignment) => assignment.teacherId === session.userId);
  const teacherClassSections = dataset.classSections.filter((classSection) =>
    teacherAssignments.some((assignment) => assignment.classSectionId === classSection.id)
  );
  const visibleCards = nameQuery
    ? filteredCards.filter((card) => {
        const query = nameQuery.toLowerCase();
        return (
          card.student.displayName.toLowerCase().includes(query) ||
          card.student.email.toLowerCase().includes(query)
        );
      })
    : filteredCards;
  const subjects = Array.from(new Set(visibleCards.map((card) => card.round.subject)));

  if (!teacher) {
    return (
      <Shell
        title="صفحة المعلم"
        subtitle="هذا الحساب غير مرتبط ببيانات معلم صالحة بعد."
      >
        <section className="card">
          <div className="section-head">
            <div>
              <h2>لا توجد بيانات معلم</h2>
              <p>تحقق من وجود حساب المعلم وتعييناته داخل قاعدة البيانات.</p>
            </div>
          </div>
          <Link className="primary-button" href={MAARIDUNA_HOME_PATH}>
            العودة إلى الرئيسية
          </Link>
        </section>
      </Shell>
    );
  }

  return (
    <Shell
      title={`لوحة المعلم: ${teacher.displayName}`}
      subtitle="مراجعة مباشرة لكل أعمال الطلاب من شاشة واحدة، بدون تعقيد الشعب أو التوزيع."
    >
      <section className="grid-3">
        <SummaryCard label="المعلم" value={teacher.displayName} hint={teacher.username ?? "حساب المعلم"} icon="🧑‍🏫" />
        <SummaryCard label="المواد" value={subjects.length} hint={subjects.map((subject) => getSubjectLabel(subject)).join("، ") || "لا توجد مواد"} icon="📚" />
        <SummaryCard label="التسليمات الظاهرة" value={visibleCards.length} hint="كل ما رفعه الطلاب يظهر هنا مباشرة" icon="📂" />
        <SummaryCard
          label="بحاجة لتدخل"
          value={visibleCards.filter((card) => card.submission.status !== "approved").length}
          hint="مراجعة أو تعديل أو تقييم"
          icon="🔎"
        />
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2>تبويبات المعلم</h2>
            <p>بدّل بين متابعة التسليمات والتحكم في الشعب التي تدرّسها.</p>
          </div>
          <div className="inline-actions">
            <Link className={activeTab === "submissions" ? "primary-button" : "secondary-button"} href="/maariduna/teacher?tab=submissions">
              التسليمات
            </Link>
            <Link className={activeTab === "controls" ? "primary-button" : "secondary-button"} href="/maariduna/teacher?tab=controls">
              التحكم
            </Link>
            <LogoutButton />
          </div>
        </div>
      </section>

      {activeTab === "controls" ? (
        <TeacherAssignmentControls
          classSections={dataset.classSections}
          initialAssignments={teacherAssignments}
        />
      ) : (
        <>
          <section className="card">
            <div className="section-head">
              <div>
                <h2>فلاتر الواجهة</h2>
                <p>اختر الفصل من القائمة وابحث بالأسماء داخل التسليمات الظاهرة.</p>
              </div>
            </div>
            <form action="/maariduna/teacher" className="grid-auto">
              <input name="tab" type="hidden" value="submissions" />
              <label>
                <span className="helper-copy">الفصل</span>
                <select className="secondary-button" defaultValue={selectedClassId || "all"} name="classId">
                  <option value="all">كل الفصول</option>
                  {teacherClassSections.map((classSection) => (
                    <option key={classSection.id} value={classSection.id}>
                      {`${classSection.gradeLabel} - ${classSection.name}`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="helper-copy">بحث بالأسماء</span>
                <input
                  className="secondary-button"
                  defaultValue={nameQuery}
                  name="name"
                  placeholder="ابحث عن الطالبة"
                />
              </label>
              <div className="inline-actions" style={{ alignItems: "end" }}>
                <button className="primary-button" type="submit">
                  بحث
                </button>
                <Link className="secondary-button" href="/maariduna/teacher?tab=submissions">
                  مسح
                </Link>
              </div>
            </form>
          </section>

          <section className="table-card">
            <div className="section-head">
              <div>
                <h2>التسليمات الحالية</h2>
                <p>الجدول يوضح الطالب، الفصل، الجولة، حالة التسليم، والدرجة الحالية.</p>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>الطالبة</th>
                  <th>فصل</th>
                  <th>المادة</th>
                  <th>الجولة</th>
                  <th>الحالة</th>
                  <th>الدرجة</th>
                  <th>آخر تحديث</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {visibleCards.map((card) => (
                  <tr key={card.submission.id}>
                    <td>
                      <strong>{card.student.displayName}</strong>
                      <div className="helper-copy">{card.student.email}</div>
                    </td>
                    <td>
                      <strong>{card.classSection.name}</strong>
                      <div className="helper-copy">{card.classSection.gradeLabel}</div>
                    </td>
                    <td>{getSubjectLabel(card.round.subject)}</td>
                    <td>{card.round.title}</td>
                    <td>
                      <StatusBadge status={card.submission.status} />
                    </td>
                    <td>{card.submission.grade ?? "لم ترصد"}</td>
                    <td>{formatDate(card.submission.updatedAt)}</td>
                    <td>
                      <Link className="ghost-link" href={maaridunaSubmissionPath(card.submission.id)}>
                        مراجعة التفاصيل
                      </Link>
                    </td>
                  </tr>
                ))}
                {visibleCards.length === 0 ? (
                  <tr>
                    <td className="helper-copy" colSpan={8}>
                      لا توجد تسليمات مطابقة للفلاتر الحالية.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      )}
    </Shell>
  );
}
