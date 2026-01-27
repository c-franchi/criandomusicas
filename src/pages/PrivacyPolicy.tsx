import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";

const PrivacyPolicy = () => {
  const { t, i18n } = useTranslation('legal');
  const currentDate = new Date().toISOString();
  
  const formatDate = (date: Date) => {
    const localeMap: Record<string, string> = {
      'pt-BR': 'pt-BR',
      'en': 'en-US',
      'es': 'es-ES',
      'it': 'it-IT'
    };
    return date.toLocaleDateString(localeMap[i18n.language] || 'pt-BR');
  };
  
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <SEO 
        canonical="/privacidade"
        title={t('privacy.title')}
        description={t('privacy.seoDescription')}
        keywords={t('privacy.seoKeywords')}
        updatedAt={currentDate}
      />
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-8">{t('privacy.title')}</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            {t('privacy.lastUpdated')}: {formatDate(new Date())}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('privacy.sections.intro.title')}</h2>
            <p className="text-muted-foreground">
              {t('privacy.sections.intro.content')}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('privacy.sections.dataCollection.title')}</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              {(t('privacy.sections.dataCollection.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item.replace(/^([^:]+):/, '<strong>$1:</strong>') }} />
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('privacy.sections.dataUse.title')}</h2>
            <p className="text-muted-foreground">{t('privacy.sections.dataUse.intro')}</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              {(t('privacy.sections.dataUse.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('privacy.sections.legalBasis.title')}</h2>
            <p className="text-muted-foreground">{t('privacy.sections.legalBasis.intro')}</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              {(t('privacy.sections.legalBasis.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item.replace(/^([^:]+):/, '<strong>$1:</strong>') }} />
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('privacy.sections.dataSharing.title')}</h2>
            <p className="text-muted-foreground">{t('privacy.sections.dataSharing.intro')}</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              {(t('privacy.sections.dataSharing.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('privacy.sections.rights.title')}</h2>
            <p className="text-muted-foreground">{t('privacy.sections.rights.intro')}</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              {(t('privacy.sections.rights.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('privacy.sections.dataSecurity.title')}</h2>
            <p className="text-muted-foreground">
              {t('privacy.sections.dataSecurity.content')}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('privacy.sections.retention.title')}</h2>
            <p className="text-muted-foreground">
              {t('privacy.sections.retention.content')}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('privacy.sections.cookies.title')}</h2>
            <p className="text-muted-foreground">
              {t('privacy.sections.cookies.content')}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('privacy.sections.dpo.title')}</h2>
            <p className="text-muted-foreground">
              {t('privacy.sections.dpo.intro')}
            </p>
            <p className="text-muted-foreground">
              <strong>{t('privacy.sections.dpo.email')}:</strong> privacidade@criandomusicas.com.br<br />
              <strong>{t('privacy.sections.dpo.whatsapp')}:</strong> (16) 99999-9999
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('privacy.sections.changes.title')}</h2>
            <p className="text-muted-foreground">
              {t('privacy.sections.changes.content')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
