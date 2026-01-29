import { useTranslation } from 'react-i18next';
import { formatCurrency, getCurrencySymbol } from '@/lib/i18n-format';

// Opções de instrumentos disponíveis (IDs para DB)
export const INSTRUMENT_OPTIONS = [
  { id: "piano", label: "piano" },
  { id: "violao", label: "violao" },
  { id: "guitarra", label: "guitarra" },
  { id: "violino", label: "violino" },
  { id: "saxofone", label: "saxofone" },
  { id: "trompete", label: "trompete" },
  { id: "bateria", label: "bateria" },
  { id: "baixo", label: "baixo" },
  { id: "ukulele", label: "ukulele" },
  { id: "acordeao", label: "acordeao" },
  { id: "orquestra", label: "orquestra" },
  { id: "sintetizador", label: "sintetizador" },
  { id: "flauta", label: "flauta" },
  { id: "harpa", label: "harpa" },
  { id: "outro", label: "outro" },
];

export const useBriefingTranslations = () => {
  const { t, i18n } = useTranslation('briefing');
  
  // Get translated instrument options
  const getInstrumentOptions = () => INSTRUMENT_OPTIONS.map(inst => ({
    id: inst.id,
    label: t(`steps.instruments.${inst.id}`)
  }));

  // Get emotion options based on music type
  const getEmotionOptions = (musicType: string) => {
    if (musicType === 'parodia') {
      return [
        { id: "zoeira", label: t('steps.emotion.zoeira') },
        { id: "sarcastico", label: t('steps.emotion.sarcastico') },
        { id: "ironico", label: t('steps.emotion.ironico') },
        { id: "critica", label: t('steps.emotion.critica') },
        { id: "absurdo", label: t('steps.emotion.absurdo') }
      ];
    }
    return [
      { id: "alegria", label: t('steps.emotion.alegria') },
      { id: "saudade", label: t('steps.emotion.saudade') },
      { id: "gratidao", label: t('steps.emotion.gratidao') },
      { id: "amor", label: t('steps.emotion.amor') },
      { id: "esperanca", label: t('steps.emotion.esperanca') },
      { id: "nostalgia", label: t('steps.emotion.nostalgia') },
      { id: "superacao", label: t('steps.emotion.superacao') }
    ];
  };

  // Voice type options
  const voiceTypeOptions = [
    { id: "masculina", label: t('steps.voiceType.masculina'), description: t('steps.voiceType.masculinaDesc') },
    { id: "feminina", label: t('steps.voiceType.feminina'), description: t('steps.voiceType.femininaDesc') },
    { id: "infantil_masc", label: t('steps.voiceType.infantilMasc'), description: t('steps.voiceType.infantilMascDesc') },
    { id: "infantil_fem", label: t('steps.voiceType.infantilFem'), description: t('steps.voiceType.infantilFemDesc') },
    { id: "dueto", label: t('steps.voiceType.dueto'), description: t('steps.voiceType.duetoDesc') },
    { id: "dupla_masc", label: t('steps.voiceType.duplaMasc'), description: t('steps.voiceType.duplaMascDesc') },
    { id: "dupla_fem", label: t('steps.voiceType.duplaFem'), description: t('steps.voiceType.duplaFemDesc') },
    { id: "coral", label: t('steps.voiceType.coral'), description: t('steps.voiceType.coralDesc') }
  ];

  // Voice type options simplified (for custom lyric flow)
  const voiceTypeOptionsSimple = [
    { id: "masculina", label: t('steps.voiceType.masculina') },
    { id: "feminina", label: t('steps.voiceType.feminina') },
    { id: "dueto", label: t('steps.voiceType.dueto') },
    { id: "coral", label: t('steps.voiceType.coral') }
  ];

  // Music type options
  const musicTypeOptions = [
    { id: "homenagem", label: t('steps.musicType.homenagem'), description: t('steps.musicType.homenagemDesc') },
    { id: "romantica", label: t('steps.musicType.romantica'), description: t('steps.musicType.romanticaDesc') },
    { id: "motivacional", label: t('steps.musicType.motivacional'), description: t('steps.musicType.motivacionalDesc') },
    { id: "infantil", label: t('steps.musicType.infantil'), description: t('steps.musicType.infantilDesc') },
    { id: "religiosa", label: t('steps.musicType.religiosa'), description: t('steps.musicType.religiosaDesc') },
    { id: "parodia", label: t('steps.musicType.parodia'), description: t('steps.musicType.parodiaDesc') },
    { id: "corporativa", label: t('steps.musicType.corporativa'), description: t('steps.musicType.corporativaDesc') },
    { id: "trilha", label: t('steps.musicType.trilha'), description: t('steps.musicType.trilhaDesc') }
  ];

  // Music type options for custom lyric
  const musicTypeOptionsCustomLyric = [
    { id: "homenagem", label: t('steps.musicType.homenagem'), description: t('steps.musicType.homenagemDesc') },
    { id: "romantica", label: t('steps.musicType.romantica'), description: t('steps.musicType.romanticaDesc') },
    { id: "motivacional", label: t('steps.musicType.motivacional'), description: t('steps.musicType.motivacionalDesc') },
    { id: "religiosa", label: t('steps.musicType.religiosa'), description: t('steps.musicType.religiosaDesc') },
    { id: "corporativa", label: t('steps.musicType.corporativa'), description: t('steps.musicType.corporativaDesc') }
  ];

  // Corporate format options (institutional vs jingle)
  const corporateFormatOptions = [
    { id: "institucional", label: t('steps.corporateFormat.institucional'), description: t('steps.corporateFormat.institucionalDesc') },
    { id: "jingle", label: t('steps.corporateFormat.jingle'), description: t('steps.corporateFormat.jingleDesc') }
  ];

  // Style options (vocal)
  const styleOptions = [
    { id: "sertanejo", label: t('steps.style.sertanejo') },
    { id: "pop", label: t('steps.style.pop') },
    { id: "rock", label: t('steps.style.rock') },
    { id: "mpb", label: t('steps.style.mpb') },
    { id: "rap", label: t('steps.style.rap') },
    { id: "forro", label: t('steps.style.forro') },
    { id: "pagode", label: t('steps.style.pagode') },
    { id: "gospel", label: t('steps.style.gospel') },
    { id: "bossa", label: t('steps.style.bossa') },
    { id: "outros", label: t('steps.style.outros') }
  ];

  // Style options for custom lyric
  const styleOptionsCustomLyric = [
    { id: "sertanejo", label: t('steps.style.sertanejo') },
    { id: "pop", label: t('steps.style.pop') },
    { id: "rock", label: t('steps.style.rock') },
    { id: "mpb", label: t('steps.style.mpb') },
    { id: "gospel", label: t('steps.style.gospel') },
    { id: "bossa", label: t('steps.style.bossa') },
    { id: "outros", label: t('steps.style.outros') }
  ];

  // Style options (instrumental)
  const instrumentalStyleOptions = [
    { id: "classico", label: t('steps.style.classico') },
    { id: "jazz", label: t('steps.style.jazz') },
    { id: "pop", label: t('steps.style.pop') },
    { id: "rock", label: t('steps.style.rock') },
    { id: "mpb", label: t('steps.style.mpb') },
    { id: "lofi", label: t('steps.style.lofi') },
    { id: "eletronico", label: t('steps.style.eletronico') },
    { id: "bossa", label: t('steps.style.bossa') },
    { id: "ambiente", label: t('steps.style.ambiente') },
    { id: "cinematico", label: t('steps.style.cinematico') },
    { id: "outros", label: t('steps.style.outros') }
  ];

  // Rhythm options
  const rhythmOptions = [
    { id: "lento", label: t('steps.rhythm.lento'), description: t('steps.rhythm.lentoDesc') },
    { id: "moderado", label: t('steps.rhythm.moderado'), description: t('steps.rhythm.moderadoDesc') },
    { id: "animado", label: t('steps.rhythm.animado'), description: t('steps.rhythm.animadoDesc') }
  ];

  // Atmosphere options
  const atmosphereOptions = [
    { id: "intimo", label: t('steps.atmosphere.intimo'), description: t('steps.atmosphere.intimoDesc') },
    { id: "festivo", label: t('steps.atmosphere.festivo'), description: t('steps.atmosphere.festivoDesc') },
    { id: "melancolico", label: t('steps.atmosphere.melancolico'), description: t('steps.atmosphere.melancolicoDesc') },
    { id: "epico", label: t('steps.atmosphere.epico'), description: t('steps.atmosphere.epicoDesc') },
    { id: "leve", label: t('steps.atmosphere.leve'), description: t('steps.atmosphere.leveDesc') },
    { id: "misterioso", label: t('steps.atmosphere.misterioso'), description: t('steps.atmosphere.misteriosoDesc') }
  ];

  // Atmosphere options simplified
  const atmosphereOptionsSimple = [
    { id: "intimo", label: t('steps.atmosphere.intimo') },
    { id: "festivo", label: t('steps.atmosphere.festivo') },
    { id: "melancolico", label: t('steps.atmosphere.melancolico') },
    { id: "epico", label: t('steps.atmosphere.epico') },
    { id: "leve", label: t('steps.atmosphere.leve') }
  ];

  // Solo options
  const soloOptions = {
    wantSolo: [
      { id: "want_solo", label: t('steps.solo.yesSolo') },
      { id: "none", label: t('steps.solo.noSolo') }
    ],
    moment: [
      { id: "intro", label: t('steps.solo.intro'), description: t('steps.solo.introDesc') },
      { id: "meio", label: t('steps.solo.middle'), description: t('steps.solo.middleDesc') },
      { id: "final", label: t('steps.solo.end'), description: t('steps.solo.endDesc') },
      { id: "auto", label: t('steps.solo.auto'), description: t('steps.solo.autoDesc') }
    ]
  };

  // Name generation options
  const nameOptions = [
    { id: "auto", label: t('steps.songName.auto'), description: t('steps.songName.autoDesc') },
    { id: "manual", label: t('steps.songName.manual'), description: t('steps.songName.manualDesc') }
  ];

  // Custom lyric style prompt options
  const customStylePromptOptions = [
    { id: "yes", label: t('steps.customLyric.yesStyle'), description: t('steps.customLyric.yesStyleDesc') },
    { id: "no", label: t('steps.customLyric.noStyle'), description: t('steps.customLyric.noStyleDesc') }
  ];

  // Is instrumental options
  const isInstrumentalOptions = [
    { id: "cantada", label: t('steps.isInstrumental.sung'), description: t('steps.isInstrumental.sungDesc') },
    { id: "custom_lyric", label: t('steps.isInstrumental.customLyric'), description: t('steps.isInstrumental.customLyricDesc') },
    { id: "instrumental", label: t('steps.isInstrumental.instrumental'), description: t('steps.isInstrumental.instrumentalDesc') }
  ];

  // Plan labels for display
  const getPlanLabels = () => ({
    'single': { name: t('planSelection.single'), credits: 1, icon: '🎵' },
    'single_instrumental': { name: t('planSelection.single') + ' 🎹', credits: 1, icon: '🎹' },
    'single_custom_lyric': { name: t('steps.isInstrumental.customLyric'), credits: 1, icon: '📝' },
    'package': { name: t('planSelection.package3'), credits: 3, icon: '🎶' },
    'package_instrumental': { name: t('planSelection.package3') + ' 🎹', credits: 3, icon: '🎹' },
    'subscription': { name: t('planSelection.package5'), credits: 5, icon: '👑' },
    'subscription_instrumental': { name: t('planSelection.package5') + ' 🎹', credits: 5, icon: '🎹' },
  });

  // Get intensity labels
  const getIntensityLabels = () => [
    t('confirmation.intensityLabels.1', 'Muito sutil'),
    t('confirmation.intensityLabels.2', 'Sutil'),
    t('confirmation.intensityLabels.3', 'Moderada'),
    t('confirmation.intensityLabels.4', 'Intensa'),
    t('confirmation.intensityLabels.5', 'Muito intensa')
  ];

  // Chat messages - all translated
  const getChatMessages = () => ({
    isInstrumental: t('steps.isInstrumental.question'),
    musicType: t('steps.musicType.question'),
    musicTypeCustomLyric: t('steps.musicType.questionCustomLyric', 'What type of music do you imagine for these lyrics?'),
    style: t('steps.style.question'),
    styleCustomLyric: t('steps.style.questionCustomLyric', 'Which musical style matches your lyrics?'),
    instruments: t('steps.instruments.question'),
    wantSolo: t('steps.solo.wantSolo'),
    whichInstrument: t('steps.solo.whichInstrument'),
    soloMoment: t('steps.solo.when'),
    rhythm: t('steps.rhythm.question'),
    rhythmCustomLyric: t('steps.rhythm.questionCustomLyric', 'Which rhythm fits best with your music?'),
    atmosphere: t('steps.atmosphere.question'),
    storyInstrumental: t('steps.story.questionInstrumental'),
    storyVocal: t('steps.story.questionVocal'),
    emotion: t('steps.emotion.question'),
    emotionParody: t('steps.emotion.questionParody'),
    emotionIntensity: t('steps.emotionIntensity.question'),
    mandatoryWords: t('steps.mandatoryWords.question'),
    voiceType: t('steps.voiceType.question'),
    songNameAuto: t('steps.songName.autoQuestion'),
    songNameAutoInstrumental: t('steps.songName.autoQuestionInstrumental', 'Almost there! 🎵\n\nDo you want to name your instrumental music or let the AI suggest?'),
    songNameInput: t('steps.songName.inputQuestion'),
    songNameInputInstrumental: t('steps.songName.inputQuestionInstrumental'),
    songNameCustomLyric: t('steps.songName.inputQuestionCustomLyric', 'What name do you want to give your song? ✨'),
    customLyricPaste: t('steps.customLyric.pasteQuestion'),
    hasStylePrompt: t('steps.customLyric.hasStyleQuestion'),
    pasteStyle: t('steps.customLyric.pasteStyle'),
    // Corporate jingle flow
    corporateFormat: t('steps.corporateFormat.question', 'Which corporate format do you want? 🏢'),
    contactInfo: t('steps.corporateFormat.contactInfoQuestion', 'Provide the contact information for the jingle 📞\n\nInclude: phone, address, website, social media...'),
    callToAction: t('steps.corporateFormat.callToActionQuestion', 'What call to action should be in the jingle? 📢\n\nExample: "Call now!", "Visit our store!", "Follow us on Instagram!"'),
  });

  // Restore session messages
  const getRestoreSessionMessages = () => ({
    welcome: t('restoreSession.welcome'),
    description: t('restoreSession.description'),
    continueLabel: t('restoreSession.continue'),
    continueDesc: t('restoreSession.continueDesc'),
    restartLabel: t('restoreSession.restart'),
    restartDesc: t('restoreSession.restartDesc')
  });

  // Confirmation labels
  const getConfirmationLabels = () => ({
    title: t('confirmation.title'),
    subtitle: t('confirmation.subtitle'),
    summary: t('confirmation.summary'),
    musicType: t('confirmation.musicType'),
    emotion: t('confirmation.emotion'),
    style: t('confirmation.style'),
    rhythm: t('confirmation.rhythm'),
    atmosphere: t('confirmation.atmosphere'),
    voiceType: t('confirmation.voiceType'),
    songName: t('confirmation.songName'),
    story: t('confirmation.story'),
    context: t('confirmation.context'),
    customLyric: t('confirmation.customLyric'),
    instruments: t('confirmation.instruments'),
    solo: t('confirmation.solo'),
    soloMoment: t('confirmation.soloMoment'),
    autoName: t('confirmation.autoName'),
    aiGenerated: t('confirmation.aiGenerated'),
    noSolo: t('confirmation.noSolo'),
    none: t('confirmation.none'),
    confirm: t('confirmation.confirm'),
    back: t('confirmation.back'),
    restart: t('confirmation.restart'),
    editField: t('confirmation.editField'),
    format: t('confirmation.format'),
    type: t('confirmation.type'),
    notes: t('confirmation.notes'),
    intensity: t('confirmation.intensity'),
    mandatoryWords: t('confirmation.mandatoryWords'),
    stylePrompt: t('confirmation.stylePrompt'),
    customLyricBadge: t('confirmation.customLyricBadge'),
    instrumentalBadge: t('confirmation.instrumentalBadge'),
    vocalBadge: t('confirmation.vocalBadge'),
    confidentiality: {
      label: t('confirmation.confidentiality.label'),
      description: t('confirmation.confidentiality.description')
    }
  });

  // Credit modal
  const getCreditModalLabels = () => ({
    title: t('creditModal.title'),
    description: t('creditModal.description', { count: 1 }),
    descriptionPlural: t('creditModal.description_plural', { count: 2 }),
    useCredit: t('creditModal.useCredit'),
    buyNew: t('creditModal.buyNew'),
    processing: t('creditModal.processing'),
  });

  // Toast messages
  const getToastMessages = () => ({
    briefingCreated: t('toast.briefingCreated'),
    errorCreating: t('toast.errorCreating'),
    creditUsed: t('toast.creditUsed'),
    creditError: t('toast.creditError'),
    savedCleared: t('toast.savedCleared'),
    loginRequired: t('toast.loginRequired'),
  });

  // Chat flow buttons
  const getChatButtons = () => ({
    typeMessage: t('chat.typeMessage'),
    send: t('chat.send'),
    skip: t('chat.skip'),
    next: t('chat.next'),
    back: t('chat.back'),
    confirm: t('chat.confirm'),
    edit: t('chat.edit'),
    optional: t('chat.optional')
  });

  // Format currency helper
  const formatPrice = (cents: number, convert = true) => formatCurrency(cents, i18n.language, { convert });
  const currencySymbol = getCurrencySymbol(i18n.language);

  return {
    t,
    i18n,
    // Options
    getInstrumentOptions,
    getEmotionOptions,
    voiceTypeOptions,
    voiceTypeOptionsSimple,
    musicTypeOptions,
    musicTypeOptionsCustomLyric,
    styleOptions,
    styleOptionsCustomLyric,
    instrumentalStyleOptions,
    rhythmOptions,
    atmosphereOptions,
    atmosphereOptionsSimple,
    soloOptions,
    nameOptions,
    customStylePromptOptions,
    isInstrumentalOptions,
    corporateFormatOptions,
    // Labels
    getPlanLabels,
    getIntensityLabels,
    getChatMessages,
    getChatButtons,
    getRestoreSessionMessages,
    getConfirmationLabels,
    getCreditModalLabels,
    getToastMessages,
    // Currency
    formatPrice,
    currencySymbol,
  };
};
