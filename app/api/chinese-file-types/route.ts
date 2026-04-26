import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth";
import { normalizeChineseFileType } from "@/lib/chinese-file-type";
import { canTeacherAccessSubmission } from "@/lib/dashboard";
import { applyChineseFileTypeUpdate } from "@/lib/live-actions";

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session || (session.role !== "teacher" && session.role !== "admin")) {
      return NextResponse.json({ ok: false, error: "غير مصرح لك بتحديد نوع الملف." }, { status: 403 });
    }

    const body = await request.json();
    const submissionId = String(body.submissionId ?? "");
    const fileId = String(body.fileId ?? "");
    const chineseFileType = normalizeChineseFileType(body.chineseFileType);

    if (!submissionId || !fileId || chineseFileType === undefined) {
      return NextResponse.json({ ok: false, error: "بيانات نوع الملف غير صالحة." }, { status: 400 });
    }

    if (session.role === "teacher" && !await canTeacherAccessSubmission(session.userId, submissionId)) {
      return NextResponse.json({ ok: false, error: "غير مصرح لك بتعديل هذا التسليم." }, { status: 403 });
    }

    await applyChineseFileTypeUpdate({
      submissionId,
      fileId,
      chineseFileType,
      teacherId: session.userId
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
