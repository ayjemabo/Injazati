import Link from "next/link";
import { Shell } from "@/components/shell";
import { SummaryCard } from "@/components/summary-card";
import { StudentLoginForm } from "@/components/student-login-form";
import { TeacherLoginForm } from "@/components/teacher-login-form";
import { VisitorLoginForm } from "@/components/visitor-login-form";
import { getDataset } from "@/lib/data";
import { getDemoStudentCredentials, getDemoTeacherCredentials } from "@/lib/student-auth";
import { MAARIDUNA_STUDENT_PATH, MAARIDUNA_TEACHER_PATH, MAARIDUNA_VISITOR_PATH } from "@/lib/routes";
import { getSubjectLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dataset = await getDataset();
  const showDemoHelp = false;
  const subjects = Array.from(new Set(dataset.submissionRounds.map((round) => round.subject)));

  return (
    <Shell
      title="منصة معارضنا"
      subtitle="مكان بسيط وواضح لرفع ملفات المعرض ومراجعتها داخل مدرسة البلد الأمين، مع جولات مستقلة لكل مادة."
    >
      <section className="grid-3">
        <SummaryCard label="عدد الطلاب" value={dataset.users.filter((user) => user.role === "student").length} hint="طلاب مفعلون في النظام" icon="👩‍🎨" />
        <SummaryCard label="المواد" value={subjects.length} hint={subjects.map((subject) => getSubjectLabel(subject)).join("، ")} icon="📚" />
        <SummaryCard label="الجولات" value={dataset.submissionRounds.length} hint="جولات مستقلة لكل مادة" icon="🗂️" />
        <SummaryCard label="المعلمون" value={dataset.users.filter((user) => user.role === "teacher").length} hint="معلم واحد يكفي للمتابعة الآن" icon="🧑‍🏫" />
      </section>

      <section className="grid-2" style={{ marginTop: 18 }}>
        <article className="card">
          <div className="section-head">
            <div>
              <h2>كيف تستخدم المنصة؟</h2>
              <p>المنصة بسيطة: الطالب يرفع ملفاته، والمعلم يراجعها من شاشة واحدة.</p>
            </div>
          </div>
          <div className="simple-steps">
            <div className="step-card">
              <strong>1. الطالب</strong>
              <p>ينشئ حسابه مرة واحدة مع المرحلة والسنة والفصل، ثم يسجل الدخول لاحقاً باسم المستخدم وكلمة المرور فقط.</p>
            </div>
            <div className="step-card">
              <strong>2. المادة والجولة</strong>
              <p>كل مادة لها جولات مستقلة. حالياً المواد المتاحة: الفنية والصيني.</p>
            </div>
            <div className="step-card">
              <strong>3. المعلم والزائر</strong>
              <p>المعلم يراجع ويقيّم، والزائر يشاهد جميع الأعمال بدون أي تعديل.</p>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>اختر الصفحة</h2>
              <p>اختر الصفحة المناسبة ثم ابدأ مباشرة.</p>
            </div>
          </div>
          <div className="simple-steps">
            <Link className="role-card role-student" href={MAARIDUNA_STUDENT_PATH}>
              <strong>صفحة الطالب</strong>
              <span>رفع الملفات بخطوات بسيطة</span>
            </Link>
            <Link className="role-card role-teacher" href={MAARIDUNA_TEACHER_PATH}>
              <strong>صفحة المعلم</strong>
              <span>مراجعة الأعمال وإضافة الدرجات</span>
            </Link>
            <Link className="role-card role-admin" href={MAARIDUNA_VISITOR_PATH}>
              <strong>صفحة الزوار</strong>
              <span>عرض جميع الأعمال بدون صلاحية تعديل</span>
            </Link>
          </div>
        </article>
      </section>

      <section className="grid-3" style={{ marginTop: 18 }}>
        <div>
          <StudentLoginForm showDemoHelp={showDemoHelp} demoCredentials={getDemoStudentCredentials()} />
        </div>
        <TeacherLoginForm showDemoHelp={showDemoHelp} demoCredentials={getDemoTeacherCredentials()} />
        <VisitorLoginForm />
      </section>
    </Shell>
  );
}
