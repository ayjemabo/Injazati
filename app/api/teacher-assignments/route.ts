import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { SubmissionSubject } from "@/lib/types";

const allowedSubjects: SubmissionSubject[] = ["art", "chinese"];
type TeacherAssignmentInput = {
  classSectionId: string;
  subject: SubmissionSubject;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session || session.role !== "teacher") {
      return NextResponse.json({ ok: false, error: "غير مصرح لك بتعديل الشعب." }, { status: 403 });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "إعدادات الخادم لـ Supabase غير مكتملة." }, { status: 500 });
    }

    const body = await request.json();
    const rawAssignments = Array.isArray(body.assignments) ? body.assignments : [];
    const assignments: TeacherAssignmentInput[] = rawAssignments
      .map((item: unknown) => {
        const record = item as Record<string, unknown>;
        return {
          classSectionId: String(record.classSectionId ?? ""),
          subject: String(record.subject ?? "") as SubmissionSubject
        };
      })
      .filter(
        (assignment: TeacherAssignmentInput) =>
          assignment.classSectionId.length > 0 && allowedSubjects.includes(assignment.subject)
      );

    const teacherResult = await supabase
      .from("profiles")
      .select("id")
      .eq("id", session.userId)
      .eq("role", "teacher")
      .maybeSingle();

    if (teacherResult.error) {
      return NextResponse.json({ ok: false, error: teacherResult.error.message }, { status: 500 });
    }

    if (!teacherResult.data?.id) {
      return NextResponse.json({ ok: false, error: "لم يتم العثور على حساب المعلم." }, { status: 404 });
    }

    const teacherId = teacherResult.data.id;
    const validClassIds = Array.from(new Set(assignments.map((assignment: TeacherAssignmentInput) => assignment.classSectionId)));
    if (validClassIds.length > 0) {
      const classSectionsResult = await supabase.from("class_sections").select("id").in("id", validClassIds);
      if (classSectionsResult.error) {
        return NextResponse.json({ ok: false, error: classSectionsResult.error.message }, { status: 500 });
      }

      const existingClassIds = new Set((classSectionsResult.data ?? []).map((item) => item.id));
      if (validClassIds.some((id) => !existingClassIds.has(id))) {
        return NextResponse.json({ ok: false, error: "بعض الشعب المحددة غير موجودة." }, { status: 400 });
      }
    }

    const deleteResult = await supabase
      .from("teacher_assignments")
      .delete()
      .eq("teacher_id", teacherId);

    if (deleteResult.error) {
      return NextResponse.json({ ok: false, error: deleteResult.error.message }, { status: 500 });
    }

    if (assignments.length > 0) {
      const uniqueAssignments = Array.from(
        new Map(
          assignments.map((assignment) => [
            `${assignment.subject}:${assignment.classSectionId}`,
            {
              teacher_id: teacherId,
              class_section_id: assignment.classSectionId,
              subject: assignment.subject
            }
          ])
        ).values()
      );

      const insertResult = await supabase.from("teacher_assignments").insert(uniqueAssignments);
      if (insertResult.error) {
        return NextResponse.json({ ok: false, error: insertResult.error.message }, { status: 500 });
      }
    }

    revalidatePath("/maariduna/teacher");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
