"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { INJAZATI_HOME_PATH, MAARIDUNA_HOME_PATH } from "@/lib/routes";

const tabs = [
  { href: INJAZATI_HOME_PATH, label: "إنجازاتي" },
  { href: MAARIDUNA_HOME_PATH, label: "معارضنا" }
];

export function AppSwitcher() {
  const pathname = usePathname();

  return (
    <header className="app-switcher">
      <nav className="app-switcher__nav" aria-label="التبديل بين التطبيقات">
        {tabs.map((tab) => {
          const active =
            tab.href === INJAZATI_HOME_PATH
              ? pathname === INJAZATI_HOME_PATH
              : pathname === MAARIDUNA_HOME_PATH || pathname.startsWith(`${MAARIDUNA_HOME_PATH}/`);

          return (
            <Link
              key={tab.href}
              className={`app-switcher__link${active ? " app-switcher__link--active" : ""}`}
              href={tab.href}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
