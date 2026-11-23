import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Upload, Image, Video, X, CheckCircle, Loader2, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
  uploading: boolean;
  uploaded: boolean;
  url?: string;
}

const VideoUpload = () => {
  const { t: tu } = useTranslation('uiPayments');
  const { videoOrderId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [videoOrder, setVideoOrder] = useState<any>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const maxImages = videoOrder?.video_type === 'photos_5' ? 5 : videoOrder?.video_type === 'photos_8' ? 8 : 0;
  const maxVideos = videoOrder?.video_type === 'photos_8' ? 1 : videoOrder?.video_type === 'video_2min' ? 1 : 0;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    const fetchVideoOrder = async () => {
      if (!videoOrderId || !user) return;

      const { data, error } = await supabase
        .from('video_orders')
        .select('*')
        .eq('id', videoOrderId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        toast({
          title: tu('upload.notFound'),
          description: tu('upload.checkPayment'),
          variant: 'destructive'
        });
        navigate('/dashboard');
        return;
      }

      if (data.payment_status !== 'PAID') {
        toast({
          title: tu('upload.pending'),
          description: tu('upload.payFirst'),
          variant: 'destructive'
        });
        navigate('/dashboard');
        return;
      }

      if (data.status === 'SUBMITTED' || data.status === 'COMPLETED') {
        setSubmitted(true);
      }

      setVideoOrder(data);
    };

    fetchVideoOrder();
  }, [videoOrderId, user, authLoading, navigate, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const currentImages = files.filter(f => f.type === 'image').length;
    const currentVideos = files.filter(f => f.type === 'video').length;

    const newFiles: UploadedFile[] = [];

    selectedFiles.forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (isImage && currentImages + newFiles.filter(f => f.type === 'image').length < maxImages) {
        newFiles.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          type: 'image',
          uploading: false,
          uploaded: false
        });
      } else if (isVideo && currentVideos + newFiles.filter(f => f.type === 'video').length < maxVideos) {
        // Check video size (max 100MB)
        if (file.size > 100 * 1024 * 1024) {
          toast({
            title: tu('upload.tooLarge'),
            description: tu('upload.maxSize'),
            variant: 'destructive'
          });
          return;
        }
        newFiles.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          type: 'video',
          uploading: false,
          uploaded: false
        });
      }
    });

    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  }, [files, maxImages, maxVideos, toast]);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const uploadFiles = async () => {
    if (!user || !videoOrderId) return;

    setSubmitting(true);

    try {
      for (const fileData of files) {
        if (fileData.uploaded) continue;

        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, uploading: true } : f
        ));

        const fileExt = fileData.file.name.split('.').pop();
        const filePath = `${user.id}/${videoOrderId}/${fileData.id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('video-uploads')
          .upload(filePath, fileData.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('video-uploads')
          .getPublicUrl(filePath);

        // Save to database
        const { error: dbError } = await supabase
          .from('video_order_files')
          .insert({
            video_order_id: videoOrderId,
            file_url: publicUrl,
            file_type: fileData.type,
            file_name: fileData.file.name,
            sort_order: files.indexOf(fileData)
          });

        if (dbError) throw dbError;

        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, uploading: false, uploaded: true, url: publicUrl } : f
        ));
      }

      // Update video order status
      await supabase
        .from('video_orders')
        .update({ status: 'SUBMITTED', updated_at: new Date().toISOString() })
        .eq('id', videoOrderId);

      setSubmitted(true);
      toast({
        title: tu('upload.sentToast'),
        description: tu('upload.delivery')
      });

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : tu('unknownError');
      toast({
        title: tu('upload.error'),
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !videoOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">{tu('upload.sentTitle')}</h1>
          <p className="text-muted-foreground mb-8">
            {tu('upload.sentBody')}
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            {tu('upload.dashboard')}
          </Button>
        </div>
      </div>
    );
  }

  const currentImages = files.filter(f => f.type === 'image').length;
  const currentVideos = files.filter(f => f.type === 'video').length;
  const canSubmit = files.length > 0 && files.every(f => !f.uploading);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {tu('upload.dashboard')}
          </Button>
          <div className="text-center">
            <Badge className="mb-4 bg-primary/20 text-primary">
              <Upload className="w-3 h-3 mr-1" />
              {tu('upload.badge')}
            </Badge>
            <h1 className="text-3xl font-bold mb-2">{tu('upload.title')}</h1>
            <p className="text-muted-foreground">
              {videoOrder.video_type === 'photos_5' && tu('upload.five')}
              {videoOrder.video_type === 'photos_8' && tu('upload.eight')}
              {videoOrder.video_type === 'video_2min' && tu('upload.two')}
            </p>
          </div>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>{tu('upload.progress')}</span>
              <span>{tu('upload.counts', { currentImages, maxImages, currentVideos, maxVideos })}</span>
            </div>
            <Progress value={(files.length / (maxImages + maxVideos)) * 100} />
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {tu('upload.select')}
            </CardTitle>
            <CardDescription>
              {tu('upload.formats')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="block">
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">{tu('upload.click')}</p>
                <p className="text-sm text-muted-foreground">
                  {tu('upload.drag')}
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </CardContent>
        </Card>

        {/* Files Preview */}
        {files.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{tu('upload.selected')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {files.map((file) => (
                  <div key={file.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      {file.type === 'image' ? (
                        <img 
                          src={file.preview} 
                          alt={tu('upload.preview')} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video 
                          src={file.preview} 
                          className="w-full h-full object-cover"
                        />
                      )}
                      {file.uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-white" />
                        </div>
                      )}
                      {file.uploaded && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                      )}
                    </div>
                    {!file.uploaded && !file.uploading && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <Badge className="absolute bottom-2 left-2 text-xs">
                      {file.type === 'image' ? <Image className="w-3 h-3 mr-1" /> : <Video className="w-3 h-3 mr-1" />}
                      {file.type === 'image' ? tu('upload.photo') : tu('upload.video')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button 
          onClick={uploadFiles}
          disabled={!canSubmit || submitting}
          className="w-full h-14 text-lg"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {tu('upload.sending')}
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              {tu('upload.submit')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default VideoUpload;
