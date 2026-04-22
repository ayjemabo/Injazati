import {
  classSections,
  reviewComments,
  studentProfiles,
  submissionFiles,
  submissionRounds,
  submissions,
  teacherAssignments,
  users
} from "@/lib/mock-data";
import { ensureMinimumLiveData } from "@/lib/bootstrap";
import { createServerSupabaseClient, getSupabaseMode } from "@/lib/supabase";
import type {
  ClassSection,
  ReviewComment,
  StudentProfile,
  Submission,
  SubmissionFile,
  SubmissionRound,
  SubmissionSubject,
  TeacherAssignment,
  User
} from "@/lib/types";

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  username: string | null;
  role: User["role"];
};

type ClassSectionRow = {
  id: string;
  name: string;
  grade_label: string;
};

type StudentProfileRow = {
  id: string;
  user_id: string;
  class_section_id: string | null;
  student_code: string;
};

type TeacherAssignmentRow = {
  id: string;
  teacher_id: string;
  class_section_id: string;
  subject?: string | null;
};

type SubmissionRoundRow = {
  id: string;
  title: string;
  subject?: string | null;
  due_date: string;
  is_open: boolean;
};

type SubmissionRow = {
  id: string;
  student_profile_id: string;
  round_id: string;
  status: Submission["status"];
  grade: number | null;
  submitted_at: string | null;
  updated_at: string;
};

type SubmissionFileRow = {
  id: string;
  submission_id: string;
  name: string;
  kind: SubmissionFile["kind"];
  size_bytes: number;
  storage_path: string;
  created_at: string;
};

type ReviewCommentRow = {
  id: string;
  submission_id: string;
  teacher_id: string;
  content: string;
  created_at: string;
};

type Dataset = {
  users: User[];
  classSections: ClassSection[];
  studentProfiles: StudentProfile[];
  teacherAssignments: TeacherAssignment[];
  submissionRounds: SubmissionRound[];
  submissions: Submission[];
  submissionFiles: SubmissionFile[];
  reviewComments: ReviewComment[];
  source: "mock" | "supabase";
};

function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    username: row.username,
    role: row.role
  };
}

function mapClassSection(row: ClassSectionRow): ClassSection {
  return {
    id: row.id,
    name: row.name,
    gradeLabel: row.grade_label
  };
}

function mapStudentProfile(row: StudentProfileRow): StudentProfile {
  return {
    id: row.id,
    userId: row.user_id,
    classSectionId: row.class_section_id,
    studentCode: row.student_code
  };
}

function mapTeacherAssignment(row: TeacherAssignmentRow): TeacherAssignment {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    classSectionId: row.class_section_id,
    subject: normalizeSubject(row.subject)
  };
}

function normalizeSubject(subject?: string | null): SubmissionSubject {
  return subject === "chinese" ? "chinese" : "art";
}

function mapSubmissionRound(row: SubmissionRoundRow): SubmissionRound {
  return {
    id: row.id,
    title: row.title,
    subject: normalizeSubject(row.subject),
    dueDate: row.due_date,
    isOpen: row.is_open
  };
}

function mapSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    studentProfileId: row.student_profile_id,
    roundId: row.round_id,
    status: row.status,
    grade: row.grade,
    submittedAt: row.submitted_at ?? row.updated_at,
    updatedAt: row.updated_at
  };
}

function mapSubmissionFile(row: SubmissionFileRow): SubmissionFile {
  const sizeMb = row.size_bytes / (1024 * 1024);

  return {
    id: row.id,
    submissionId: row.submission_id,
    name: row.name,
    kind: row.kind,
    sizeLabel: `${sizeMb.toFixed(1)} MB`,
    storagePath: row.storage_path,
    uploadedAt: row.created_at
  };
}

function mapReviewComment(row: ReviewCommentRow, userMap: Map<string, User>): ReviewComment {
  return {
    id: row.id,
    submissionId: row.submission_id,
    teacherId: row.teacher_id,
    teacherName: userMap.get(row.teacher_id)?.displayName ?? "معلم",
    content: row.content,
    createdAt: row.created_at
  };
}

function getMockDataset(): Dataset {
  return {
    users,
    classSections,
    studentProfiles,
    teacherAssignments,
    submissionRounds,
    submissions,
    submissionFiles,
    reviewComments,
    source: "mock"
  };
}

async function getSupabaseDataset(): Promise<Dataset | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return null;
  }

  await ensureMinimumLiveData();

  const [
    profilesResult,
    classSectionsResult,
    studentProfilesResult,
    teacherAssignmentsResult,
    roundsResult,
    submissionsResult,
    filesResult,
    commentsResult
  ] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name, username, role").order("created_at"),
    supabase.from("class_sections").select("id, name, grade_label").order("grade_label"),
    supabase.from("student_profiles").select("id, user_id, class_section_id, student_code"),
    supabase.from("teacher_assignments").select("*"),
    supabase.from("submission_rounds").select("*").order("due_date"),
    supabase
      .from("submissions")
      .select("id, student_profile_id, round_id, status, grade, submitted_at, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("submission_files")
      .select("id, submission_id, name, kind, size_bytes, storage_path, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("review_comments")
      .select("id, submission_id, teacher_id, content, created_at")
      .order("created_at", { ascending: false })
  ]);

  const results = [
    profilesResult,
    classSectionsResult,
    studentProfilesResult,
    teacherAssignmentsResult,
    roundsResult,
    submissionsResult,
    filesResult,
    commentsResult
  ];

  if (results.some((result) => result.error)) {
    return null;
  }

  const mappedUsers = (profilesResult.data ?? []).map(mapProfile);
  const userMap = new Map(mappedUsers.map((user) => [user.id, user]));

  return {
    users: mappedUsers,
    classSections: (classSectionsResult.data ?? []).map(mapClassSection),
    studentProfiles: (studentProfilesResult.data ?? []).map(mapStudentProfile),
    teacherAssignments: (teacherAssignmentsResult.data ?? []).map(mapTeacherAssignment),
    submissionRounds: (roundsResult.data ?? []).map(mapSubmissionRound),
    submissions: (submissionsResult.data ?? []).map(mapSubmission),
    submissionFiles: (filesResult.data ?? []).map(mapSubmissionFile),
    reviewComments: (commentsResult.data ?? []).map((comment) => mapReviewComment(comment, userMap)),
    source: "supabase"
  };
}

export async function getDataset(): Promise<Dataset> {
  const source = getSupabaseMode();
  if (source !== "live") {
    return getMockDataset();
  }

  return (await getSupabaseDataset()) ?? getMockDataset();
}
