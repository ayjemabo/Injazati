import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth";
import { canTeacherAccessSubmission, getSubmissionView } from "@/lib/dashboard";
import { downloadSubmissionFile } from "@/lib/live-actions";

function buildContentDisposition(filename: string) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiFallback || "download"}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string; fileId: string }>;
  }
) {
  try {
    const { id, fileId } = await context.params;
    const session = await getAppSession();
    const data = await getSubmissionView(id);

    if (!data) {
      return NextResponse.json({ ok: false, error: "التسليم غير موجود." }, { status: 404 });
    }

    const canView =
      session?.role === "admin" ||
      session?.role === "visitor" ||
      (session?.role === "teacher" && (await canTeacherAccessSubmission(session.userId, id))) ||
      (session?.role === "student" && session.userId === data.student.id);

    if (!canView) {
      return NextResponse.json({ ok: false, error: "غير مصرح لك بتنزيل هذا الملف." }, { status: 403 });
    }

    const file = data.files.find((item) => item.id === fileId);
    if (!file) {
      return NextResponse.json({ ok: false, error: "الملف غير موجود." }, { status: 404 });
    }

    const filePayload = await downloadSubmissionFile({
      storagePath: file.storagePath
    });
    const buffer = Buffer.from(filePayload.bytes);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": filePayload.contentType || "application/octet-stream",
        "Content-Disposition": buildContentDisposition(file.name),
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
