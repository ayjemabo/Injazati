"use client";

import { FormEvent, useMemo, useState } from "react";
import { createBrowserSupabaseClient, hasPublicSupabaseEnv } from "@/lib/supabase";

export function LoginPanel() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("استخدم حساب المدرسة للدخول عند ربط بيانات Supabase.");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setMessage("أضف مفاتيح Supabase أولاً داخل ملف .env لتفعيل تسجيل الدخول الحقيقي.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setLoading(false);

    if (error) {
      setMessage(`تعذر تسجيل الدخول: ${error.message}`);
      return;
    }

    setMessage("تم تسجيل الدخول بنجاح. يمكن الآن ربط التوجيه حسب الدور من الجلسة الفعلية.");
  }

  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>دخول المدرسة</h2>
          <p>واجهة دخول حقيقية جاهزة للعمل عند تفعيل Supabase Auth بحسابات المدرسة.</p>
        </div>
        <span className="pill">{hasPublicSupabaseEnv ? "Auth مفعل" : "بانتظار الإعداد"}</span>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span className="helper-copy">البريد المدرسي</span>
          <input
            className="text-input"
            dir="ltr"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@balad-alameen.edu"
          />
        </label>
        <label>
          <span className="helper-copy">كلمة المرور</span>
          <input
            className="text-input"
            dir="ltr"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </label>
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </button>
      </form>

      <p className="helper-copy" style={{ marginTop: 14 }}>
        {message}
      </p>
    </section>
  );
}
