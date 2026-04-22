import {
  ClassSection,
  ReviewComment,
  StudentProfile,
  Submission,
  SubmissionFile,
  SubmissionRound,
  TeacherAssignment,
  User
} from "@/lib/types";

export const users: User[] = [
  {
    id: "admin-1",
    email: "admin@balad-alameen.edu",
    displayName: "إدارة المعارض",
    username: "admin",
    role: "admin"
  },
  {
    id: "teacher-1",
    email: "art.teacher@balad-alameen.edu",
    displayName: "أ. وليد",
    username: "waleed1",
    role: "teacher"
  },
  {
    id: "student-1",
    email: "sara.101@balad-alameen.edu",
    displayName: "سارة خالد",
    username: "sara101",
    role: "student"
  },
  {
    id: "student-2",
    email: "reem.202@balad-alameen.edu",
    displayName: "ريم فهد",
    username: "reem202",
    role: "student"
  },
  {
    id: "student-3",
    email: "lama.303@balad-alameen.edu",
    displayName: "لما ناصر",
    username: "lama303",
    role: "student"
  }
];

export const classSections: ClassSection[] = [
  { id: "class-1", name: "أ / 1", gradeLabel: "الصف الأول المتوسط" },
  { id: "class-2", name: "أ / 2", gradeLabel: "الصف الثاني المتوسط" },
  { id: "class-3", name: "ب / 1", gradeLabel: "الصف الثالث المتوسط" }
];

export const studentProfiles: StudentProfile[] = [
  { id: "profile-1", userId: "student-1", classSectionId: "class-1", studentCode: "BA-101" },
  { id: "profile-2", userId: "student-2", classSectionId: "class-2", studentCode: "BA-202" },
  { id: "profile-3", userId: "student-3", classSectionId: "class-1", studentCode: "BA-303" }
];

export const teacherAssignments: TeacherAssignment[] = [
  { id: "assign-1", teacherId: "teacher-1", classSectionId: "class-1", subject: "art" },
  { id: "assign-2", teacherId: "teacher-1", classSectionId: "class-2", subject: "art" },
  { id: "assign-3", teacherId: "teacher-1", classSectionId: "class-3", subject: "art" }
];

export const submissionRounds: SubmissionRound[] = [
  { id: "round-1", title: "المعرض الأول", subject: "art", dueDate: "2026-05-05", isOpen: true },
  { id: "round-2", title: "المعرض الثاني", subject: "art", dueDate: "2026-06-01", isOpen: true },
  { id: "round-3", title: "المعرض الختامي", subject: "art", dueDate: "2026-06-20", isOpen: false },
  { id: "round-4", title: "المشروع الأول", subject: "chinese", dueDate: "2026-05-12", isOpen: true },
  { id: "round-5", title: "المشروع الختامي", subject: "chinese", dueDate: "2026-06-18", isOpen: true }
];

export const submissions: Submission[] = [
  {
    id: "submission-1",
    studentProfileId: "profile-1",
    roundId: "round-1",
    status: "under_review",
    grade: 92,
    submittedAt: "2026-04-12T08:00:00Z",
    updatedAt: "2026-04-14T09:15:00Z"
  },
  {
    id: "submission-2",
    studentProfileId: "profile-2",
    roundId: "round-1",
    status: "needs_revision",
    grade: null,
    submittedAt: "2026-04-10T11:30:00Z",
    updatedAt: "2026-04-15T12:45:00Z"
  },
  {
    id: "submission-3",
    studentProfileId: "profile-3",
    roundId: "round-4",
    status: "submitted",
    grade: null,
    submittedAt: "2026-04-16T06:20:00Z",
    updatedAt: "2026-04-16T06:20:00Z"
  }
];

export const submissionFiles: SubmissionFile[] = [
  {
    id: "file-1",
    submissionId: "submission-1",
    name: "لوحات-سارة.zip",
    kind: "zip",
    sizeLabel: "42 MB",
    storagePath: "mock/submission-1/lohat-sara.zip",
    uploadedAt: "2026-04-12T08:03:00Z"
  },
  {
    id: "file-2",
    submissionId: "submission-1",
    name: "شرح-المشروع.pdf",
    kind: "pdf",
    sizeLabel: "2.1 MB",
    storagePath: "mock/submission-1/sharh-project.pdf",
    uploadedAt: "2026-04-12T08:05:00Z"
  },
  {
    id: "file-3",
    submissionId: "submission-2",
    name: "معرض-ريم.zip",
    kind: "zip",
    sizeLabel: "36 MB",
    storagePath: "mock/submission-2/mared-reem.zip",
    uploadedAt: "2026-04-10T11:35:00Z"
  },
  {
    id: "file-4",
    submissionId: "submission-2",
    name: "لوحة-رئيسية.jpg",
    kind: "image",
    sizeLabel: "4.8 MB",
    storagePath: "mock/submission-2/lawha-main.jpg",
    uploadedAt: "2026-04-10T11:36:00Z"
  },
  {
    id: "file-5",
    submissionId: "submission-3",
    name: "مخططات-لما.pdf",
    kind: "pdf",
    sizeLabel: "1.3 MB",
    storagePath: "mock/submission-3/mokhattat-lama.pdf",
    uploadedAt: "2026-04-16T06:21:00Z"
  }
];

export const reviewComments: ReviewComment[] = [
  {
    id: "comment-1",
    submissionId: "submission-1",
    teacherId: "teacher-1",
    teacherName: "أ. مريم السلمي",
    content: "التنظيم ممتاز، ويحتاج الملف النصي إلى توضيح أكثر لفكرة العمل الفني.",
    createdAt: "2026-04-14T09:20:00Z"
  },
  {
    id: "comment-2",
    submissionId: "submission-2",
    teacherId: "teacher-1",
    teacherName: "أ. مريم السلمي",
    content: "يرجى إعادة رفع النسخة النهائية من ملف العرض وإضافة وصف مختصر داخل PDF.",
    createdAt: "2026-04-15T12:50:00Z"
  }
];
