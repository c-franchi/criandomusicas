import { useFlowBusy } from '@/hooks/useFlowBusy';
import { giftLyricText } from "@/lib/gift-link";
import { giftUrl } from "@/lib/gifts";
import GiftShare from "./GiftShare";
import GiftBackground from "./GiftBackground";
import GiftResponseForm from "./GiftResponseForm";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Gift,
  Heart,
  Music2,
  RotateCcw,
  Baby,
  Cake,
  Users,
  TreePine,
  HandHeart,
  Flower2,
  HeartHandshake,
  Sparkles,
} from "lucide-react";
import "@/components/gifts/gifts.css";
import { Button } from "@/components/ui/button";
import { safeImage, type GiftPresentation } from "@/lib/gifts";
const themeStyles: Record<string, string> = {
  christmas: "from-emerald-950 to-red-950",
  love: "from-violet-950 to-rose-950",
  birthday: "from-indigo-950 to-fuchsia-950",
  family: "from-sky-950 to-violet-950",
  birth: "from-teal-950 to-indigo-950",
  friendship: "from-blue-950 to-purple-950",
  gratitude: "from-amber-950 to-violet-950",
  tribute: "from-slate-950 to-indigo-950",
  wedding: "from-purple-950 to-stone-950",
  any: "from-slate-950 to-purple-950",
};
export default function GiftExperience({
  data,
  preview = false,
  onDuration,
  responseToken,
}: {
  data: GiftPresentation;
  preview?: boolean;
  onDuration?: (seconds: number) => void;
  responseToken?: string;
}) {
  const { t } = useTranslation("home");
  const [playing, setPlaying] = useState(false);
  const [responding, setResponding] = useState(false);
  useFlowBusy(playing);
  const [revealed, setRevealed] = useState(data.has_card === false);
  const [time, setTime] = useState(0);
  const [notice, setNotice] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  const ThemeIcon =
    (
      {
        christmas: TreePine,
        love: Heart,
        birthday: Cake,
        family: Users,
        birth: Baby,
        friendship: HeartHandshake,
        gratitude: HandHeart,
        tribute: Flower2,
        wedding: Sparkles,
      } as Record<string, typeof Gift>
    )[data.theme] || Gift;
  const cues = (Array.isArray(data.lyric_cues) ? data.lyric_cues : []).filter(c => c && typeof c.text === "string" && typeof c.time === "number").map(c=>({...c,text:giftLyricText(c.text)})).filter(c=>!!c.text);
  let active = -1;
  for (let i = 0; i < cues.length; i++) if (cues[i].time <= time) active = i;
  const open = () => {
    setRevealed(true);
    if (audio.current)
      void audio.current.play().catch(() => setNotice(t("giftFlow.tapPlay")));
  };
  return (
    <section
      className={`relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${themeStyles[data.theme] || themeStyles.any} p-6 text-center text-white shadow-2xl sm:p-10`}
      aria-label={t("giftFlow.preview")}
    >
      <GiftBackground details={data.details} backgroundData={data.background_data}/>
      <p className="mb-6 text-xs uppercase tracking-[.2em] text-white/75">
        Criando Músicas
      </p>
      {data.is_test && (
        <p className="mb-5 rounded-xl border border-amber-200/40 p-3 text-sm text-amber-100">
          {t("giftFlow.testBadge")}
        </p>
      )}
      {!revealed ? (
        <div className="py-6">
          <ThemeIcon
            className="mx-auto mb-6 h-16 w-16 text-pink-200"
            strokeWidth={1.2}
          />
          <h2 className="font-serif text-3xl leading-snug">
            {t("giftFlow.received")}
          </h2>
          <p className="mt-4 text-lg">{data.recipient_name}</p>
          <Button
            variant="hero"
            onClick={open}
            className="mt-8 h-auto min-h-12 whitespace-normal py-3"
          >
            {t("giftFlow.reveal")}
          </Button>
        </div>
      ) : (
        <div className="gift-reveal">
          <Heart
            className="mx-auto mb-5 h-9 w-9 text-pink-200"
            strokeWidth={1.2}
          />
          <p className="text-sm text-white/70">{t("giftFlow.for")}</p>
          <h2 className="mb-5 font-serif text-3xl">{data.recipient_name}</h2>
          {safeImage(data.photo_data || data.cover_url) && (
            <img
              src={safeImage(data.photo_data || data.cover_url)}
              alt={t("giftFlow.photoAlt")}
              className="mx-auto mb-6 aspect-square w-60 max-w-full rounded-2xl object-cover shadow-lg"
            />
          )}
          <h3 className="text-xl font-semibold">
            {data.title || t("giftFlow.yourSong")}
          </h3>
          <p className="mt-5 whitespace-pre-line break-words text-base leading-relaxed text-white/90">
            {data.dedication}
          </p>
          <p className="mt-4 font-serif text-xl text-pink-200">
            {data.sender_name}
          </p>
        </div>
      )}
      {data.audio_url ? (
        <audio
          ref={audio}
          src={data.audio_url}
          controls
          preload="metadata"
          onLoadedMetadata={() => onDuration?.(audio.current?.duration || 0)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={() => setTime(audio.current?.currentTime || 0)}
          onError={() => setNotice(t("giftFlow.audioLoadError"))}
          className={`mx-auto mt-6 w-full max-w-md ${revealed ? "block" : "hidden"}`}
        />
      ) : (
        <p
          role="status"
          className="mt-6 flex items-center justify-center gap-2 text-sm text-white/70"
        >
          <Music2 className="h-4 w-4" />
          {t(
            preview ? "giftFlow.previewAudioPending" : "giftFlow.audioPending",
          )}
        </p>
      )}
      {revealed && (
        <>

          {cues.length > 0 ? (
            <div className="mt-8 space-y-2 border-t border-white/20 pt-6 text-left">
              <h3 className="mb-4 font-semibold">{t("giftFlow.lyrics")}</h3>
              {cues.map((cue, i) => (
                <button
                  key={`${cue.time}-${i}`}
                  onClick={() => {
                    if (audio.current) audio.current.currentTime = cue.time;
                  }}
                  className={`block w-full rounded-xl p-3 text-left text-sm leading-relaxed ${i === active ? "bg-white/15 font-semibold text-white" : "text-white/60"}`}
                  aria-current={i === active ? "true" : undefined}
                >
                  {cue.text}
                </button>
              ))}
            </div>
          ) : (
            data.lyrics && (
              <div className="mt-8 border-t border-white/20 pt-6 text-left">
                <h3 className="mb-4 font-semibold">{t("giftFlow.lyrics")}</h3>
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-white/80">
                  {giftLyricText(data.lyrics)}
                </p>
              </div>
            )
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                if (audio.current) {
                  audio.current.currentTime = 0;
                  void audio.current
                    .play()
                    .catch(() => setNotice(t("giftFlow.tapPlay")));
                } else setRevealed(false);
              }}
              className="min-h-11"
            >
              <RotateCcw className="h-4 w-4" />
              {t("giftFlow.replay")}
            </Button>

          </div>
          {!preview && responseToken && <div className="mt-7"><Button variant="outline" className="min-h-12 w-full h-auto whitespace-normal py-3 bg-white/10 text-white border-white/30" aria-expanded={responding} onClick={() => setResponding(!responding)}>{t("giftResponse.open")}</Button>{responding && <GiftResponseForm token={responseToken} />}</div>}
          {!preview && (
            <>
              <div className="mt-6"><GiftShare url={data.public_alias ? giftUrl(data.public_alias, window.location.origin, data.product) : window.location.href} title={data.title} received/></div>
              <Button asChild variant="hero" className="mt-6 h-auto min-h-12 w-full whitespace-normal py-3">
                <Link to="/presentes/novo?produto=digital">
                  <Gift className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {t("giftFlow.createForSomeoneElse")}
                </Link>
              </Button>
            </>
          )}
        </>
      )}
      {notice && (
        <p role="status" className="mt-4 text-sm text-pink-100">
          {notice}
        </p>
      )}
      {preview && (
        <p className="mt-7 text-xs text-white/60">
          {t("giftFlow.previewOnly")}
        </p>
      )}
    </section>
  );
}
