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
    if (musicType === 'motivacional') {
      return [
        { id: "determinacao", label: t('steps.motivational.emotion.determinacao') },
        { id: "confianca", label: t('steps.motivational.emotion.confianca') },
        { id: "forca_interior", label: t('steps.motivational.emotion.forcaInterior') },
        { id: "coragem", label: t('steps.motivational.emotion.coragem') },
        { id: "foco", label: t('steps.motivational.emotion.foco') },
        { id: "vitoria", label: t('steps.motivational.emotion.vitoria') },
        { id: "superacao_dor", label: t('steps.motivational.emotion.superacaoDor') }
      ];
    }
    if (musicType === 'religiosa') {
      return [
        { id: "paz", label: t('steps.gospel.emotion.paz') },
        { id: "fe", label: t('steps.gospel.emotion.fe') },
        { id: "esperanca", label: t('steps.gospel.emotion.esperanca') },
        { id: "quebrantamento", label: t('steps.gospel.emotion.quebrantamento') },
        { id: "confianca", label: t('steps.gospel.emotion.confianca') },
        { id: "alegria", label: t('steps.gospel.emotion.alegria') },
        { id: "reverencia", label: t('steps.gospel.emotion.reverencia') }
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

  // Motivational flow options
  const motivationalMomentOptions = [
    { id: "treino", label: t('steps.motivational.moment.treino'), description: t('steps.motivational.moment.treinoDesc') },
    { id: "superacao", label: t('steps.motivational.moment.superacao'), description: t('steps.motivational.moment.superacaoDesc') },
    { id: "estudo", label: t('steps.motivational.moment.estudo'), description: t('steps.motivational.moment.estudoDesc') },
    { id: "trabalho", label: t('steps.motivational.moment.trabalho'), description: t('steps.motivational.moment.trabalhoDesc') },
    { id: "recomeco", label: t('steps.motivational.moment.recomeco'), description: t('steps.motivational.moment.recomecoDesc') },
    { id: "disciplina", label: t('steps.motivational.moment.disciplina'), description: t('steps.motivational.moment.disciplinaDesc') },
  ];

  const motivationalIntensityOptions = [
    { id: "calma", label: t('steps.motivational.intensity.calma'), description: t('steps.motivational.intensity.calmaDesc') },
    { id: "crescente", label: t('steps.motivational.intensity.crescente'), description: t('steps.motivational.intensity.crescenteDesc') },
    { id: "intensa", label: t('steps.motivational.intensity.intensa'), description: t('steps.motivational.intensity.intensaDesc') },
    { id: "agressiva", label: t('steps.motivational.intensity.agressiva'), description: t('steps.motivational.intensity.agressivaDesc') },
  ];

  const motivationalNarrativeOptions = [
    { id: "cantada", label: t('steps.motivational.narrative.cantada') },
    { id: "cantada_monologue", label: t('steps.motivational.narrative.cantadaMonologue') },
    { id: "mais_falada", label: t('steps.motivational.narrative.maisFalada') },
    { id: "narrador", label: t('steps.motivational.narrative.narrador') },
  ];

  const motivationalPerspectiveOptions = [
    { id: "primeira_pessoa", label: t('steps.motivational.perspective.primeiraPessoa'), description: t('steps.motivational.perspective.primeiraPessoaDesc') },
    { id: "mentor", label: t('steps.motivational.perspective.mentor'), description: t('steps.motivational.perspective.mentorDesc') },
    { id: "universal", label: t('steps.motivational.perspective.universal'), description: t('steps.motivational.perspective.universalDesc') },
  ];

  const motivationalStyleOptions = [
    { id: "rock_motivacional", label: t('steps.motivational.style.rock') },
    { id: "rap_motivacional", label: t('steps.motivational.style.rap') },
    { id: "trap_motivacional", label: t('steps.motivational.style.trap') },
    { id: "hiphop_classico", label: t('steps.motivational.style.hiphop') },
    { id: "eletronica_epica", label: t('steps.motivational.style.eletronica') },
    { id: "lofi_motivacional", label: t('steps.motivational.style.lofi') },
    { id: "auto", label: t('steps.motivational.style.auto') },
  ];

  // Get motivational chat messages
  const getMotivationalChatMessages = () => ({
    intro: t('steps.motivational.intro'),
    moment: t('steps.motivational.moment.question'),
    intensity: t('steps.motivational.intensity.question'),
    style: t('steps.motivational.style.question'),
    narrative: t('steps.motivational.narrative.question'),
    perspective: t('steps.motivational.perspective.question'),
    story: t('steps.motivational.story.question'),
  });

  // Gospel/Religious flow options
  const gospelContextOptions = [
    { id: "adoracao", label: t('steps.gospel.context.adoracao'), description: t('steps.gospel.context.adoracaoDesc') },
    { id: "louvor", label: t('steps.gospel.context.louvor'), description: t('steps.gospel.context.louvorDesc') },
    { id: "oracao", label: t('steps.gospel.context.oracao'), description: t('steps.gospel.context.oracaoDesc') },
    { id: "confianca", label: t('steps.gospel.context.confianca'), description: t('steps.gospel.context.confiancaDesc') },
    { id: "esperanca", label: t('steps.gospel.context.esperanca'), description: t('steps.gospel.context.esperancaDesc') },
    { id: "gratidao", label: t('steps.gospel.context.gratidao'), description: t('steps.gospel.context.gratidaoDesc') },
    { id: "restauracao", label: t('steps.gospel.context.restauracao'), description: t('steps.gospel.context.restauracaoDesc') },
    { id: "consagracao", label: t('steps.gospel.context.consagracao'), description: t('steps.gospel.context.consagracaoDesc') },
  ];

  const gospelEmotionOptions = [
    { id: "paz", label: t('steps.gospel.emotion.paz') },
    { id: "fe", label: t('steps.gospel.emotion.fe') },
    { id: "esperanca", label: t('steps.gospel.emotion.esperanca') },
    { id: "quebrantamento", label: t('steps.gospel.emotion.quebrantamento') },
    { id: "confianca", label: t('steps.gospel.emotion.confianca') },
    { id: "alegria", label: t('steps.gospel.emotion.alegria') },
    { id: "reverencia", label: t('steps.gospel.emotion.reverencia') },
  ];

  const gospelIntensityOptions = [
    { id: "suave", label: t('steps.gospel.intensity.suave'), description: t('steps.gospel.intensity.suaveDesc') },
    { id: "crescente", label: t('steps.gospel.intensity.crescente'), description: t('steps.gospel.intensity.crescenteDesc') },
    { id: "congregacional", label: t('steps.gospel.intensity.congregacional'), description: t('steps.gospel.intensity.congregacionalDesc') },
    { id: "profetica", label: t('steps.gospel.intensity.profetica'), description: t('steps.gospel.intensity.profeticaDesc') },
  ];

  const gospelStyleOptions = [
    { id: "worship", label: t('steps.gospel.style.worship') },
    { id: "congregacional", label: t('steps.gospel.style.congregacional') },
    { id: "tradicional", label: t('steps.gospel.style.tradicional') },
    { id: "acustico", label: t('steps.gospel.style.acustico') },
    { id: "instrumental_canto", label: t('steps.gospel.style.instrumentalCanto') },
    { id: "auto", label: t('steps.gospel.style.auto') },
  ];

  const gospelNarrativeOptions = [
    { id: "cantada", label: t('steps.gospel.narrative.cantada') },
    { id: "leituras", label: t('steps.gospel.narrative.leituras') },
    { id: "monologos", label: t('steps.gospel.narrative.monologos') },
    { id: "narrador", label: t('steps.gospel.narrative.narrador') },
  ];

  const gospelPerspectiveOptions = [
    { id: "primeira_pessoa", label: t('steps.gospel.perspective.primeiraPessoa'), description: t('steps.gospel.perspective.primeiraPessoaDesc') },
    { id: "congregacional", label: t('steps.gospel.perspective.congregacional'), description: t('steps.gospel.perspective.congregacionalDesc') },
    { id: "profetica", label: t('steps.gospel.perspective.profetica'), description: t('steps.gospel.perspective.profeticaDesc') },
  ];

  // Get gospel chat messages
  const getGospelChatMessages = () => ({
    intro: t('steps.gospel.intro'),
    context: t('steps.gospel.context.question'),
    emotion: t('steps.gospel.emotion.question'),
    intensity: t('steps.gospel.intensity.question'),
    style: t('steps.gospel.style.question'),
    narrative: t('steps.gospel.narrative.question'),
    perspective: t('steps.gospel.perspective.question'),
    biblicalReference: t('steps.gospel.biblicalReference.question'),
    story: t('steps.gospel.story.question'),
  });

  // Children's music flow options
  const childAgeGroupOptions = [
    { id: "0-3", label: t('children.ageGroup.0-3'), description: t('children.ageGroup.0-3Desc') },
    { id: "4-6", label: t('children.ageGroup.4-6'), description: t('children.ageGroup.4-6Desc') },
    { id: "7-9", label: t('children.ageGroup.7-9'), description: t('children.ageGroup.7-9Desc') },
    { id: "10-12", label: t('children.ageGroup.10-12'), description: t('children.ageGroup.10-12Desc') },
  ];

  const childObjectiveOptions = [
    { id: "diversao", label: t('children.objective.diversao'), description: t('children.objective.diversaoDesc') },
    { id: "valores", label: t('children.objective.valores'), description: t('children.objective.valoresDesc') },
    { id: "rotina", label: t('children.objective.rotina'), description: t('children.objective.rotinaDesc') },
    { id: "educacao", label: t('children.objective.educacao'), description: t('children.objective.educacaoDesc') },
    { id: "emocoes", label: t('children.objective.emocoes'), description: t('children.objective.emocoesDesc') },
    { id: "aventura", label: t('children.objective.aventura'), description: t('children.objective.aventuraDesc') },
  ];

  const childThemeOptions = [
    { id: "animais", label: t('children.theme.animais') },
    { id: "natureza", label: t('children.theme.natureza') },
    { id: "familia", label: t('children.theme.familia') },
    { id: "escola", label: t('children.theme.escola') },
    { id: "fantasia", label: t('children.theme.fantasia'), description: t('children.theme.fantasiaDesc') },
    { id: "profissoes", label: t('children.theme.profissoes') },
    { id: "superacao", label: t('children.theme.superacao'), description: t('children.theme.superacaoDesc') },
  ];

  const childMoodOptions = [
    { id: "alegre", label: t('children.mood.alegre') },
    { id: "calma", label: t('children.mood.calma') },
    { id: "animada", label: t('children.mood.animada') },
    { id: "suave", label: t('children.mood.suave') },
  ];

  const childStyleOptions = [
    { id: "cantiga", label: t('children.style.cantiga'), description: t('children.style.cantigaDesc') },
    { id: "pop", label: t('children.style.pop'), description: t('children.style.popDesc') },
    { id: "educativo", label: t('children.style.educativo'), description: t('children.style.educativoDesc') },
    { id: "ninar", label: t('children.style.ninar'), description: t('children.style.ninarDesc') },
    { id: "desenho", label: t('children.style.desenho'), description: t('children.style.desenhoDesc') },
    { id: "auto", label: t('children.style.auto'), description: t('children.style.autoDesc') },
  ];

  const childInteractionOptions = [
    { id: "sim", label: t('children.interaction.yes'), description: t('children.interaction.yesDesc') },
    { id: "nao", label: t('children.interaction.no'), description: t('children.interaction.noDesc') },
  ];

  const childNarrativeOptions = [
    { id: "cantada", label: t('children.narrative.cantada') },
    { id: "cantada_falas", label: t('children.narrative.cantadaFalas') },
    { id: "narrador", label: t('children.narrative.narrador') },
    { id: "historia", label: t('children.narrative.historia') },
  ];

  const childVoiceOptions = [
    { id: "infantil_masc", label: t('steps.voiceType.infantilMasc'), description: t('steps.voiceType.infantilMascDesc') },
    { id: "infantil_fem", label: t('steps.voiceType.infantilFem'), description: t('steps.voiceType.infantilFemDesc') },
  ];

  // Soundtrack flow options
  const soundtrackUsageOptions = [
    { id: "video_institucional", label: t('steps.soundtrack.usage.videoInstitucional') },
    { id: "filme", label: t('steps.soundtrack.usage.filme') },
    { id: "trailer", label: t('steps.soundtrack.usage.trailer') },
    { id: "jogo", label: t('steps.soundtrack.usage.jogo') },
    { id: "podcast", label: t('steps.soundtrack.usage.podcast') },
    { id: "redes_sociais", label: t('steps.soundtrack.usage.redesSociais') },
    { id: "meditacao", label: t('steps.soundtrack.usage.meditacao') },
    { id: "ambiente", label: t('steps.soundtrack.usage.ambiente') },
  ];

  const soundtrackEmotionOptions = [
    { id: "suspense", label: t('steps.soundtrack.emotion.suspense') },
    { id: "drama", label: t('steps.soundtrack.emotion.drama') },
    { id: "inspiracao", label: t('steps.soundtrack.emotion.inspiracao') },
    { id: "tensao", label: t('steps.soundtrack.emotion.tensao') },
    { id: "acao", label: t('steps.soundtrack.emotion.acao') },
    { id: "paz", label: t('steps.soundtrack.emotion.paz') },
    { id: "misterio", label: t('steps.soundtrack.emotion.misterio') },
    { id: "alegria", label: t('steps.soundtrack.emotion.alegria') },
  ];

  const soundtrackDynamicsOptions = [
    { id: "constante", label: t('steps.soundtrack.dynamics.constante'), description: t('steps.soundtrack.dynamics.constanteDesc') },
    { id: "crescente", label: t('steps.soundtrack.dynamics.crescente'), description: t('steps.soundtrack.dynamics.crescenteDesc') },
    { id: "crescente_climax", label: t('steps.soundtrack.dynamics.crescenteClimax'), description: t('steps.soundtrack.dynamics.crescenteClimaxDesc') },
    { id: "ondulada", label: t('steps.soundtrack.dynamics.ondulada'), description: t('steps.soundtrack.dynamics.onduladaDesc') },
    { id: "minimalista", label: t('steps.soundtrack.dynamics.minimalista'), description: t('steps.soundtrack.dynamics.minimalistaDesc') },
  ];

  const soundtrackStyleOptions = [
    { id: "epico", label: t('steps.soundtrack.style.epico'), description: t('steps.soundtrack.style.epicoDesc') },
    { id: "emocional", label: t('steps.soundtrack.style.emocional'), description: t('steps.soundtrack.style.emocionalDesc') },
    { id: "eletronica_ambiente", label: t('steps.soundtrack.style.eletronicaAmbiente') },
    { id: "orquestral", label: t('steps.soundtrack.style.orquestral') },
    { id: "piano_solo", label: t('steps.soundtrack.style.pianoSolo') },
    { id: "ambient", label: t('steps.soundtrack.style.ambient') },
    { id: "lofi", label: t('steps.soundtrack.style.lofi') },
    { id: "auto", label: t('steps.soundtrack.style.auto') },
  ];

  const soundtrackRhythmOptions = [
    { id: "lento", label: t('steps.soundtrack.rhythm.lento') },
    { id: "medio", label: t('steps.soundtrack.rhythm.medio') },
    { id: "rapido", label: t('steps.soundtrack.rhythm.rapido') },
    { id: "variavel", label: t('steps.soundtrack.rhythm.variavel') },
  ];

  const soundtrackVoiceOptions = [
    { id: "instrumental", label: t('steps.soundtrack.voice.instrumental'), description: t('steps.soundtrack.voice.instrumentalDesc') },
    { id: "vocalizacoes", label: t('steps.soundtrack.voice.vocalizacoes'), description: t('steps.soundtrack.voice.vocalizacoesDesc') },
    { id: "monologo_falado", label: t('steps.soundtrack.voice.monologoFalado'), description: t('steps.soundtrack.voice.monologoFaladoDesc') },
    { id: "voz_eterea", label: t('steps.soundtrack.voice.vozEterea'), description: t('steps.soundtrack.voice.vozEtereaDesc') },
  ];

  const soundtrackLanguageOptions = [
    { id: "pt", label: t('steps.soundtrack.language.pt') },
    { id: "en", label: t('steps.soundtrack.language.en') },
    { id: "es", label: t('steps.soundtrack.language.es') },
  ];

  // Get soundtrack chat messages
  const getSoundtrackChatMessages = () => ({
    intro: t('steps.soundtrack.intro'),
    usage: t('steps.soundtrack.usage.question'),
    emotion: t('steps.soundtrack.emotion.question'),
    dynamics: t('steps.soundtrack.dynamics.question'),
    style: t('steps.soundtrack.style.question'),
    rhythm: t('steps.soundtrack.rhythm.question'),
    voice: t('steps.soundtrack.voice.question'),
    scene: t('steps.soundtrack.scene.question'),
    language: t('steps.soundtrack.language.question'),
  });

  // Get children's chat messages
  const getChildrenChatMessages = () => ({
    intro: t('children.intro'),
    ageGroup: t('children.ageGroup.question'),
    objective: t('children.objective.question'),
    theme: t('children.theme.question'),
    mood: t('children.mood.question'),
    style: t('children.style.question'),
    interaction: t('children.interaction.question'),
    narrative: t('children.narrative.question'),
    story: t('children.story.question'),
  });

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
    { id: "reggae", label: t('steps.style.reggae') },
    { id: "bossa", label: t('steps.style.bossa') },
    { id: "ambiente", label: t('steps.style.ambiente') },
    { id: "outros", label: t('steps.style.outros') }
  ];

  // Style options for custom lyric
  const styleOptionsCustomLyric = [
    { id: "sertanejo", label: t('steps.style.sertanejo') },
    { id: "pop", label: t('steps.style.pop') },
    { id: "rock", label: t('steps.style.rock') },
    { id: "mpb", label: t('steps.style.mpb') },
    { id: "gospel", label: t('steps.style.gospel') },
    { id: "reggae", label: t('steps.style.reggae') },
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
    // Motivational options
    motivationalMomentOptions,
    motivationalIntensityOptions,
    motivationalNarrativeOptions,
    motivationalPerspectiveOptions,
    motivationalStyleOptions,
    getMotivationalChatMessages,
    // Gospel/Religious options
    gospelContextOptions,
    gospelEmotionOptions,
    gospelIntensityOptions,
    gospelStyleOptions,
    gospelNarrativeOptions,
    gospelPerspectiveOptions,
    getGospelChatMessages,
    // Children's music options
    childAgeGroupOptions,
    childObjectiveOptions,
    childThemeOptions,
    childMoodOptions,
    childStyleOptions,
    childInteractionOptions,
    childNarrativeOptions,
    childVoiceOptions,
    getChildrenChatMessages,
    // Soundtrack options
    soundtrackUsageOptions,
    soundtrackEmotionOptions,
    soundtrackDynamicsOptions,
    soundtrackStyleOptions,
    soundtrackRhythmOptions,
    soundtrackVoiceOptions,
    soundtrackLanguageOptions,
    getSoundtrackChatMessages,
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
