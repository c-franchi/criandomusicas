import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Video, Upload, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReactionVideoUploadProps {
  orderId: string;
  userId: string;
  onUploadComplete?: () => void;
}

const ReactionVideoUpload = ({ orderId, userId, onUploadComplete }: ReactionVideoUploadProps) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo de vídeo.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O vídeo deve ter no máximo 100MB.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const uploadVideo = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Upload to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}/${orderId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('reaction-videos')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('reaction-videos')
        .getPublicUrl(fileName);

      // Create record in database
      const { error: dbError } = await supabase
        .from('reaction_videos')
        .insert({
          user_id: userId,
          order_id: orderId,
          video_url: urlData.publicUrl,
          is_public: isPublic,
          is_approved: false // Requires admin approval
        });

      if (dbError) throw dbError;

      setUploaded(true);
      toast({
        title: '🎉 Vídeo enviado!',
        description: 'Seu vídeo foi enviado para aprovação. Obrigado por compartilhar!',
      });

      onUploadComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao enviar vídeo',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (uploaded) {
    return (
      <Card className="border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-1">Vídeo Enviado!</h3>
          <p className="text-sm text-muted-foreground">
            Seu vídeo de reação está em análise. Após aprovação, aparecerá em nossa página inicial como prova social.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-600">
          <Video className="w-5 h-5" />
          Compartilhe a Reação!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Grave um vídeo mostrando a reação de quem recebeu sua música personalizada! 
          Seu vídeo pode aparecer em nossa página inicial como prova social.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedFile ? (
          <Button
            variant="outline"
            className="w-full h-24 border-dashed border-2 flex-col gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Clique para selecionar um vídeo
            </span>
            <span className="text-xs text-muted-foreground">
              Máximo 100MB
            </span>
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <video
                src={previewUrl!}
                controls
                className="w-full rounded-lg max-h-48 object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={removeFile}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
            </p>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <Label htmlFor="is-public" className="font-medium">Exibir na página inicial</Label>
            <p className="text-xs text-muted-foreground">
              Seu vídeo poderá inspirar outras pessoas!
            </p>
          </div>
          <Switch
            id="is-public"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
        </div>

        <Button
          className="w-full gap-2"
          disabled={!selectedFile || uploading}
          onClick={uploadVideo}
        >
          {uploading ? (
            <>
              <Video className="w-4 h-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Enviar Vídeo de Reação
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Ao enviar, você autoriza a exibição do vídeo em nossos canais.
        </p>
      </CardContent>
    </Card>
  );
};

export default ReactionVideoUpload;
