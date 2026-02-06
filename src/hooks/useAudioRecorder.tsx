import { useState, useCallback, useRef, useEffect } from 'react';

interface AudioRecorderState {
  status: 'idle' | 'recording' | 'recorded' | 'uploading' | 'uploaded';
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
  error: string | null;
}

interface UseAudioRecorderReturn extends AudioRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  uploadedAudioId: string | null;
  isSupported: boolean;
}

const MAX_DURATION_SEC = 90;
const MIN_DURATION_SEC = 3;

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [state, setState] = useState<AudioRecorderState>({
    status: 'idle',
    audioBlob: null,
    audioUrl: null,
    duration: 0,
    error: null,
  });
  const [uploadedAudioId, setUploadedAudioId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 
    'getUserMedia' in navigator.mediaDevices;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        }
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Determine best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        if (duration < MIN_DURATION_SEC) {
          setState(prev => ({
            ...prev,
            status: 'idle',
            error: `Áudio muito curto. Mínimo de ${MIN_DURATION_SEC} segundos.`,
          }));
          URL.revokeObjectURL(url);
          return;
        }

        setState(prev => ({
          ...prev,
          status: 'recorded',
          audioBlob: blob,
          audioUrl: url,
          duration,
        }));
      };

      // Start recording
      startTimeRef.current = Date.now();
      mediaRecorder.start(500); // Collect data every 500ms

      setState(prev => ({ ...prev, status: 'recording', duration: 0 }));

      // Timer for duration display + auto-stop at max
      timerRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, duration: elapsed }));
        
        if (elapsed >= MAX_DURATION_SEC) {
          mediaRecorder.stop();
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 500);

    } catch (error: unknown) {
      console.error('Error starting recording:', error);
      const message = error instanceof Error && error.name === 'NotAllowedError'
        ? 'Permissão de microfone negada. Permita o acesso nas configurações do navegador.'
        : error instanceof Error && error.name === 'NotFoundError'
          ? 'Nenhum microfone encontrado no dispositivo.'
          : 'Erro ao acessar o microfone.';
      
      setState(prev => ({ ...prev, status: 'idle', error: message }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setState({
      status: 'idle',
      audioBlob: null,
      audioUrl: null,
      duration: 0,
      error: null,
    });
    setUploadedAudioId(null);
    chunksRef.current = [];
  }, [state.audioUrl]);

  return {
    ...state,
    startRecording,
    stopRecording,
    resetRecording,
    uploadedAudioId,
    isSupported,
  };
};
