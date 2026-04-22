import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { deleteSubmission, deleteSubmissionFile } from "@/lib/live-actions";
import { createServerSupabaseClient } from "@/lib/supabase";

async function resolveOwnedSubmission(studentUserId: string, submissionId: string) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return {
      ok: false as const,
      status: 500,
      error: "إعدادات الخادم لـ Supabase غير مكتملة."
    };
  }

  const profileResult = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", studentUserId)
    .maybeSingle();

  if (profileResult.error) {
    return {
      ok: false as const,
      status: 500,
      error: profileResult.error.message
    };
  }

  if (!profileResult.data?.id) {
    return {
      ok: false as const,
      status: 400,
      error: "لا يوجد ملف طالب مرتبط بهذا الحساب."
    };
  }

  const submissionResult = await supabase
    .from("submissions")
    .select("id")
    .eq("id", submissionId)
    .eq("student_profile_id", profileResult.data.id)
    .maybeSingle();

  if (submissionResult.error) {
    return {
      ok: false as const,
      status: 500,
      error: submissionResult.error.message
    };
  }

  if (!submissionResult.data?.id) {
    return {
      ok: false as const,
      status: 403,
      error: "هذا التسليم لا يخص هذا الطالب."
    };
  }

  return {
    ok: true as const
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "غير مصرح لك بهذا الإجراء." }, { status: 403 });
    }

    const body = await request.json();
    const action = String(body.action ?? "");
    const submissionId = String(body.submissionId ?? "");

    if (!submissionId) {
      return NextResponse.json({ ok: false, error: "تعذر تحديد التسليم المطلوب." }, { status: 400 });
    }

    const ownership = await resolveOwnedSubmission(session.userId, submissionId);
    if (!ownership.ok) {
      return NextResponse.json({ ok: false, error: ownership.error }, { status: ownership.status });
    }

    if (action === "delete-file") {
      const fileId = String(body.fileId ?? "");
      if (!fileId) {
        return NextResponse.json({ ok: false, error: "تعذر تحديد الملف المطلوب." }, { status: 400 });
      }

      await deleteSubmissionFile({
        submissionId,
        fileId
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "delete-submission") {
      await deleteSubmission({
        submissionId
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "طلب غير معروف." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
