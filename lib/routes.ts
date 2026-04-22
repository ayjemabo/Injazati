export const INJAZATI_HOME_PATH = "/";
export const MAARIDUNA_HOME_PATH = "/maariduna";
export const MAARIDUNA_STUDENT_PATH = "/maariduna/student";
export const MAARIDUNA_TEACHER_PATH = "/maariduna/teacher";
export const MAARIDUNA_VISITOR_PATH = "/maariduna/visitors";

export function maaridunaSubmissionPath(id: string) {
  return `/maariduna/submissions/${id}`;
}
