/** Shared signature stays inside both the gift preview and the printable artwork. */
export default function GiftBrandMark({ light = false }: { light?: boolean }) {
  return <a href="https://criandomusicas.com.br/" target="_blank" rel="noopener noreferrer"
    className={`gift-brand-mark ${light ? 'gift-brand-mark-light' : ''}`} aria-label="Criando Músicas — criandomusicas.com.br">
    <img src="/icons/icon-192x192.png" width="22" height="22" alt="" />
    <span>criandomusicas.com.br</span>
  </a>;
}
