import { readFile } from "fs/promises";
import path from "path";
import { InjazatiFrame } from "@/components/injazati-frame";

export default async function HomePage() {
  const html = await readFile(path.join(process.cwd(), "index.html"), "utf8");

  return (
    <main className="injazati-host">
      <InjazatiFrame html={html} />
    </main>
  );
}
