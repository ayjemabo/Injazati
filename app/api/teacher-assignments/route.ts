import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session || session.role !== "teacher") {
      return NextResponse.json({ ok: false, error: "غير مصرح لك بتعديل الشعب." }, { status: 403 });
    }

    await request.json().catch(() => null);
    return NextResponse.json(
      { ok: false, error: "تعديل الشعب يتم الآن من الإدارة أو قاعدة البيانات فقط." },
      { status: 403 }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
