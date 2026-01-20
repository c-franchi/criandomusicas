import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseSpeechToTextReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechToText = (): UseSpeechToTextReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const processedResultsRef = useRef<Set<string>>(new Set());

  // Check if Web Speech API is supported
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;
    
    recognitionRef.current = new SpeechRecognitionClass();
    
    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = false; // Only get final results to avoid duplicates
    recognition.lang = 'pt-BR';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Get only the latest result
      const lastResultIndex = event.results.length - 1;
      const result = event.results[lastResultIndex];
      
      if (result.isFinal) {
        const transcriptText = result[0].transcript.trim();
        // Create a unique key for this result to avoid duplicates
        const resultKey = `${lastResultIndex}-${transcriptText}`;
        
        if (transcriptText && !processedResultsRef.current.has(resultKey)) {
          processedResultsRef.current.add(resultKey);
          setTranscript(prev => {
            const separator = prev ? ' ' : '';
            return prev + separator + transcriptText;
          });
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast({
          title: 'Microfone bloqueado',
          description: 'Permita o acesso ao microfone nas configurações do navegador.',
          variant: 'destructive'
        });
      } else if (event.error !== 'aborted') {
        toast({
          title: 'Erro no reconhecimento',
          description: 'Tente novamente.',
          variant: 'destructive'
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isSupported, toast]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    try {
      setTranscript('');
      processedResultsRef.current.clear(); // Clear processed results on new recording
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Failed to start recognition:', error);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Failed to stop recognition:', error);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    processedResultsRef.current.clear();
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript
  };
};