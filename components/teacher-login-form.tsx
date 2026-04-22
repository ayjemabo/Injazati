"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MAARIDUNA_TEACHER_PATH } from "@/lib/routes";

interface TeacherLoginFormProps {
  showDemoHelp: boolean;
  demoCredentials?: Array<{
    name: string;
    username?: string | null;
    password: string;
  }>;
}

export function TeacherLoginForm({ showDemoHelp, demoCredentials = [] }: TeacherLoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("أدخل اسم المستخدم وكلمة المرور ثم اضغط دخول المعلم.");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const response = await fetch("/api/teacher-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "تعذر تسجيل الدخول.");
      return;
    }

    router.push(MAARIDUNA_TEACHER_PATH);
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>دخول المعلم</h2>
          <p>اسم مستخدم وكلمة مرور.</p>
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
          {loading ? "جاري الدخول..." : "دخول المعلم"}
        </button>
      </form>

      <p className="helper-copy" style={{ marginTop: 14 }}>
        {message}
      </p>

      {showDemoHelp ? (
        <div className="card" style={{ marginTop: 16, padding: 18 }}>
          <h3 style={{ marginTop: 0 }}>بيانات تجريبية للمعلمين</h3>
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
