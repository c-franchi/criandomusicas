import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  type?: 'website' | 'article' | 'product';
  image?: string;
  noIndex?: boolean;
  updatedAt?: string;
}

const BASE_URL = 'https://criandomusicas.com.br';
const SITE_NAME = 'Criando Músicas';

const SEO = ({
  title,
  description = 'Crie músicas personalizadas a partir da sua história. Conheça músicas para presentes, homenagens e projetos digitais.',
  keywords = 'música personalizada, criar música, presente criativo, música para aniversário, música para casamento, IA música',
  canonical,
  type = 'website',
  image,
  noIndex = false,
  updatedAt,
}: SEOProps) => {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  const locales: Record<string, string> = { 'pt-BR': 'pt_BR', en: 'en_US', es: 'es_ES', it: 'it_IT' };
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Músicas Personalizadas com IA`;
  const fullCanonical = `${BASE_URL}${canonical || pathname}`;
  const fullImage = image?.startsWith('https://') ? image : undefined;

  return (
    <Helmet>
      <html lang={i18n.language} />
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Canonical URL - each page should point to itself */}
      <link rel="canonical" href={fullCanonical} />
      
      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullCanonical} />
      {fullImage && <meta property="og:image" content={fullImage} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={locales[i18n.language] || "pt_BR"} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {fullImage && <meta name="twitter:image" content={fullImage} />}
      
      {/* Article specific - for legal pages with update dates */}
      {updatedAt && (
        <>
          <meta property="article:modified_time" content={updatedAt} />
          <meta property="og:updated_time" content={updatedAt} />
        </>
      )}
    </Helmet>
  );
};

export default SEO;
