import { createServerSupabaseClient } from "@/lib/supabase";
import { ensureMinimumLiveData } from "@/lib/bootstrap";
import { createPasswordHash, verifyPassword } from "@/lib/auth";
import { users } from "@/lib/mock-data";
import { randomUUID } from "crypto";

type StudentAuthRow = {
  id: string;
  username: string | null;
  password_hash: string | null;
  role: "student" | "teacher" | "admin" | "visitor";
};

type StudentPlacementInput = {
  level: string;
  gradeYear: string;
  gradeClass: string;
};

const gradeYearLabels: Record<string, string> = {
  "1": "أول",
  "2": "ثاني",
  "3": "ثالث",
  "4": "رابع",
  "5": "خامس",
  "6": "سادس"
};

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

function toEnglishDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

async function authenticateByRole(username: string, password: string, role: StudentAuthRow["role"]) {
  const normalized = username.trim().toLowerCase();
  const supabase = createServerSupabaseClient();

  if (supabase) {
    if (role === "teacher" || role === "admin") {
      await ensureMinimumLiveData();
    }

    const result = await supabase
      .from("profiles")
      .select("id, username, password_hash, role")
      .eq("username", normalized)
      .maybeSingle<StudentAuthRow>();

    if (result.error) {
      throw new Error(result.error.message);
    }

    if (!result.data || result.data.role !== role || !result.data.password_hash) {
      return null;
    }

    if (!verifyPassword(password, result.data.password_hash)) {
      return null;
    }

    return { userId: result.data.id };
  }

  const demoMap: Record<StudentAuthRow["role"], Record<string, { id: string; password: string }>> = {
    student: {
      sara101: { id: "student-1", password: "12345678" },
      reem202: { id: "student-2", password: "12345678" },
      lama303: { id: "student-3", password: "12345678" }
    },
    teacher: {
      waleed1: { id: "teacher-1", password: "12345" },
      hanaa1: { id: "teacher-2", password: "12345" }
    },
    admin: {
      admin: { id: "admin-1", password: "12345" }
    },
    visitor: {
      zuwwar1: { id: "visitor-1", password: "zuwwars" }
    }
  };

  const match = demoMap[role][normalized];
  if (!match || match.password !== password) {
    return null;
  }

  return { userId: match.id };
}

export async function authenticateStudent(username: string, password: string) {
  return authenticateByRole(username, password, "student");
}

export async function authenticateTeacher(username: string, password: string) {
  return authenticateByRole(username, password, "teacher");
}

export async function authenticateVisitor(username: string, password: string) {
  const normalized = username.trim().toLowerCase();
  if (normalized === "zuwwar1" && password === "zuwwars") {
    return { userId: "visitor-1" };
  }

  return null;
}

async function resolveClassSectionId(
  placement: StudentPlacementInput,
  supabase: NonNullable<ReturnType<typeof createServerSupabaseClient>>
) {
  const yearLabel = gradeYearLabels[placement.gradeYear];
  if (!placement.level || !yearLabel || !placement.gradeClass) {
    throw new Error("أدخل المرحلة والسنة والفصل قبل إنشاء الحساب.");
  }

  const normalizedClass = toArabicDigits(placement.gradeClass.trim());
  const englishClass = toEnglishDigits(normalizedClass);
  const className = `${yearLabel} / ${normalizedClass}`;
  const gradeLabel = `${placement.level} - ${yearLabel}`;
  const existing = await supabase
    .from("class_sections")
    .select("id, name")
    .in("name", [className, `${yearLabel} / ${englishClass}`])
    .eq("grade_label", gradeLabel)
    .limit(2);

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  const matchedSection = existing.data?.find((row) => row.name === className) ?? existing.data?.[0];
  if (matchedSection?.id) {
    return matchedSection.id;
  }

  const created = await supabase
    .from("class_sections")
    .insert({
      name: className,
      grade_label: gradeLabel
    })
    .select("id")
    .single();

  if (created.error || !created.data?.id) {
    throw new Error(created.error?.message ?? "تعذر إنشاء الشعبة.");
  }

  return created.data.id;
}

export async function registerStudent(username: string, password: string, placement: StudentPlacementInput) {
  const normalized = username.trim().toLowerCase();
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("التسجيل الذاتي يحتاج اتصال Supabase فعلي.");
  }

  if (!normalized || password.length < 6) {
    throw new Error("أدخل اسم مستخدم صالحاً وكلمة مرور من 6 أحرف على الأقل.");
  }

  const existing = await supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data?.id) {
    throw new Error("اسم المستخدم مستخدم بالفعل.");
  }

  const classSectionId = await resolveClassSectionId(placement, supabase);
  const userId = randomUUID();
  const profileInsert = await supabase.from("profiles").insert({
    id: userId,
    email: `${normalized}@students.maariduna.local`,
    display_name: normalized,
    username: normalized,
    password_hash: createPasswordHash(password),
    role: "student"
  });

  if (profileInsert.error) {
    throw new Error(profileInsert.error.message);
  }

  const studentProfileInsert = await supabase.from("student_profiles").insert({
    user_id: userId,
    class_section_id: classSectionId,
    student_code: `STU-${Date.now()}`
  });

  if (studentProfileInsert.error) {
    throw new Error(studentProfileInsert.error.message);
  }

  return { userId };
}

export function getDemoStudentCredentials() {
  return users
    .filter((user) => user.role === "student")
    .map((user) => ({
      name: user.displayName,
      username: user.username,
      password: "12345678"
    }));
}

export function getDemoTeacherCredentials() {
  return users
    .filter((user) => user.role === "teacher")
    .map((user) => ({
      name: user.displayName,
      username: user.username,
      password: "12345"
    }));
}

export function buildPasswordHashForSql(password: string) {
  return createPasswordHash(password);
}
