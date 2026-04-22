import { createPasswordHash } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { SubmissionSubject } from "@/lib/types";

const defaultTeacher = {
  email: "art.teacher@balad-alameen.edu",
  display_name: "وليد",
  username: "waleed1",
  password_hash: createPasswordHash("12345"),
  role: "teacher" as const
};

function getOffsetDueDate(days: number) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate.toISOString().slice(0, 10);
}

const defaultRounds: Array<{
  title: string;
  subject: SubmissionSubject;
  dueDate: string;
  isOpen: boolean;
}> = [
  {
    title: "معرض الفنية الحالي",
    subject: "art",
    dueDate: getOffsetDueDate(7),
    isOpen: true
  },
  {
    title: "مشروع الصيني الحالي",
    subject: "chinese",
    dueDate: getOffsetDueDate(10),
    isOpen: true
  },
  {
    title: "مشروع الرياضيات الحالي",
    subject: "math",
    dueDate: getOffsetDueDate(12),
    isOpen: true
  }
];

async function insertRound(
  supabase: NonNullable<ReturnType<typeof createServerSupabaseClient>>,
  round: {
    title: string;
    subject: SubmissionSubject;
    dueDate: string;
    isOpen: boolean;
  }
) {
  const withSubject = await supabase.from("submission_rounds").insert({
    title: round.title,
    subject: round.subject,
    due_date: round.dueDate,
    is_open: round.isOpen
  });

  if (!withSubject.error) {
    return;
  }

  if (!withSubject.error.message.toLowerCase().includes("subject")) {
    throw new Error(withSubject.error.message);
  }

  const fallback = await supabase.from("submission_rounds").insert({
    title: round.title,
    due_date: round.dueDate,
    is_open: round.isOpen
  });

  if (fallback.error) {
    throw new Error(fallback.error.message);
  }
}

export async function ensureMinimumLiveData() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return;
  }

  const [teacherResult, roundResult] = await Promise.all([
    supabase.from("profiles").select("id").eq("role", "teacher").limit(1),
    supabase.from("submission_rounds").select("*").limit(20)
  ]);

  if (!teacherResult.data?.length) {
    await supabase.from("profiles").upsert(defaultTeacher, {
      onConflict: "email"
    });
  }

  const rounds = roundResult.data ?? [];

  if (!rounds.length) {
    for (const round of defaultRounds) {
      await insertRound(supabase, round);
    }
    return;
  }

  const hasSubjectColumn = rounds.some((round) => Object.prototype.hasOwnProperty.call(round, "subject"));

  if (hasSubjectColumn) {
    const existingSubjects = new Set(rounds.map((round) => {
      if (round.subject === "chinese") {
        return "chinese";
      }

      if (round.subject === "math") {
        return "math";
      }

      return "art";
    }));

    for (const round of defaultRounds) {
      if (!existingSubjects.has(round.subject)) {
        await insertRound(supabase, round);
      }
    }
  }
}
