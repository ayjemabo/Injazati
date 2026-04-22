"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MAARIDUNA_VISITOR_PATH } from "@/lib/routes";

export function VisitorLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("أدخل بيانات الزائر لعرض جميع التسليمات بدون صلاحية تعديل.");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const response = await fetch("/api/visitor-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "تعذر تسجيل الدخول كزائر.");
      return;
    }

    router.push(MAARIDUNA_VISITOR_PATH);
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>دخول الزوار</h2>
          <p>عرض كل أعمال الطلاب مع صلاحية مشاهدة فقط.</p>
        </div>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span className="helper-copy">اسم المستخدم</span>
          <input className="text-input" dir="ltr" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
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
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "جاري الدخول..." : "دخول الزوار"}
        </button>
      </form>

      <p className="helper-copy" style={{ marginTop: 14 }}>
        {message}
      </p>
    </section>
  );
}
