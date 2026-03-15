import { ProjectList } from "@/components/project/project-list";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ProjectList locale={locale} />;
}
