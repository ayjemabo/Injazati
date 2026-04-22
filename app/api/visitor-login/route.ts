import { NextRequest, NextResponse } from "next/server";
import { createVisitorSession } from "@/lib/auth";
import { authenticateVisitor } from "@/lib/student-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "");
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "أدخل اسم المستخدم وكلمة المرور." }, { status: 400 });
    }

    const result = await authenticateVisitor(username, password);
    if (!result) {
      return NextResponse.json({ ok: false, error: "اسم المستخدم أو كلمة المرور غير صحيح." }, { status: 401 });
    }

    await createVisitorSession(result.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
