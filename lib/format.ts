export function formatDate(date: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(date));
}

export function getSubjectLabel(subject: "art" | "chinese") {
  return subject === "chinese" ? "الصيني" : "الفنية";
}
