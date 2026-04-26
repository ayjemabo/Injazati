export type UserRole = "student" | "teacher" | "admin" | "visitor";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_revision"
  | "approved";

export type FileKind = "zip" | "pdf" | "image" | "document";
export type SubmissionSubject = "art" | "chinese" | "math";
export type ChineseFileType = "solution" | "model";

export interface User {
  id: string;
  email: string;
  displayName: string;
  username?: string | null;
  role: UserRole;
}

export interface ClassSection {
  id: string;
  name: string;
  gradeLabel: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  classSectionId: string | null;
  studentCode: string;
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  classSectionId: string;
  subject: SubmissionSubject;
}

export interface SubmissionRound {
  id: string;
  title: string;
  subject: SubmissionSubject;
  dueDate: string;
  isOpen: boolean;
}

export interface SubmissionFile {
  id: string;
  submissionId: string;
  chineseFileType?: ChineseFileType | null;
  name: string;
  kind: FileKind;
  sizeLabel: string;
  storagePath: string;
  uploadedAt: string;
  downloadUrl?: string | null;
  previewUrl?: string | null;
}

export interface ReviewComment {
  id: string;
  submissionId: string;
  teacherId: string;
  teacherName: string;
  content: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  studentProfileId: string;
  roundId: string;
  status: SubmissionStatus;
  grade: number | null;
  submittedAt: string;
  updatedAt: string;
}
