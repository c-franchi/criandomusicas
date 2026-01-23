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
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;
const SITE_NAME = 'Criando Músicas';

const SEO = ({
  title,
  description = 'Crie músicas personalizadas com inteligência artificial. Transforme sua história em uma canção única e emocionante. Entrega em até 48h diretamente na plataforma.',
  keywords = 'música personalizada, criar música, presente criativo, música para aniversário, música para casamento, IA música',
  canonical,
  type = 'website',
  image = DEFAULT_IMAGE,
  noIndex = false,
  updatedAt,
}: SEOProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Músicas Personalizadas com IA`;
  const fullCanonical = canonical ? `${BASE_URL}${canonical}` : BASE_URL;
  const fullImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  return (
    <Helmet>
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
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="pt_BR" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      
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
