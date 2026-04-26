import { isChineseFileTypeMarker, parseChineseFileTypeMarker } from "@/lib/chinese-file-type";
import { getDataset } from "@/lib/data";
import { createManagedPreviewUrl } from "@/lib/storage";
import type { SubmissionStatus, SubmissionSubject, TeacherAssignment } from "@/lib/types";

export function getStatusLabel(status: SubmissionStatus) {
  switch (status) {
    case "draft":
      return "مسودة";
    case "submitted":
      return "مُرسل";
    case "under_review":
      return "قيد المراجعة";
    case "needs_revision":
      return "يحتاج تعديل";
    case "approved":
      return "معتمد";
  }
}

export function getStatusTone(status: SubmissionStatus) {
  switch (status) {
    case "approved":
      return "success";
    case "needs_revision":
      return "warning";
    case "under_review":
      return "info";
    case "submitted":
      return "neutral";
    case "draft":
      return "muted";
  }
}

function canTeacherAccessSubject(
  teacherAssignments: TeacherAssignment[],
  teacherId: string,
  classSectionId: string | null,
  subject: SubmissionSubject
) {
  if (!classSectionId) {
    return false;
  }

  return teacherAssignments.some(
    (assignment) =>
      assignment.teacherId === teacherId &&
      assignment.classSectionId === classSectionId &&
      assignment.subject === subject
  );
}

function getTeacherIdsForSubmission(
  teacherAssignments: TeacherAssignment[],
  classSectionId: string | null,
  subject: SubmissionSubject
) {
  if (!classSectionId) {
    return [];
  }

  return teacherAssignments
    .filter((assignment) => assignment.classSectionId === classSectionId && assignment.subject === subject)
    .map((assignment) => assignment.teacherId);
}

export async function getSubmissionView(submissionId: string) {
  const {
    submissions,
    studentProfiles,
    users,
    submissionRounds,
    classSections,
    submissionFiles,
    reviewComments,
    teacherAssignments,
    source
  } =
    await getDataset();
  const submission = submissions.find((item) => item.id === submissionId);
  if (!submission) {
    return null;
  }

  const profile = studentProfiles.find((item) => item.id === submission.studentProfileId);
  if (!profile) {
    return null;
  }

  const student = users.find((item) => item.id === profile.userId);
  const round = submissionRounds.find((item) => item.id === submission.roundId);
  const classSection =
    classSections.find((item) => item.id === profile.classSectionId) ??
    {
      id: "no-class",
      name: "بدون شعبة",
      gradeLabel: "غير محدد"
    };
  if (!student || !round) {
    return null;
  }

  const assignedTeacherIds = getTeacherIdsForSubmission(teacherAssignments, profile.classSectionId, round.subject);
  const files = submissionFiles.filter((item) => item.submissionId === submissionId);
  const comments = reviewComments.filter((item) => item.submissionId === submissionId);
  const chineseFileType =
    round.subject === "chinese"
      ? comments.map((comment) => parseChineseFileTypeMarker(comment.content)).find((value) => value !== undefined) ?? null
      : null;
  const visibleComments = comments.filter((comment) => !isChineseFileTypeMarker(comment.content));
  const filesWithUrls = await Promise.all(
    files.map(async (file) => {
      if (source !== "supabase") {
        return {
          ...file,
          previewUrl: null,
          downloadUrl: null
        };
      }

      return {
        ...file,
        previewUrl: await createManagedPreviewUrl(file.storagePath),
        downloadUrl: `/api/submissions/${submissionId}/files/${file.id}/download`
      };
    })
  );

  return {
    submission,
    profile,
    student,
    round,
    classSection,
    files: filesWithUrls,
    comments: visibleComments,
    assignedTeacherIds,
    chineseFileType,
    source
  };
}

export async function canTeacherAccessSubmission(teacherUserId: string, submissionId: string) {
  const { submissions, studentProfiles, submissionRounds, teacherAssignments } = await getDataset();
  const submission = submissions.find((item) => item.id === submissionId);
  if (!submission) {
    return false;
  }

  const profile = studentProfiles.find((item) => item.id === submission.studentProfileId);
  const round = submissionRounds.find((item) => item.id === submission.roundId);

  if (!profile || !round) {
    return false;
  }

  return canTeacherAccessSubject(teacherAssignments, teacherUserId, profile.classSectionId, round.subject);
}

export async function getStudentDashboard(studentUserId = "student-1") {
  const { users, studentProfiles, classSections, submissions, submissionRounds, submissionFiles, reviewComments, source } =
    await getDataset();
  const student =
    users.find((item) => item.id === studentUserId && item.role === "student") ??
    users.find((item) => item.role === "student") ??
    null;

  if (!student) {
    return {
      student: null,
      profile: null,
      classSection: null,
      entries: [],
      rounds: submissionRounds,
      source
    };
  }

  const profile = studentProfiles.find((item) => item.userId === student.id) ?? null;
  if (!profile) {
    return {
      student,
      profile: null,
      classSection: null,
      entries: [],
      rounds: submissionRounds,
      source
    };
  }

  const classSection = profile.classSectionId
    ? classSections.find((item) => item.id === profile.classSectionId) ?? null
    : null;

  const entries = submissions
    .filter((item) => item.studentProfileId === profile.id)
    .map((submission) => ({
      submission,
      round: submissionRounds.find((item) => item.id === submission.roundId),
      files: submissionFiles.filter((item) => item.submissionId === submission.id),
      comments: reviewComments.filter(
        (item) => item.submissionId === submission.id && !isChineseFileTypeMarker(item.content)
      )
    }))
    .filter(
      (
        entry
      ): entry is {
        submission: (typeof submissions)[number];
        round: (typeof submissionRounds)[number];
        files: typeof submissionFiles;
        comments: typeof reviewComments;
      } => Boolean(entry.round)
    );

  return { student, profile, classSection, entries, rounds: submissionRounds, source };
}

export async function getTeacherDashboard(teacherUserId = "teacher-1") {
  const {
    users,
    submissions,
    studentProfiles,
    submissionRounds,
    classSections,
    submissionFiles,
    reviewComments,
    teacherAssignments,
    source
  } = await getDataset();
  const teacher =
    users.find((item) => item.id === teacherUserId && item.role === "teacher") ??
    users.find((item) => item.role === "teacher") ??
    null;

  if (!teacher) {
    return {
      teacher: null,
      cards: [],
      source
    };
  }

  type TeacherCard = {
    submission: (typeof submissions)[number];
    student: (typeof users)[number];
    profile: (typeof studentProfiles)[number];
    round: (typeof submissionRounds)[number];
    classSection: (typeof classSections)[number];
    files: typeof submissionFiles;
    comments: typeof reviewComments;
  };

  const cards = submissions
    .map<TeacherCard | null>((submission) => {
      const profile = studentProfiles.find((item) => item.id === submission.studentProfileId);
      if (!profile) {
        return null;
      }

      const student = users.find((item) => item.id === profile.userId);
      const round = submissionRounds.find((item) => item.id === submission.roundId);
      const classSection =
        classSections.find((item) => item.id === profile.classSectionId) ??
        {
          id: "no-class",
          name: "بدون شعبة",
          gradeLabel: "غير محدد"
        };
      if (!student || !round) {
        return null;
      }

      if (!canTeacherAccessSubject(teacherAssignments, teacher.id, profile.classSectionId, round.subject)) {
        return null;
      }

      const files = submissionFiles.filter((item) => item.submissionId === submission.id);
      const comments = reviewComments.filter(
        (item) => item.submissionId === submission.id && !isChineseFileTypeMarker(item.content)
      );

      return { submission, student, profile, round, classSection, files, comments };
    })
    .filter((item): item is TeacherCard => item !== null);

  return {
    teacher,
    cards,
    source
  };
}

export async function getAdminDashboard(adminUserId = "admin-1") {
  const { users, classSections, submissions, submissionRounds, teacherAssignments, source } = await getDataset();
  const admin = users.find((item) => item.id === adminUserId && item.role === "admin") ?? users.find((item) => item.role === "admin");
  return {
    stats: {
      students: users.filter((item) => item.role === "student").length,
      teachers: users.filter((item) => item.role === "teacher").length,
      classes: classSections.length,
      submissions: submissions.length
    },
    users,
    classSections,
    rounds: submissionRounds,
    teacherAssignments,
    admin,
    source
  };
}
