import { resolveGenerationLanguage, type GenerationLanguage } from './generationLanguage.ts';

export function transcriptionLanguageCode(language: unknown): 'pt' | 'en' | 'es' | 'it' {
  const resolved = resolveGenerationLanguage(language);
  return resolved === 'pt-BR' ? 'pt' : resolved;
}

const transcriptionPrompts: Record<'pt' | 'en' | 'es' | 'it', string> = {
  pt: 'Transcrição fiel em português brasileiro. O áudio pode conter fala, canto, narração ou ditado. Transcreva exatamente cada palavra pronunciada, incluindo nomes próprios, siglas, números e palavras estrangeiras. Mantenha a pontuação adequada.',
  en: 'Faithful transcription in English. The audio may contain speech, singing, narration, or dictation. Transcribe every pronounced word exactly, including proper names, acronyms, numbers, and foreign words. Preserve appropriate punctuation.',
  es: 'Transcripción fiel en español. El audio puede contener habla, canto, narración o dictado. Transcribe exactamente cada palabra pronunciada, incluidos nombres propios, siglas, números y palabras extranjeras. Conserva la puntuación adecuada.',
  it: 'Trascrizione fedele in italiano. L’audio può contenere parlato, canto, narrazione o dettatura. Trascrivi esattamente ogni parola pronunciata, inclusi nomi propri, sigle, numeri e parole straniere. Mantieni la punteggiatura appropriata.',
};

export function transcriptionPrompt(language: unknown): string {
  return transcriptionPrompts[transcriptionLanguageCode(language)];
}

const fallbackDescriptions: Record<GenerationLanguage, { withPurpose: string; generic: string }> = {
  'pt-BR': { withPurpose: 'Uma música especial criada para celebrar {purpose}.', generic: 'Uma música única, feita com carinho e emoção.' },
  en: { withPurpose: 'A special song created to celebrate {purpose}.', generic: 'A unique song made with care and emotion.' },
  es: { withPurpose: 'Una canción especial creada para celebrar {purpose}.', generic: 'Una canción única, hecha con cariño y emoción.' },
  it: { withPurpose: 'Una canzone speciale creata per celebrare {purpose}.', generic: 'Una canzone unica, creata con cura ed emozione.' },
};

export function audioSampleFallbackDescription(language: unknown, purpose?: string | null): string {
  const copy = fallbackDescriptions[resolveGenerationLanguage(language)];
  return purpose ? copy.withPurpose.replace('{purpose}', purpose.toLowerCase()) : copy.generic;
}

const notificationCopies = {
  'pt-BR': {
    paymentTitle: '✅ Pagamento confirmado!', paymentBody: 'Seu pagamento foi aprovado. Estamos criando sua música!',
    lyricsTitle: '✨ Letras prontas!', lyricsBody: 'As letras da sua música foram geradas. Acesse para escolher sua favorita!',
    reviewTitle: '⭐ O que achou da sua música?', reviewBody: 'Sua opinião é muito importante para nós! Avalie sua música personalizada.',
    giftReadyTitle: '🎁 Seu presente musical foi liberado!', giftReadyBody: 'Seu cartão foi conferido e liberado. Acesse para compartilhar.',
    musicReadyTitle: '🎵 Sua música está pronta!', musicReadyBody: 'Sua música está disponível para ouvir e baixar!',
    creditTitle: '🎵 Pedido recebido!', creditBody: 'Seu crédito foi utilizado. Estamos criando sua música!', creditsRemaining: 'Restam {count} crédito(s).',
    status: {
      LYRICS_PENDING: { title: '📝 Letra em criação!', body: 'Estamos criando a letra da sua música.' },
      LYRICS_GENERATED: { title: '📝 Letra pronta!', body: 'A letra da sua música está pronta para revisão.' },
      MUSIC_GENERATING: { title: '🎶 Música em produção!', body: 'Sua música está sendo produzida. Falta pouco!' },
      MUSIC_READY: { title: '🎉 Música pronta!', body: 'Sua música está pronta para ouvir!' },
      COMPLETED: { title: '✅ Pedido finalizado!', body: 'Seu pedido foi concluído. Aproveite sua música!' },
    },
  },
  en: {
    paymentTitle: '✅ Payment confirmed!', paymentBody: 'Your payment was approved. We are creating your music!',
    lyricsTitle: '✨ Lyrics ready!', lyricsBody: 'Your song lyrics are ready. Open the order to choose your favorite!',
    reviewTitle: '⭐ What did you think of your music?', reviewBody: 'Your opinion means a lot to us! Please review your personalized song.',
    giftReadyTitle: '🎁 Your musical gift is ready!', giftReadyBody: 'Your card has been reviewed and released. Open it to share.',
    musicReadyTitle: '🎵 Your music is ready!', musicReadyBody: 'Your music is available to listen to and download!',
    creditTitle: '🎵 Order received!', creditBody: 'Your credit was used. We are creating your music!', creditsRemaining: '{count} credit(s) remaining.',
    status: {
      LYRICS_PENDING: { title: '📝 Writing your lyrics!', body: 'We are writing your song lyrics.' },
      LYRICS_GENERATED: { title: '📝 Lyrics ready!', body: 'Your song lyrics are ready for review.' },
      MUSIC_GENERATING: { title: '🎶 Music in production!', body: 'Your music is being produced. Almost there!' },
      MUSIC_READY: { title: '🎉 Music ready!', body: 'Your music is ready to listen to!' },
      COMPLETED: { title: '✅ Order complete!', body: 'Your order is complete. Enjoy your music!' },
    },
  },
  es: {
    paymentTitle: '✅ ¡Pago confirmado!', paymentBody: 'Tu pago fue aprobado. ¡Estamos creando tu música!',
    lyricsTitle: '✨ ¡Letras listas!', lyricsBody: 'Las letras de tu canción están listas. ¡Abre el pedido para elegir tu favorita!',
    reviewTitle: '⭐ ¿Qué te pareció tu música?', reviewBody: '¡Tu opinión es muy importante para nosotros! Evalúa tu canción personalizada.',
    giftReadyTitle: '🎁 ¡Tu regalo musical está disponible!', giftReadyBody: 'Tu tarjeta fue revisada y habilitada. Ábrela para compartirla.',
    musicReadyTitle: '🎵 ¡Tu música está lista!', musicReadyBody: '¡Tu música está disponible para escuchar y descargar!',
    creditTitle: '🎵 ¡Pedido recibido!', creditBody: 'Tu crédito fue utilizado. ¡Estamos creando tu música!', creditsRemaining: 'Quedan {count} crédito(s).',
    status: {
      LYRICS_PENDING: { title: '📝 ¡Letra en creación!', body: 'Estamos escribiendo la letra de tu canción.' },
      LYRICS_GENERATED: { title: '📝 ¡Letra lista!', body: 'La letra de tu canción está lista para revisar.' },
      MUSIC_GENERATING: { title: '🎶 ¡Música en producción!', body: 'Tu música se está produciendo. ¡Ya falta poco!' },
      MUSIC_READY: { title: '🎉 ¡Música lista!', body: '¡Tu música está lista para escuchar!' },
      COMPLETED: { title: '✅ ¡Pedido finalizado!', body: 'Tu pedido está terminado. ¡Disfruta tu música!' },
    },
  },
  it: {
    paymentTitle: '✅ Pagamento confermato!', paymentBody: 'Il tuo pagamento è stato approvato. Stiamo creando la tua musica!',
    lyricsTitle: '✨ Testi pronti!', lyricsBody: 'I testi della tua canzone sono pronti. Apri l’ordine per scegliere il tuo preferito!',
    reviewTitle: '⭐ Cosa ne pensi della tua musica?', reviewBody: 'La tua opinione è molto importante per noi! Valuta la tua canzone personalizzata.',
    giftReadyTitle: '🎁 Il tuo regalo musicale è disponibile!', giftReadyBody: 'La tua carta è stata verificata e resa disponibile. Aprila per condividerla.',
    musicReadyTitle: '🎵 La tua musica è pronta!', musicReadyBody: 'La tua musica è disponibile per l’ascolto e il download!',
    creditTitle: '🎵 Ordine ricevuto!', creditBody: 'Il tuo credito è stato utilizzato. Stiamo creando la tua musica!', creditsRemaining: 'Restano {count} crediti.',
    status: {
      LYRICS_PENDING: { title: '📝 Testo in creazione!', body: 'Stiamo scrivendo il testo della tua canzone.' },
      LYRICS_GENERATED: { title: '📝 Testo pronto!', body: 'Il testo della tua canzone è pronto per la revisione.' },
      MUSIC_GENERATING: { title: '🎶 Musica in produzione!', body: 'La tua musica è in produzione. Manca poco!' },
      MUSIC_READY: { title: '🎉 Musica pronta!', body: 'La tua musica è pronta da ascoltare!' },
      COMPLETED: { title: '✅ Ordine completato!', body: 'Il tuo ordine è completo. Buon ascolto!' },
    },
  },
} as const;

export function generationNotificationCopy(language: unknown) {
  return notificationCopies[resolveGenerationLanguage(language)];
}

const emailCopies = {
  'pt-BR': {
    customer: 'Cliente', defaultSongTitle: 'Sua música personalizada', htmlTitle: 'Sua música está pronta! - Criando Músicas', headerReady: 'Sua música está pronta!',
    greeting: 'Parabéns, {name}!', finished: 'Sua música foi finalizada com sucesso', order: 'Pedido', instrumental: 'Instrumental', listen: '🎧 Ouvir Minha Música',
    nextTitle: '✅ O que você pode fazer agora:', nextItems: ['Ouvir e baixar sua música em alta qualidade', 'Compartilhar nas redes sociais', 'Enviar para a pessoa especial', 'Deixar uma avaliação sobre nosso serviço'],
    sharePrompt: 'Gostou da sua música? Conte para o mundo!', shareCta: '📤 Compartilhar Música', reviewLead: 'Sua opinião é muito importante para nós!', reviewStrong: 'Avalie sua experiência', reviewCta: '⭐ Deixar minha avaliação',
    support: 'Dúvidas? Entre em contato conosco:', rights: 'Todos os direitos reservados.', reason: 'Você recebeu este email porque sua música personalizada foi concluída.', subjectReady: '🎉 "{title}" está pronta para ouvir!',
    giftSubject: '🎁 Seu presente musical foi liberado!', giftTitle: 'Seu presente musical foi liberado!', giftGreeting: 'Olá, {name}.', giftReleased: 'O ADM conferiu e liberou seu cartão.', giftSchedule: 'O acesso do destinatário respeitará a data e o horário escolhidos.', giftCta: 'Abrir meu cartão e compartilhar',
  },
  en: {
    customer: 'Customer', defaultSongTitle: 'Your personalized music', htmlTitle: 'Your music is ready! - Criando Músicas', headerReady: 'Your music is ready!',
    greeting: 'Congratulations, {name}!', finished: 'Your music has been successfully completed', order: 'Order', instrumental: 'Instrumental', listen: '🎧 Listen to My Music',
    nextTitle: '✅ What you can do now:', nextItems: ['Listen to and download your music in high quality', 'Share it on social media', 'Send it to someone special', 'Leave a review of our service'],
    sharePrompt: 'Enjoyed your music? Tell the world!', shareCta: '📤 Share Music', reviewLead: 'Your opinion means a lot to us!', reviewStrong: 'Rate your experience', reviewCta: '⭐ Leave my review',
    support: 'Questions? Contact us:', rights: 'All rights reserved.', reason: 'You received this email because your personalized music is complete.', subjectReady: '🎉 "{title}" is ready to listen!',
    giftSubject: '🎁 Your musical gift is ready!', giftTitle: 'Your musical gift is ready!', giftGreeting: 'Hello, {name}.', giftReleased: 'Our team has reviewed and released your card.', giftSchedule: 'Recipient access will respect the chosen date and time.', giftCta: 'Open and share my card',
  },
  es: {
    customer: 'Cliente', defaultSongTitle: 'Tu música personalizada', htmlTitle: '¡Tu música está lista! - Criando Músicas', headerReady: '¡Tu música está lista!',
    greeting: '¡Felicitaciones, {name}!', finished: 'Tu música se completó con éxito', order: 'Pedido', instrumental: 'Instrumental', listen: '🎧 Escuchar mi música',
    nextTitle: '✅ Qué puedes hacer ahora:', nextItems: ['Escuchar y descargar tu música en alta calidad', 'Compartirla en redes sociales', 'Enviarla a una persona especial', 'Dejar una evaluación sobre nuestro servicio'],
    sharePrompt: '¿Te gustó tu música? ¡Cuéntaselo al mundo!', shareCta: '📤 Compartir música', reviewLead: '¡Tu opinión es muy importante para nosotros!', reviewStrong: 'Evalúa tu experiencia', reviewCta: '⭐ Dejar mi evaluación',
    support: '¿Dudas? Contáctanos:', rights: 'Todos los derechos reservados.', reason: 'Recibiste este correo porque tu música personalizada está terminada.', subjectReady: '🎉 ¡"{title}" está lista para escuchar!',
    giftSubject: '🎁 ¡Tu regalo musical está disponible!', giftTitle: '¡Tu regalo musical está disponible!', giftGreeting: 'Hola, {name}.', giftReleased: 'Nuestro equipo revisó y habilitó tu tarjeta.', giftSchedule: 'El acceso del destinatario respetará la fecha y la hora elegidas.', giftCta: 'Abrir y compartir mi tarjeta',
  },
  it: {
    customer: 'Cliente', defaultSongTitle: 'La tua musica personalizzata', htmlTitle: 'La tua musica è pronta! - Criando Músicas', headerReady: 'La tua musica è pronta!',
    greeting: 'Congratulazioni, {name}!', finished: 'La tua musica è stata completata con successo', order: 'Ordine', instrumental: 'Strumentale', listen: '🎧 Ascolta la mia musica',
    nextTitle: '✅ Cosa puoi fare ora:', nextItems: ['Ascolta e scarica la tua musica in alta qualità', 'Condividila sui social', 'Inviala a una persona speciale', 'Lascia una recensione sul nostro servizio'],
    sharePrompt: 'Ti piace la tua musica? Dillo al mondo!', shareCta: '📤 Condividi la musica', reviewLead: 'La tua opinione è molto importante per noi!', reviewStrong: 'Valuta la tua esperienza', reviewCta: '⭐ Lascia la mia recensione',
    support: 'Hai domande? Contattaci:', rights: 'Tutti i diritti riservati.', reason: 'Hai ricevuto questa email perché la tua musica personalizzata è completa.', subjectReady: '🎉 "{title}" è pronta da ascoltare!',
    giftSubject: '🎁 Il tuo regalo musicale è disponibile!', giftTitle: 'Il tuo regalo musicale è disponibile!', giftGreeting: 'Ciao, {name}.', giftReleased: 'Il nostro team ha verificato e reso disponibile la tua carta.', giftSchedule: 'L’accesso del destinatario rispetterà la data e l’ora scelte.', giftCta: 'Apri e condividi la mia carta',
  },
} as const;

export function musicReadyEmailCopy(language: unknown) {
  return emailCopies[resolveGenerationLanguage(language)];
}

const purchaseEmailCopies = {
  'pt-BR': {
    customer: 'Cliente', confirmationTitle: 'Confirmação de Compra', greeting: 'Olá, {name}! 👋', confirmed: 'Sua compra foi confirmada com sucesso!', pixConfirmed: 'Seu pagamento via PIX foi confirmado com sucesso!', happy: 'Estamos muito felizes em tê-lo(a) conosco.', paid: 'Pagamento Confirmado', pixPaid: 'Pagamento PIX Confirmado', details: '📋 Detalhes da Compra', date: 'Data:', purchaseType: 'Tipo de compra:', paymentMethod: 'Forma de pagamento:', orderId: 'ID do Pedido:', total: 'Total Pago:', nextTitle: '🚀 Próximos Passos', dashboard: 'Acessar Meu Painel', support: 'Dúvidas? Entre em contato conosco:', rights: 'Todos os direitos reservados.', reason: 'Você recebeu este email porque realizou uma compra em nossa plataforma.', subject: '🎵 Confirmação de Compra - {plan}', pixSubject: '✅ Pagamento PIX Confirmado - {plan}', card: 'Cartão de Crédito', plan: 'Plano:', type: 'Tipo:', creditsMonthly: 'Créditos mensais:', nextRenewal: 'Próxima renovação:', package: 'Pacote:', credits: 'Créditos:', service: 'Serviço:', product: 'Produto:', subscription: 'Assinatura Creator', packageLabel: 'Pacote de Músicas', video: 'Serviço de Vídeo', single: 'Música Personalizada', instrumental: 'Instrumental', vocal: 'Vocal', songsPerMonth: 'músicas/mês', songs: 'músicas',
    nextSubscription: ['Seus créditos já estão disponíveis no seu painel', 'Acesse o dashboard para criar sua primeira música', 'Sua assinatura será renovada automaticamente todo mês'], nextPackage: ['Seus {credits} créditos já estão disponíveis', 'Acesse o dashboard para criar suas músicas', 'Use seus créditos quando quiser, sem pressa!'], nextSingle: ['Estamos processando seu pedido', 'Sua música será entregue em até 48 horas', 'Você receberá uma notificação quando estiver pronta'],
  },
  en: {
    customer: 'Customer', confirmationTitle: 'Purchase Confirmation', greeting: 'Hello, {name}! 👋', confirmed: 'Your purchase was successfully confirmed!', pixConfirmed: 'Your PIX payment was successfully confirmed!', happy: 'We are delighted to have you with us.', paid: 'Payment Confirmed', pixPaid: 'PIX Payment Confirmed', details: '📋 Purchase Details', date: 'Date:', purchaseType: 'Purchase type:', paymentMethod: 'Payment method:', orderId: 'Order ID:', total: 'Total Paid:', nextTitle: '🚀 Next Steps', dashboard: 'Open My Dashboard', support: 'Questions? Contact us:', rights: 'All rights reserved.', reason: 'You received this email because you made a purchase on our platform.', subject: '🎵 Purchase Confirmation - {plan}', pixSubject: '✅ PIX Payment Confirmed - {plan}', card: 'Credit Card', plan: 'Plan:', type: 'Type:', creditsMonthly: 'Monthly credits:', nextRenewal: 'Next renewal:', package: 'Package:', credits: 'Credits:', service: 'Service:', product: 'Product:', subscription: 'Creator Subscription', packageLabel: 'Music Package', video: 'Video Service', single: 'Personalized Music', instrumental: 'Instrumental', vocal: 'Vocal', songsPerMonth: 'songs/month', songs: 'songs',
    nextSubscription: ['Your credits are already available in your dashboard', 'Open the dashboard to create your first song', 'Your subscription renews automatically every month'], nextPackage: ['Your {credits} credits are already available', 'Open the dashboard to create your songs', 'Use your credits whenever you want!'], nextSingle: ['We are processing your order', 'Your music will be delivered within 48 hours', 'You will receive a notification when it is ready'],
  },
  es: {
    customer: 'Cliente', confirmationTitle: 'Confirmación de compra', greeting: '¡Hola, {name}! 👋', confirmed: '¡Tu compra fue confirmada con éxito!', pixConfirmed: '¡Tu pago por PIX fue confirmado con éxito!', happy: 'Estamos muy felices de tenerte con nosotros.', paid: 'Pago confirmado', pixPaid: 'Pago PIX confirmado', details: '📋 Detalles de la compra', date: 'Fecha:', purchaseType: 'Tipo de compra:', paymentMethod: 'Método de pago:', orderId: 'ID del pedido:', total: 'Total pagado:', nextTitle: '🚀 Próximos pasos', dashboard: 'Acceder a mi panel', support: '¿Dudas? Contáctanos:', rights: 'Todos los derechos reservados.', reason: 'Recibiste este correo porque realizaste una compra en nuestra plataforma.', subject: '🎵 Confirmación de compra - {plan}', pixSubject: '✅ Pago PIX confirmado - {plan}', card: 'Tarjeta de crédito', plan: 'Plan:', type: 'Tipo:', creditsMonthly: 'Créditos mensuales:', nextRenewal: 'Próxima renovación:', package: 'Paquete:', credits: 'Créditos:', service: 'Servicio:', product: 'Producto:', subscription: 'Suscripción Creator', packageLabel: 'Paquete de música', video: 'Servicio de video', single: 'Música personalizada', instrumental: 'Instrumental', vocal: 'Vocal', songsPerMonth: 'canciones/mes', songs: 'canciones',
    nextSubscription: ['Tus créditos ya están disponibles en tu panel', 'Accede al panel para crear tu primera canción', 'Tu suscripción se renovará automáticamente cada mes'], nextPackage: ['Tus {credits} créditos ya están disponibles', 'Accede al panel para crear tus canciones', '¡Usa tus créditos cuando quieras!'], nextSingle: ['Estamos procesando tu pedido', 'Tu música se entregará en un plazo de 48 horas', 'Recibirás una notificación cuando esté lista'],
  },
  it: {
    customer: 'Cliente', confirmationTitle: 'Conferma di acquisto', greeting: 'Ciao, {name}! 👋', confirmed: 'Il tuo acquisto è stato confermato con successo!', pixConfirmed: 'Il tuo pagamento PIX è stato confermato con successo!', happy: 'Siamo felici di averti con noi.', paid: 'Pagamento confermato', pixPaid: 'Pagamento PIX confermato', details: '📋 Dettagli dell’acquisto', date: 'Data:', purchaseType: 'Tipo di acquisto:', paymentMethod: 'Metodo di pagamento:', orderId: 'ID ordine:', total: 'Totale pagato:', nextTitle: '🚀 Prossimi passi', dashboard: 'Accedi al mio pannello', support: 'Hai domande? Contattaci:', rights: 'Tutti i diritti riservati.', reason: 'Hai ricevuto questa email perché hai effettuato un acquisto sulla nostra piattaforma.', subject: '🎵 Conferma di acquisto - {plan}', pixSubject: '✅ Pagamento PIX confermato - {plan}', card: 'Carta di credito', plan: 'Piano:', type: 'Tipo:', creditsMonthly: 'Crediti mensili:', nextRenewal: 'Prossimo rinnovo:', package: 'Pacchetto:', credits: 'Crediti:', service: 'Servizio:', product: 'Prodotto:', subscription: 'Abbonamento Creator', packageLabel: 'Pacchetto di musica', video: 'Servizio video', single: 'Musica personalizzata', instrumental: 'Strumentale', vocal: 'Vocale', songsPerMonth: 'canzoni/mese', songs: 'canzoni',
    nextSubscription: ['I tuoi crediti sono già disponibili nel pannello', 'Accedi al pannello per creare la tua prima canzone', 'Il tuo abbonamento si rinnoverà automaticamente ogni mese'], nextPackage: ['I tuoi {credits} crediti sono già disponibili', 'Accedi al pannello per creare le tue canzoni', 'Usa i tuoi crediti quando vuoi!'], nextSingle: ['Stiamo elaborando il tuo ordine', 'La tua musica sarà consegnata entro 48 ore', 'Riceverai una notifica quando sarà pronta'],
  },
} as const;

export function purchaseEmailCopy(language: unknown) {
  return purchaseEmailCopies[resolveGenerationLanguage(language)];
}
