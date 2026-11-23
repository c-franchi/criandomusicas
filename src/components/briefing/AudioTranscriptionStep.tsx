import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";
import { FileText, Loader2, RotateCcw, Edit3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface AudioTranscriptionStepProps {
  transcript: string;
  isTranscribing: boolean;
  onTranscribe: () => void;
  onTranscriptChange: (value: string) => void;
  onNext: () => void;
}

export const AudioTranscriptionStep = ({
  transcript,
  isTranscribing,
  onTranscribe,
  onTranscriptChange,
  onNext,
}: AudioTranscriptionStepProps) => {
  const { t: tb } = useTranslation('uiBriefing');
  return (
    <motion.div
      key="transcription"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">{tb('text116')}</h2>
        <p className="text-sm text-muted-foreground">
          {transcript
            ? tb('text117')
            : tb('text118')}
        </p>
      </div>

      {!transcript && !isTranscribing && (
        <div className="flex justify-center">
          <Button size="lg" onClick={onTranscribe}>
            <FileText className="w-5 h-5 mr-2" />
            {tb('text119')}
          </Button>
        </div>
      )}

      {isTranscribing && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">{tb('text120')}</p>
        </div>
      )}

      {transcript && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              <Edit3 className="w-3 h-3 mr-1" /> {tb('text121')}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTranscribe}
              disabled={isTranscribing}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              {tb('text122')}
            </Button>
          </div>
          <Textarea
            value={transcript}
            onChange={(e) => onTranscriptChange(e.target.value)}
            rows={4}
            placeholder={tb('text123')}
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">
            {tb('text124')}
          </p>

          <div className="flex justify-end">
            <Button onClick={onNext}>
              {tb('text125')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AudioTranscriptionStep;
