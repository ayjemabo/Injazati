"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MAARIDUNA_STUDENT_PATH } from "@/lib/routes";

interface StudentLoginFormProps {
  showDemoHelp: boolean;
  demoCredentials?: Array<{
    name: string;
    username?: string | null;
    password: string;
  }>;
}

const arabicDigitMap: Record<string, string> = {
  "0": "٠",
  "1": "١",
  "2": "٢",
  "3": "٣",
  "4": "٤",
  "5": "٥",
  "6": "٦",
  "7": "٧",
  "8": "٨",
  "9": "٩"
};

function toArabicDigits(value: string) {
  return value.replace(/[0-9]/g, (digit) => arabicDigitMap[digit] ?? digit);
}

export function StudentLoginForm({ showDemoHelp, demoCredentials = [] }: StudentLoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [level, setLevel] = useState("");
  const [gradeYear, setGradeYear] = useState("");
  const [gradeClass, setGradeClass] = useState("");
  const [message, setMessage] = useState("أدخل اسم المستخدم وكلمة المرور ثم اضغط دخول الطالب.");
  const [loading, setLoading] = useState(false);

  const yearOptions = level === "ابتدائي" ? ["1", "2", "3", "4", "5", "6"] : ["1", "2", "3"];
  const yearLabels: Record<string, string> = {
    "1": "أول",
    "2": "ثاني",
    "3": "ثالث",
    "4": "رابع",
    "5": "خامس",
    "6": "سادس"
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    if (mode === "signup" && username.includes("@")) {
      setLoading(false);
      setMessage("أدخل اسمك الثلاثي الحقيقي باللغة العربية.");
      return;
    }

    if (mode === "signup" && (!level || !gradeYear || !gradeClass)) {
      setLoading(false);
      setMessage("أدخل المرحلة والسنة والفصل قبل إنشاء الحساب.");
      return;
    }

    const response = await fetch(mode === "login" ? "/api/student-login" : "/api/student-signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password, level, gradeYear, gradeClass })
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "تعذر تسجيل الدخول.");
      return;
    }

    router.push(MAARIDUNA_STUDENT_PATH);
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>دخول الطالب</h2>
          <p>عند إنشاء الحساب فقط أضف المرحلة والسنة والفصل. أما الدخول فيحتاج اسم المستخدم وكلمة المرور فقط.</p>
        </div>
      </div>

      <div className="inline-actions" style={{ marginBottom: 14 }}>
        <button className={mode === "login" ? "primary-button" : "secondary-button"} type="button" onClick={() => setMode("login")}>
          دخول
        </button>
        <button className={mode === "signup" ? "primary-button" : "secondary-button"} type="button" onClick={() => setMode("signup")}>
          إنشاء حساب
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span className="helper-copy">اسم المستخدم</span>
          <input className="text-input" dir="ltr" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        {mode === "signup" ? (
          <p className="helper-copy" style={{ margin: "-4px 0 0" }}>
            استخدم اسمك الحقيقي حتى يعرفك المعلمون.
          </p>
        ) : null}
        <label>
          <span className="helper-copy">كلمة المرور</span>
          <input
            className="text-input"
            dir="ltr"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {mode === "signup" ? (
          <>
            <label>
              <span className="helper-copy">المرحلة</span>
              <select
                className="text-input"
                value={level}
                onChange={(event) => {
                  setLevel(event.target.value);
                  setGradeYear("");
                  setGradeClass("");
                }}
              >
                <option value="">اختر المرحلة</option>
                <option value="ابتدائي">ابتدائي</option>
                <option value="متوسط">متوسط</option>
                <option value="ثانوي">ثانوي</option>
              </select>
            </label>
            <div className="grid-2">
              <label>
                <span className="helper-copy">السنة</span>
                <select className="text-input" value={gradeYear} onChange={(event) => setGradeYear(event.target.value)} disabled={!level}>
                  <option value="">السنة</option>
                  {yearOptions.map((option) => (
                    <option key={option} value={option}>
                      {yearLabels[option]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="helper-copy">الفصل</span>
                <select className="text-input" value={gradeClass} onChange={(event) => setGradeClass(event.target.value)} disabled={!level}>
                  <option value="">الفصل</option>
                  {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((option) => (
                    <option key={option} value={option}>
                      {toArabicDigits(option)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="helper-copy" style={{ margin: "-4px 0 0" }}>
              نفس حقول إنجازاتي: مرحلة، سنة، فصل. مثال: أول / ٣ أو ثاني / ٢.
            </p>
          </>
        ) : null}
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "جاري التنفيذ..." : mode === "login" ? "دخول الطالب" : "إنشاء الحساب"}
        </button>
      </form>

      <p className="helper-copy" style={{ marginTop: 14 }}>
        {message}
      </p>

      {showDemoHelp ? (
        <div className="card" style={{ marginTop: 16, padding: 18 }}>
          <h3 style={{ marginTop: 0 }}>بيانات تجريبية</h3>
          <div className="simple-steps">
            {demoCredentials.map((item) => (
              <div className="step-card" key={item.username}>
                <strong>{item.name}</strong>
                <p>اسم المستخدم: {item.username}</p>
                <p>كلمة المرور: {item.password}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
