import Link from "next/link";
import type { User } from "@/lib/types";

interface AccountPickerProps {
  title: string;
  users: User[];
  basePath: string;
  emptyText: string;
}

export function AccountPicker({ title, users, basePath, emptyText }: AccountPickerProps) {
  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          <p>اختر الاسم ثم افتح الصفحة مباشرة.</p>
        </div>
      </div>

      {users.length === 0 ? (
        <p className="empty-state">{emptyText}</p>
      ) : (
        <div className="simple-steps">
          {users.map((user) => (
            <Link key={user.id} className="role-card" href={`${basePath}?user=${user.id}`}>
              <strong>{user.displayName}</strong>
              <span>{user.email}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
