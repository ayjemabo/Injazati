import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { SummaryCard } from "@/components/summary-card";
import { getAppSession } from "@/lib/auth";
import { getTeacherDashboard } from "@/lib/dashboard";
import { formatDate, getSubjectLabel } from "@/lib/format";
import { MAARIDUNA_HOME_PATH, maaridunaSubmissionPath } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function VisitorPage() {
  const session = await getAppSession();
  if (!session || session.role !== "visitor") {
    return (
      <Shell
        title="صفحة الزوار"
        subtitle="تحتاج إلى تسجيل دخول الزائر أولاً لعرض الأعمال."
      >
        <section className="card">
          <div className="section-head">
            <div>
              <h2>تسجيل دخول مطلوب</h2>
              <p>ارجع إلى الرئيسية ثم أدخل بيانات الزوار لفتح العرض فقط.</p>
            </div>
          </div>
          <Link className="primary-button" href={MAARIDUNA_HOME_PATH}>
            العودة إلى الرئيسية
          </Link>
        </section>
      </Shell>
    );
  }

  const { cards } = await getTeacherDashboard();
  const subjects = Array.from(new Set(cards.map((card) => card.round.subject)));

  return (
    <Shell
      title="لوحة الزوار"
      subtitle="عرض جميع تسليمات الطلاب مع صلاحية مشاهدة فقط بدون أي تعديل أو تقييم."
    >
      <section className="grid-3">
        <SummaryCard label="الحساب" value="زائر" hint="قراءة فقط" icon="👀" />
        <SummaryCard label="المواد" value={subjects.length} hint={subjects.map((subject) => getSubjectLabel(subject)).join("، ") || "لا توجد مواد"} icon="📚" />
        <SummaryCard label="التسليمات الظاهرة" value={cards.length} hint="كل أعمال الطلاب المتاحة للعرض" icon="📂" />
        <SummaryCard
          label="بانتظار الاعتماد"
          value={cards.filter((card) => card.submission.status !== "approved").length}
          hint="للعرض فقط"
          icon="📝"
        />
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2>عرض الزوار</h2>
            <p>يمكنك استعراض جميع التسليمات وفتح تفاصيلها، لكن لا يمكنك تغيير الحالة أو الدرجة.</p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <section className="table-card">
        <div className="section-head">
          <div>
            <h2>كل التسليمات</h2>
            <p>الجدول يوضح الطالب، الجولة، الحالة، والدرجة الحالية دون أدوات تعديل.</p>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>الطالبة</th>
              <th>المادة</th>
              <th>الجولة</th>
              <th>الحالة</th>
              <th>الدرجة</th>
              <th>آخر تحديث</th>
              <th>التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <tr key={card.submission.id}>
                <td>
                  <strong>{card.student.displayName}</strong>
                  <div className="helper-copy">{card.student.email}</div>
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
                    عرض التفاصيل
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Shell>
  );
}
