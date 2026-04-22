import Link from "next/link";
import type { ReactNode } from "react";
import {
  MAARIDUNA_HOME_PATH,
  MAARIDUNA_STUDENT_PATH,
  MAARIDUNA_TEACHER_PATH,
  MAARIDUNA_VISITOR_PATH
} from "@/lib/routes";

interface ShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const links = [
  { href: MAARIDUNA_HOME_PATH, label: "الرئيسية" },
  { href: MAARIDUNA_STUDENT_PATH, label: "الطالب" },
  { href: MAARIDUNA_TEACHER_PATH, label: "المعلم" },
  { href: MAARIDUNA_VISITOR_PATH, label: "الزوار" }
];

export function Shell({ title, subtitle, children }: ShellProps) {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <div className="brand-mark">معارضنا</div>
          <p className="brand-copy">منصة تنظيم وتسليم المعارض الفنية لمدرسة البلد الأمين</p>
        </div>
        <nav className="nav-grid" aria-label="التنقل الرئيسي">
          {links.map((link) => (
            <Link key={link.href} className="nav-link" href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <section className="hero-card">
        <span className="eyebrow">واجهة عربية RTL</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </section>

      <main>{children}</main>
    </div>
  );
}
