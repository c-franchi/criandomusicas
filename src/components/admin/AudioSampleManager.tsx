import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Headphones, Edit, Trash2, Upload, Music, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AudioSample, ApprovedMusicTrack } from "./types";

interface AudioSampleManagerProps {
  audioSamples: AudioSample[];
  setAudioSamples: React.Dispatch<React.SetStateAction<AudioSample[]>>;
  loadingAudio: boolean;
  onDeleteAudio: (id: string) => void;
}

const AudioSampleManager = ({ 
  audioSamples, 
  setAudioSamples, 
  loadingAudio,
  onDeleteAudio 
}: AudioSampleManagerProps) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAudio, setEditingAudio] = useState<AudioSample | null>(null);
  const [newAudio, setNewAudio] = useState<Partial<AudioSample>>({
    title: '',
    description: '',
    style: '',
    occasion: '',
    audio_url: '',
    cover_url: '',
    is_active: true,
    sort_order: 0,
    audio_type: 'vocal'
  });
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [approvedTracks, setApprovedTracks] = useState<ApprovedMusicTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Fetch tracks with allow_music_sample permission
  const fetchApprovedTracks = async () => {
    setLoadingTracks(true);
    try {
      // First get reviews with allow_music_sample = true
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('order_id')
        .eq('allow_music_sample', true);

      if (reviewsError) throw reviewsError;

      if (!reviewsData || reviewsData.length === 0) {
        setApprovedTracks([]);
        return;
      }

      const orderIds = reviewsData.map(r => r.order_id);

      // Get tracks for these orders
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select('order_id, audio_url')
        .in('order_id', orderIds)
        .eq('status', 'READY');

      if (tracksError) throw tracksError;

      if (!tracksData || tracksData.length === 0) {
        setApprovedTracks([]);
        return;
      }

      // Get order info for each track
      const enrichedTracks: ApprovedMusicTrack[] = [];
      
      for (const track of tracksData) {
        const { data: orderData } = await supabase
          .from('orders')
          .select('music_type, music_style, user_id, created_at, purpose, cover_url, song_title, story')
          .eq('id', track.order_id)
          .single();

        const { data: lyricData } = await supabase
          .from('lyrics')
          .select('title, body')
          .eq('order_id', track.order_id)
          .eq('is_approved', true)
          .single();

        let userName = null;
        if (orderData?.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', orderData.user_id)
            .single();
          userName = profileData?.name;
        }

        enrichedTracks.push({
          order_id: track.order_id,
          audio_url: track.audio_url || '',
          lyric_title: lyricData?.title || null,
          song_title: orderData?.song_title || null,
          music_type: orderData?.music_type || null,
          music_style: orderData?.music_style || null,
          purpose: orderData?.purpose || null,
          cover_url: orderData?.cover_url || null,
          lyric_body: lyricData?.body || null,
          user_name: userName,
          created_at: orderData?.created_at || '',
          story: orderData?.story || null
        });
      }

      setApprovedTracks(enrichedTracks);
    } catch (error) {
      console.error('Error fetching approved tracks:', error);
    } finally {
      setLoadingTracks(false);
    }
  };

  useEffect(() => {
    if (dialogOpen) {
      fetchApprovedTracks();
    }
  }, [dialogOpen]);

  const handleAudioUpload = async (file: File) => {
    if (!file) return;
    setUploadingAudio(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `audios/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-samples')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('audio-samples')
        .getPublicUrl(filePath);

      const audioUrl = publicUrlData.publicUrl;

      if (editingAudio) {
        setEditingAudio({ ...editingAudio, audio_url: audioUrl });
      } else {
        setNewAudio({ ...newAudio, audio_url: audioUrl });
      }

      toast({ title: 'Áudio enviado!', description: 'O arquivo foi enviado com sucesso.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao enviar áudio', description: errorMessage, variant: 'destructive' });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-samples')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('audio-samples')
        .getPublicUrl(filePath);

      const coverUrl = publicUrlData.publicUrl;

      if (editingAudio) {
        setEditingAudio({ ...editingAudio, cover_url: coverUrl });
      } else {
        setNewAudio({ ...newAudio, cover_url: coverUrl });
      }

      toast({ title: 'Capa enviada!', description: 'A imagem foi enviada com sucesso.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao enviar capa', description: errorMessage, variant: 'destructive' });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSelectApprovedTrack = (orderId: string) => {
    const track = approvedTracks.find(t => t.order_id === orderId);
    if (track) {
      setSelectedTrack(orderId);
      
      // Generate auto description based on lyrics and style
      const generateDescription = () => {
        const parts: string[] = [];
        
        // Use purpose if available
        if (track.purpose) {
          parts.push(`Para ${track.purpose.toLowerCase()}`);
        }
        
        // Extract first verse or meaningful text from lyrics
        if (track.lyric_body) {
          const lines = track.lyric_body.split('\n').filter(line => 
            line.trim() && 
            !line.startsWith('[') && 
            line.length > 10
          );
          if (lines.length > 0) {
            // Get first meaningful line as context
            const firstLine = lines[0].substring(0, 50);
            parts.push(`"${firstLine}..."`);
          }
        }
        
        // Add user name if available
        if (track.user_name) {
          parts.push(`Criada para ${track.user_name}`);
        }
        
        return parts.length > 0 ? parts.join(' • ') : `Uma ${track.music_type || 'música'} especial`;
      };

      // Determine occasion from real data (purpose, story) - not static mapping
      const getOccasion = () => {
        // Priority 1: Use purpose if available
        if (track.purpose) {
          return track.purpose;
        }
        
        // Priority 2: Extract keywords from story
        if (track.story) {
          const storyLower = track.story.toLowerCase();
          if (storyLower.includes('trilha sonora') || storyLower.includes('vídeo') || storyLower.includes('video')) return 'Trilha Sonora';
          if (storyLower.includes('casamento') || storyLower.includes('noiva') || storyLower.includes('noivo')) return 'Casamento';
          if (storyLower.includes('aniversário') || storyLower.includes('aniversario')) return 'Aniversário';
          if (storyLower.includes('formatura')) return 'Formatura';
          if (storyLower.includes('dia das mães') || storyLower.includes('mãe')) return 'Dia das Mães';
          if (storyLower.includes('dia dos pais') || storyLower.includes('pai')) return 'Dia dos Pais';
          if (storyLower.includes('natal')) return 'Natal';
          if (storyLower.includes('namorados') || storyLower.includes('amor')) return 'Romântico';
        }
        
        // Priority 3: Use music_type with proper casing
        if (track.music_type) {
          return track.music_type.charAt(0).toUpperCase() + track.music_type.slice(1);
        }
        
        return 'Especial';
      };
      
      const audioData = editingAudio || newAudio;
      const updatedData = {
        ...audioData,
        audio_url: track.audio_url,
        title: track.song_title || track.lyric_title || `Música ${track.music_type}`,
        style: track.music_style || '',
        occasion: getOccasion(),
        description: generateDescription(),
        cover_url: track.cover_url || ''
      };
      
      if (editingAudio) {
        setEditingAudio(updatedData as AudioSample);
      } else {
        setNewAudio(updatedData);
      }
      
      toast({ 
        title: 'Música selecionada!', 
        description: 'Título, descrição, capa e dados foram preenchidos automaticamente.' 
      });
    }
  };

  const saveAudioSample = async () => {
    try {
      const audioData = editingAudio || newAudio;
      if (!audioData.title || !audioData.audio_url) {
        toast({ title: 'Erro', description: 'Título e URL do áudio são obrigatórios.', variant: 'destructive' });
        return;
      }

      const audioType = audioData.audio_type || 'vocal';

      if (editingAudio) {
        const { error } = await supabase
          .from('audio_samples')
          .update({
            title: audioData.title,
            description: audioData.description || '',
            style: audioData.style || '',
            occasion: audioData.occasion || '',
            audio_url: audioData.audio_url,
            cover_url: audioData.cover_url || null,
            is_active: audioData.is_active ?? true,
            sort_order: audioData.sort_order || 0,
            audio_type: audioType
          })
          .eq('id', editingAudio.id);

        if (error) throw error;
        
        setAudioSamples(prev => prev.map(a => 
          a.id === editingAudio.id 
            ? { ...a, ...audioData, cover_url: audioData.cover_url || null, audio_type: audioType as 'vocal' | 'instrumental' } as AudioSample
            : a
        ));
        
        toast({ title: 'Áudio atualizado!', description: 'As informações foram salvas.' });
      } else {
        const { data, error } = await supabase
          .from('audio_samples')
          .insert({
            title: audioData.title,
            description: audioData.description || '',
            style: audioData.style || '',
            occasion: audioData.occasion || '',
            audio_url: audioData.audio_url,
            cover_url: audioData.cover_url || null,
            is_active: audioData.is_active ?? true,
            sort_order: audioData.sort_order || 0,
            audio_type: audioType
          })
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          const typedData: AudioSample = {
            ...data,
            audio_type: (data.audio_type as 'vocal' | 'instrumental') || 'vocal'
          };
          setAudioSamples(prev => [...prev, typedData]);
        }
        
        toast({ title: 'Áudio adicionado!', description: 'O novo áudio está disponível.' });
      }

      closeDialog();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao salvar áudio', description: errorMessage, variant: 'destructive' });
    }
  };

  const openDialog = (audio?: AudioSample) => {
    if (audio) {
      setEditingAudio(audio);
    } else {
      setEditingAudio(null);
      setNewAudio({
        title: '',
        description: '',
        style: '',
        occasion: '',
        audio_url: '',
        cover_url: '',
        is_active: true,
        sort_order: 0,
        audio_type: 'vocal'
      });
    }
    setSelectedTrack("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingAudio(null);
    setSelectedTrack("");
    setNewAudio({
      title: '',
      description: '',
      style: '',
      occasion: '',
      audio_url: '',
      cover_url: '',
      is_active: true,
      sort_order: 0,
      audio_type: 'vocal'
    });
  };

  const audioData = editingAudio || newAudio;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Áudios de Exemplo</h3>
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" />
          Novo Áudio
        </Button>
      </div>
      
      {loadingAudio ? (
        <div className="flex items-center justify-center py-8">
          <Music className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : audioSamples.length === 0 ? (
        <Card className="p-6 text-center">
          <Headphones className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum áudio cadastrado</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {audioSamples.map((audio) => (
            <Card key={audio.id} className={`p-3 ${!audio.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {audio.cover_url ? (
                    <img src={audio.cover_url} alt={audio.title} className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Headphones className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{audio.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {audio.audio_type === 'instrumental' ? '🎹 Instrumental' : '🎤 Vocal'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{audio.style} • {audio.occasion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={audio.is_active ? 'default' : 'secondary'} className="text-xs">
                    {audio.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => openDialog(audio)} className="h-8 w-8 p-0">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDeleteAudio(audio.id)} className="h-8 w-8 p-0">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Audio Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5" />
              {editingAudio ? 'Editar Áudio' : 'Novo Áudio de Exemplo'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Audio Type Selector */}
            <div className="space-y-2">
              <Label>Tipo de Áudio *</Label>
              <Select 
                value={audioData.audio_type || 'vocal'} 
                onValueChange={(value: 'vocal' | 'instrumental') => editingAudio 
                  ? setEditingAudio({ ...editingAudio, audio_type: value })
                  : setNewAudio({ ...newAudio, audio_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vocal">
                    <div className="flex items-center gap-2">
                      <span>🎤</span>
                      <span>Vocal</span>
                      <span className="text-xs text-muted-foreground">- Exibir em "Músicas com Letra"</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="instrumental">
                    <div className="flex items-center gap-2">
                      <span>🎹</span>
                      <span>Instrumental</span>
                      <span className="text-xs text-muted-foreground">- Exibir em "Músicas sem Vocal"</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Approved Tracks Selector */}
            {!editingAudio && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Music className="w-4 h-4 text-primary" />
                  Músicas com Permissão de Uso ({audioData.audio_type === 'instrumental' ? 'Instrumentais' : 'Vocais'})
                </Label>
                {loadingTracks ? (
                  <div className="flex items-center justify-center py-4 gap-2">
                    <Music className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Carregando músicas aprovadas...</span>
                  </div>
                ) : (() => {
                  const selectedType = audioData.audio_type || 'vocal';
                  const filteredTracks = approvedTracks.filter(track => {
                    if (selectedType === 'vocal') {
                      return track.music_type !== 'instrumental';
                    } else {
                      return track.music_type === 'instrumental';
                    }
                  });
                  
                  return filteredTracks.length > 0 ? (
                    <>
                      <Select value={selectedTrack} onValueChange={handleSelectApprovedTrack}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar música aprovada..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredTracks.map((track) => (
                            <SelectItem key={track.order_id} value={track.order_id}>
                              <div className="flex items-center gap-2">
                                {track.cover_url && (
                                  <img src={track.cover_url} alt="" className="w-6 h-6 rounded object-cover" />
                                )}
                                <Check className="w-4 h-4 text-primary" />
                                <span className="font-medium">
                                  {track.song_title || track.lyric_title || `Música ${track.music_type}`}
                                </span>
                                <span className="text-xs text-muted-foreground">• {track.music_style}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {filteredTracks.length} música(s) {selectedType === 'vocal' ? 'vocal(is)' : 'instrumental(is)'} disponíveis
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      Nenhuma música {selectedType === 'vocal' ? 'vocal' : 'instrumental'} com permissão de uso encontrada.
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Manual Upload */}
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={audioData.title || ''}
                onChange={(e) => editingAudio 
                  ? setEditingAudio({ ...editingAudio, title: e.target.value })
                  : setNewAudio({ ...newAudio, title: e.target.value })}
                placeholder="Nome da música"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={audioData.description || ''}
                onChange={(e) => editingAudio 
                  ? setEditingAudio({ ...editingAudio, description: e.target.value })
                  : setNewAudio({ ...newAudio, description: e.target.value })}
                placeholder="Breve descrição"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estilo</Label>
                <Input
                  value={audioData.style || ''}
                  onChange={(e) => editingAudio 
                    ? setEditingAudio({ ...editingAudio, style: e.target.value })
                    : setNewAudio({ ...newAudio, style: e.target.value })}
                  placeholder="Pop, Rock, Sertanejo..."
                />
              </div>
              <div className="space-y-2">
                <Label>Ocasião</Label>
                <Input
                  value={audioData.occasion || ''}
                  onChange={(e) => editingAudio 
                    ? setEditingAudio({ ...editingAudio, occasion: e.target.value })
                    : setNewAudio({ ...newAudio, occasion: e.target.value })}
                  placeholder="Aniversário, Casamento..."
                />
              </div>
            </div>

            {/* Audio File */}
            <div className="space-y-2">
              <Label>Arquivo de Áudio *</Label>
              <div className="flex gap-2">
                <Input
                  value={audioData.audio_url || ''}
                  onChange={(e) => editingAudio 
                    ? setEditingAudio({ ...editingAudio, audio_url: e.target.value })
                    : setNewAudio({ ...newAudio, audio_url: e.target.value })}
                  placeholder="URL do áudio ou faça upload"
                  className="flex-1"
                />
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleAudioUpload(e.target.files[0])}
                />
                <Button
                  variant="outline"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={uploadingAudio}
                >
                  {uploadingAudio ? <Music className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label>Imagem de Capa</Label>
              <div className="flex gap-2 items-center">
                {audioData.cover_url && (
                  <img src={audioData.cover_url} alt="Capa" className="w-12 h-12 rounded object-cover" />
                )}
                <Input
                  value={audioData.cover_url || ''}
                  onChange={(e) => editingAudio 
                    ? setEditingAudio({ ...editingAudio, cover_url: e.target.value })
                    : setNewAudio({ ...newAudio, cover_url: e.target.value })}
                  placeholder="URL da capa ou faça upload"
                  className="flex-1"
                />
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
                />
                <Button
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                >
                  {uploadingCover ? <Music className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="audio-active">Ativo</Label>
              <Switch
                id="audio-active"
                checked={audioData.is_active ?? true}
                onCheckedChange={(checked) => editingAudio 
                  ? setEditingAudio({ ...editingAudio, is_active: checked })
                  : setNewAudio({ ...newAudio, is_active: checked })}
              />
            </div>

            <Button onClick={saveAudioSample} className="w-full">
              {editingAudio ? 'Salvar Alterações' : 'Adicionar Áudio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AudioSampleManager;
