// Music Genres Images
import popImg from './genres/pop.jpg';
import rockImg from './genres/rock.jpg';
import rapImg from './genres/rap.jpg';
import sertanejoImg from './genres/sertanejo.jpg';
import mpbImg from './genres/mpb.jpg';
import jazzImg from './genres/jazz.jpg';
import gospelImg from './genres/gospel.jpg';
import forroImg from './genres/forro.jpg';
import pagodeImg from './genres/pagode.jpg';
import bossaImg from './genres/bossa.jpg';
import eletronicoImg from './genres/eletronico.jpg';
import classicoImg from './genres/classico.jpg';

// Music Types Images
import homenagemImg from './types/homenagem.jpg';
import romanticaImg from './types/romantica.jpg';
import motivacionalImg from './types/motivacional.jpg';
import infantilImg from './types/infantil.jpg';
import religiosaImg from './types/religiosa.jpg';
import parodiaImg from './types/parodia.jpg';
import corporativaImg from './types/corporativa.jpg';
import trilhaImg from './types/trilha.jpg';

// Emotions Images
import alegriaImg from './emotions/alegria.jpg';
import saudadeImg from './emotions/saudade.jpg';
import gratidaoImg from './emotions/gratidao.jpg';
import amorImg from './emotions/amor.jpg';
import esperancaImg from './emotions/esperanca.jpg';
import nostalgiaImg from './emotions/nostalgia.jpg';
import superacaoImg from './emotions/superacao.jpg';
import pazImg from './emotions/paz.jpg';
import feImg from './emotions/fe.jpg';

// Voice Types Images
import vozMasculinaImg from './voices/masculina.jpg';
import vozFemininaImg from './voices/feminina.jpg';
import vozInfantilMasculinaImg from './voices/infantil-masculina.jpg';
import vozInfantilFemininaImg from './voices/infantil-feminina.jpg';
import duetoImg from './voices/dueto.jpg';
import duplaMasculinaImg from './voices/dupla-masculina.jpg';
import duplaFemininaImg from './voices/dupla-feminina.jpg';
import coralImg from './voices/coral.jpg';

export const genreImages: Record<string, string> = {
  pop: popImg,
  rock: rockImg,
  rap: rapImg,
  sertanejo: sertanejoImg,
  mpb: mpbImg,
  jazz: jazzImg,
  gospel: gospelImg,
  forro: forroImg,
  pagode: pagodeImg,
  bossa: bossaImg,
  eletronico: eletronicoImg,
  classico: classicoImg,
};

export const typeImages: Record<string, string> = {
  homenagem: homenagemImg,
  romantica: romanticaImg,
  motivacional: motivacionalImg,
  infantil: infantilImg,
  religiosa: religiosaImg,
  parodia: parodiaImg,
  corporativa: corporativaImg,
  trilha: trilhaImg,
};

export const emotionImages: Record<string, string> = {
  alegria: alegriaImg,
  saudade: saudadeImg,
  gratidao: gratidaoImg,
  amor: amorImg,
  esperanca: esperancaImg,
  nostalgia: nostalgiaImg,
  superacao: superacaoImg,
  paz: pazImg,
  fe: feImg,
};

export const voiceImages: Record<string, string> = {
  masculina: vozMasculinaImg,
  feminina: vozFemininaImg,
  'infantil-masculina': vozInfantilMasculinaImg,
  'infantil-feminina': vozInfantilFemininaImg,
  dueto: duetoImg,
  'dupla-masculina': duplaMasculinaImg,
  'dupla-feminina': duplaFemininaImg,
  coral: coralImg,
};

export {
  // Genres
  popImg,
  rockImg,
  rapImg,
  sertanejoImg,
  mpbImg,
  jazzImg,
  gospelImg,
  forroImg,
  pagodeImg,
  bossaImg,
  eletronicoImg,
  classicoImg,
  // Types
  homenagemImg,
  romanticaImg,
  motivacionalImg,
  infantilImg,
  religiosaImg,
  parodiaImg,
  corporativaImg,
  trilhaImg,
  // Emotions
  alegriaImg,
  saudadeImg,
  gratidaoImg,
  amorImg,
  esperancaImg,
  nostalgiaImg,
  superacaoImg,
  pazImg,
  feImg,
  // Voices
  vozMasculinaImg,
  vozFemininaImg,
  vozInfantilMasculinaImg,
  vozInfantilFemininaImg,
  duetoImg,
  duplaMasculinaImg,
  duplaFemininaImg,
  coralImg,
};
