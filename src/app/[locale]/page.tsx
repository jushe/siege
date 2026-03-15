import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("project");

  return (
    <div>
      <h2 className="text-2xl font-bold">{t("title")}</h2>
      <p className="text-gray-500 text-center py-12">
        {useTranslations("common")("noData")}
      </p>
    </div>
  );
}
