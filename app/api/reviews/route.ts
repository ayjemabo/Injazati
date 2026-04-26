import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth";
import { canTeacherAccessSubmission } from "@/lib/dashboard";
import { applyReviewUpdate } from "@/lib/live-actions";

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session || (session.role !== "teacher" && session.role !== "admin")) {
      return NextResponse.json({ ok: false, error: "غير مصرح لك بحفظ المراجعة." }, { status: 403 });
    }

    const body = await request.json();

    if (session.role === "teacher") {
      const canReview = await canTeacherAccessSubmission(session.userId, String(body.submissionId ?? ""));
      if (!canReview) {
        return NextResponse.json({ ok: false, error: "غير مصرح لك بمراجعة هذا التسليم." }, { status: 403 });
      }
    }

    await applyReviewUpdate({
      submissionId: body.submissionId,
      teacherId: session.userId,
      status: body.status,
      grade: body.grade === "" || body.grade === null ? null : Number(body.grade),
      comment: body.comment
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
