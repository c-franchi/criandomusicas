import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";

const TermsOfUse = () => {
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
        canonical="/termos"
        title={t('terms.title')}
        description={t('terms.seoDescription')}
        keywords={t('terms.seoKeywords')}
        updatedAt={currentDate}
      />
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-8">{t('terms.title')}</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            {t('terms.lastUpdated')}: {formatDate(new Date())}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.acceptance.title')}</h2>
            <p className="text-muted-foreground">
              {t('terms.sections.acceptance.content')}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.services.title')}</h2>
            <p className="text-muted-foreground">
              {t('terms.sections.services.content')}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.account.title')}</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              {(t('terms.sections.account.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.process.title')}</h2>
            <p className="text-muted-foreground">{t('terms.sections.process.intro')}</p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
              {(t('terms.sections.process.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.intellectualProperty.title')}</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              {(t('terms.sections.intellectualProperty.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.guarantee.title')}</h2>
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <h3 className="font-semibold mb-2">{t('terms.sections.guarantee.satisfactionTitle')}</h3>
              <p className="text-muted-foreground mb-3">
                {t('terms.sections.guarantee.satisfactionIntro')}
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                {(t('terms.sections.guarantee.satisfactionItems', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index} dangerouslySetInnerHTML={{ __html: item.replace(/^([^:]+):/, '<strong>$1:</strong>') }} />
                ))}
              </ul>
            </div>
            <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20 mt-4">
              <h3 className="font-semibold mb-2 text-red-500">{t('terms.sections.guarantee.noRefundTitle')}</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                {(t('terms.sections.guarantee.noRefundItems', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index} dangerouslySetInnerHTML={{ __html: item.replace(/^([^,]+,)/, '<strong>$1</strong>') }} />
                ))}
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.payment.title')}</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              {(t('terms.sections.payment.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.refund.title')}</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              {(t('terms.sections.refund.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item.replace(/^([^:]+):/, '<strong>$1:</strong>') }} />
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.prohibited.title')}</h2>
            <p className="text-muted-foreground">{t('terms.sections.prohibited.intro')}</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              {(t('terms.sections.prohibited.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.delivery.title')}</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              {(t('terms.sections.delivery.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item.replace(/^([^:]+):/, '<strong>$1:</strong>') }} />
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.liability.title')}</h2>
            <p className="text-muted-foreground">{t('terms.sections.liability.intro')}</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              {(t('terms.sections.liability.items', { returnObjects: true }) as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.changes.title')}</h2>
            <p className="text-muted-foreground">
              {t('terms.sections.changes.content')}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.jurisdiction.title')}</h2>
            <p className="text-muted-foreground">
              {t('terms.sections.jurisdiction.content')}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{t('terms.sections.contact.title')}</h2>
            <p className="text-muted-foreground">
              {t('terms.sections.contact.intro')}<br />
              <strong>{t('terms.sections.contact.email')}:</strong> contato@criandomusicas.com.br<br />
              <strong>{t('terms.sections.contact.whatsapp')}:</strong> (16) 99999-9999
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
