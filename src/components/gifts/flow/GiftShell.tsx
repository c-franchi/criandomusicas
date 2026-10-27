import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppHeader from "@/components/AppHeader";
import SEO from "@/components/SEO";
export default function GiftShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { t } = useTranslation("home");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title={title} noIndex />
      <AppHeader variant="sticky" showLogo showHomeButton />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <nav className="mb-6 flex flex-wrap gap-5 text-sm text-muted-foreground">
          <Link to="/presentes">{t("giftFlow.myGifts")}</Link>
          <Link to="/">{t("giftFlow.home")}</Link>
        </nav>
        <h1 className="mb-7 text-3xl font-semibold">{title}</h1>
        {children}
      </main>
    </div>
  );
}
