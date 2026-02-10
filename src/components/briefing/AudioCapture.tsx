import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Play, Pause, RotateCcw, Upload, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AudioCaptureProps {
  onAudioUploaded: (audioId: string, duration: number) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_TYPES = ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/webm', 'audio/ogg'];

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const AudioCapture = ({ onAudioUploaded, disabled }: AudioCaptureProps) => {
  const { user } = useAuth();
  const recorder = useAudioRecorder();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !recorder.audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, recorder.audioUrl]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Formato não suportado. Use WAV, MP3, M4A ou WebM.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo 20MB.');
      return;
    }

    // Create audio element to get duration
    const audioUrl = URL.createObjectURL(file);
    const audio = new Audio(audioUrl);
    
    audio.onloadedmetadata = () => {
      const duration = Math.round(audio.duration);
      if (duration < 3) {
        toast.error('Áudio muito curto. Mínimo 3 segundos.');
        URL.revokeObjectURL(audioUrl);
        return;
      }
      if (duration > 360) {
        toast.error('Áudio muito longo. Máximo 6 minutos.');
        URL.revokeObjectURL(audioUrl);
        return;
      }

      // Upload the file
      uploadAudio(file, file.type, duration, 'upload');
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = () => {
      toast.error('Erro ao ler o arquivo de áudio.');
      URL.revokeObjectURL(audioUrl);
    };

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const uploadAudio = useCallback(async (
    blob: Blob,
    mimeType: string,
    duration: number,
    source: 'recording' | 'upload'
  ) => {
    if (!user) {
      toast.error('Faça login para continuar.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Determine extension
      const extMap: Record<string, string> = {
        'audio/wav': 'wav', 'audio/x-wav': 'wav',
        'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
        'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a',
        'audio/webm': 'webm', 'audio/webm;codecs=opus': 'webm',
        'audio/ogg': 'ogg',
      };
      const ext = extMap[mimeType] || 'webm';
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      setUploadProgress(30);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('audio-inputs')
        .upload(fileName, blob, { contentType: mimeType });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Create audio_inputs record
      const { data: audioInput, error: insertError } = await supabase
        .from('audio_inputs')
        .insert({
          user_id: user.id,
          storage_path: fileName,
          mime_type: mimeType,
          duration_sec: duration,
          size_bytes: blob.size,
          source,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadProgress(100);

      toast.success('Áudio enviado com sucesso!');
      onAudioUploaded(audioInput.id, duration);

    } catch (error: unknown) {
      console.error('Upload error:', error);
      const msg = error instanceof Error ? error.message : 'Erro ao enviar áudio';
      toast.error('Falha no upload', { description: msg });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [user, onAudioUploaded]);

  const handleSendRecording = useCallback(() => {
    if (!recorder.audioBlob) return;
    
    // Determine mime type from blob
    const mimeType = recorder.audioBlob.type || 'audio/webm';
    uploadAudio(recorder.audioBlob, mimeType, recorder.duration, 'recording');
  }, [recorder.audioBlob, recorder.duration, uploadAudio]);

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <div className="flex flex-col items-center gap-4">
        {/* Main Record Button */}
        <motion.button
          onClick={recorder.status === 'recording' ? recorder.stopRecording : recorder.startRecording}
          disabled={disabled || isUploading || recorder.status === 'recorded'}
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
            "shadow-lg focus:outline-none focus:ring-4",
            recorder.status === 'recording'
              ? "bg-red-500 hover:bg-red-600 focus:ring-red-500/30 animate-pulse"
              : recorder.status === 'recorded'
                ? "bg-green-500/20 cursor-default"
                : "bg-primary hover:bg-primary/90 focus:ring-primary/30",
            (disabled || isUploading) && "opacity-50 cursor-not-allowed"
          )}
          whileTap={{ scale: 0.95 }}
        >
          {recorder.status === 'recording' ? (
            <MicOff className="w-10 h-10 text-white" />
          ) : recorder.status === 'recorded' ? (
            <CheckCircle className="w-10 h-10 text-green-500" />
          ) : (
            <Mic className="w-10 h-10 text-white" />
          )}
        </motion.button>

        {/* Duration */}
        <div className="text-center">
          {recorder.status === 'recording' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <p className="text-2xl font-mono font-bold text-red-500">
                {formatTime(recorder.duration)}
              </p>
              <p className="text-xs text-muted-foreground">Gravando... (máx 1:30)</p>
              <div className="w-48 mx-auto">
                <Progress value={(recorder.duration / 90) * 100} className="h-1" />
              </div>
            </motion.div>
          )}

          {recorder.status === 'idle' && !recorder.error && (
            <p className="text-sm text-muted-foreground">
              Toque para gravar (3s a 90s)
            </p>
          )}

          {recorder.status === 'recorded' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
              <p className="text-lg font-mono font-semibold text-foreground">
                {formatTime(recorder.duration)}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {recorder.audioBlob ? formatSize(recorder.audioBlob.size) : ''}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {recorder.audioBlob?.type?.split(';')[0]?.split('/')[1]?.toUpperCase() || 'WEBM'}
                </Badge>
              </div>
            </motion.div>
          )}
        </div>

        {/* Error */}
        {recorder.error && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{recorder.error}</span>
          </motion.div>
        )}

        {/* Playback + Actions for recorded audio */}
        <AnimatePresence>
          {recorder.status === 'recorded' && recorder.audioUrl && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3 w-full max-w-xs"
            >
              {/* Hidden audio element */}
              <audio 
                ref={audioRef} 
                src={recorder.audioUrl} 
                onEnded={() => setIsPlaying(false)}
              />

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                  disabled={isUploading}
                >
                  {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                  {isPlaying ? 'Pausar' : 'Ouvir'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={recorder.resetRecording}
                  disabled={isUploading}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Refazer
                </Button>
              </div>

              {/* Send button */}
              <Button
                className="w-full"
                onClick={handleSendRecording}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar áudio
                  </>
                )}
              </Button>

              {/* Upload progress */}
              {isUploading && (
                <Progress value={uploadProgress} className="h-1 w-full" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      {/* File Upload */}
      <div className="text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,.m4a,.webm,.ogg,audio/*"
          onChange={handleFileUpload}
          className="hidden"
          disabled={disabled || isUploading || recorder.status === 'recording'}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading || recorder.status === 'recording'}
          className="w-full max-w-xs"
        >
          <Upload className="w-4 h-4 mr-2" />
          Enviar arquivo de áudio
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          WAV, MP3, M4A, WebM • Máx 50MB • 3s a 6min
        </p>
      </div>
    </div>
  );
};

export default AudioCapture;
