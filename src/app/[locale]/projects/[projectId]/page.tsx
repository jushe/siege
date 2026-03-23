import { PlanList } from "@/components/plan/plan-list";
import { ProjectDescription } from "@/components/project/project-description";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  const db = getDb();
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();

  if (!project) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <a
          href={`/${locale}`}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; {locale === "zh" ? "返回" : "Back"}
        </a>
        <h1 className="text-3xl font-bold mt-2">{project.name}</h1>
        {project.description && (
          <ProjectDescription content={project.description} />
        )}
        <p className="text-xs text-gray-400 font-mono mt-1">
          {project.targetRepoPath}
        </p>
      </div>

      <PlanList projectId={projectId} locale={locale} />
    </div>
  );
}
