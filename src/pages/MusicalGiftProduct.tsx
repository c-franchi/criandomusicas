import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import GiftProductView from '@/components/gifts/GiftProductView';
import type { GiftProduct } from '@/components/gifts/products';

export default function MusicalGiftProduct({ product }: { product: GiftProduct }) {
  return (
    <>
      <AppHeader variant="sticky" showLogo showHomeButton />
      <GiftProductView product={product} />
      <Footer />
    </>
  );
}
