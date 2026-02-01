import { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Music, 
  ArrowLeft,
  Save,
  DollarSign,
  Plus,
  Headphones,
  Edit,
  Upload,
  Percent,
  Gift,
  QrCode,
  MessageCircle,
  Video,
  Camera,
  Trash2,
  CalendarIcon,
} from "lucide-react";
import VoucherShareMenu from "@/components/VoucherShareMenu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AudioSampleManager, ShareAnalytics, type AudioSample, type PricingConfig, type Voucher, type PixConfig } from "@/components/admin";
import VideoOrdersManager from "@/components/admin/VideoOrdersManager";
import ReactionVideosManager from "@/components/admin/ReactionVideosManager";
import ReviewsManager from "@/components/admin/ReviewsManager";
import PricingManager from "@/components/admin/PricingManager";
import { BarChart3 } from "lucide-react";

const AdminSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const { toast } = useToast();
  
  const [configTab, setConfigTab] = useState<'pricing' | 'vouchers' | 'audio' | 'pix' | 'videos' | 'reactions' | 'reviews' | 'analytics'>('pricing');
  
  // Pricing
  const [pricingConfigs, setPricingConfigs] = useState<PricingConfig[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [syncingStripe, setSyncingStripe] = useState(false);
  
  // PIX Config
  const [pixConfig, setPixConfig] = useState<PixConfig | null>(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [savingPix, setSavingPix] = useState(false);
  const [uploadingQrCode, setUploadingQrCode] = useState(false);
  const qrCodeInputRef = useRef<HTMLInputElement>(null);
  
  // Audio Samples
  const [audioSamples, setAudioSamples] = useState<AudioSample[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // Vouchers
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [newVoucher, setNewVoucher] = useState<Partial<Voucher & { max_uses_per_user?: number | null }>>({
    code: '',
    discount_type: 'percent',
    discount_value: 10,
    max_uses: null,
    max_uses_per_user: null,
    valid_until: null,
    plan_ids: null,
    is_active: true
  });
  const [savingVoucher, setSavingVoucher] = useState(false);

  // Confirmation dialogs
  const [deleteAudioId, setDeleteAudioId] = useState<string | null>(null);
  const [deleteVoucherId, setDeleteVoucherId] = useState<string | null>(null);

  const fetchPricing = useCallback(async () => {
    setLoadingPricing(true);
    try {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPricingConfigs(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar preços',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingPricing(false);
    }
  }, [toast]);

  const fetchAudioSamples = useCallback(async () => {
    setLoadingAudio(true);
    try {
      const { data, error } = await supabase
        .from('audio_samples')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const typedData = (data || []).map(item => ({
        ...item,
        audio_type: (item.audio_type as 'vocal' | 'instrumental') || 'vocal'
      }));
      setAudioSamples(typedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar áudios',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingAudio(false);
    }
  }, [toast]);

  const fetchVouchers = useCallback(async () => {
    setLoadingVouchers(true);
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVouchers(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar vouchers',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingVouchers(false);
    }
  }, [toast]);

  const fetchPixConfig = useCallback(async () => {
    setLoadingPix(true);
    try {
      const { data, error } = await supabase
        .from('pix_config')
        .select('*')
        .eq('id', 'main')
        .single();

      if (error) throw error;
      setPixConfig(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar config PIX',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingPix(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPricing();
    fetchVouchers();
    fetchPixConfig();
    fetchAudioSamples();
  }, [fetchPricing, fetchVouchers, fetchPixConfig, fetchAudioSamples]);

  const updatePricingConfig = (id: string, field: string, value: number | null) => {
    setPricingConfigs(prev => prev.map(config => 
      config.id === id ? { ...config, [field]: value } : config
    ));
  };

  const savePricingConfigs = async () => {
    setSavingPricing(true);
    try {
      // 1. Save to database first
      for (const config of pricingConfigs) {
        const { error } = await supabase
          .from('pricing_config')
          .update({
            price_cents: config.price_cents,
            price_promo_cents: config.price_promo_cents,
          })
          .eq('id', config.id);

        if (error) throw error;
      }

      toast({
        title: 'Preços salvos no banco!',
        description: 'Sincronizando com Stripe...',
      });

      // 2. Sync with Stripe
      setSyncingStripe(true);
      const activePlans = pricingConfigs.filter(c => c.is_active);
      
      const { data: session } = await supabase.auth.getSession();
      const { data, error: syncError } = await supabase.functions.invoke('sync-stripe-prices', {
        body: { plans: activePlans },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`,
        },
      });

      if (syncError) {
        console.error('Stripe sync error:', syncError);
        toast({
          title: 'Aviso',
          description: 'Preços salvos no banco, mas houve erro ao sincronizar com Stripe. Os checkouts podem usar preços antigos.',
          variant: 'destructive',
        });
      } else if (data?.updatedPlans && data.updatedPlans.length > 0) {
        // Update local state with new stripe_price_ids
        setPricingConfigs(prev => prev.map(p => {
          const updated = data.updatedPlans.find((u: { id: string; stripe_price_id: string }) => u.id === p.id);
          return updated ? { ...p, stripe_price_id: updated.stripe_price_id } : p;
        }));

        toast({
          title: 'Preços sincronizados!',
          description: `${data.updatedPlans.length} plano(s) atualizado(s) no Stripe. Os novos preços já estão ativos.`,
        });
      } else {
        toast({
          title: 'Preços atualizados!',
          description: 'Nenhuma alteração necessária no Stripe.',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao salvar preços',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSavingPricing(false);
      setSyncingStripe(false);
    }
  };

  const saveVoucher = async () => {
    setSavingVoucher(true);
    try {
      const voucherData = editingVoucher || newVoucher;
      if (!voucherData.code || !voucherData.discount_value) {
        toast({ title: 'Erro', description: 'Código e valor do desconto são obrigatórios.', variant: 'destructive' });
        return;
      }

      if (editingVoucher) {
        const { error } = await supabase
          .from('vouchers')
          .update({
            code: voucherData.code?.toUpperCase(),
            discount_type: voucherData.discount_type,
            discount_value: voucherData.discount_value,
            max_uses: voucherData.max_uses,
            max_uses_per_user: (voucherData as any).max_uses_per_user ?? null,
            valid_until: voucherData.valid_until,
            plan_ids: voucherData.plan_ids,
            is_active: voucherData.is_active ?? true,
          })
          .eq('id', editingVoucher.id);

        if (error) throw error;
        toast({ title: 'Voucher atualizado!', description: 'As alterações foram salvas.' });
      } else {
        const { error } = await supabase
          .from('vouchers')
          .insert({
            code: voucherData.code?.toUpperCase(),
            discount_type: voucherData.discount_type || 'percent',
            discount_value: voucherData.discount_value,
            max_uses: voucherData.max_uses,
            max_uses_per_user: (voucherData as any).max_uses_per_user ?? null,
            valid_until: voucherData.valid_until,
            plan_ids: voucherData.plan_ids,
            is_active: voucherData.is_active ?? true,
            created_by: user?.id,
          });

        if (error) throw error;
        toast({ title: 'Voucher criado!', description: 'O novo voucher está ativo.' });
      }

      setVoucherDialogOpen(false);
      setEditingVoucher(null);
      setNewVoucher({ code: '', discount_type: 'percent', discount_value: 10, max_uses: null, max_uses_per_user: null, valid_until: null, plan_ids: null, is_active: true });
      fetchVouchers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao salvar voucher', description: errorMessage, variant: 'destructive' });
    } finally {
      setSavingVoucher(false);
    }
  };

  const confirmDeleteVoucher = async () => {
    if (!deleteVoucherId) return;
    try {
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', deleteVoucherId);

      if (error) throw error;
      toast({ title: 'Voucher apagado', description: 'O voucher foi removido.' });
      setVouchers(prev => prev.filter(v => v.id !== deleteVoucherId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao apagar voucher', description: errorMessage, variant: 'destructive' });
    } finally {
      setDeleteVoucherId(null);
    }
  };

  const confirmDeleteAudio = async () => {
    if (!deleteAudioId) return;
    try {
      const { error } = await supabase
        .from('audio_samples')
        .delete()
        .eq('id', deleteAudioId);

      if (error) throw error;
      toast({ title: 'Áudio apagado', description: 'O áudio de exemplo foi removido.' });
      setAudioSamples(prev => prev.filter(a => a.id !== deleteAudioId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao apagar áudio', description: errorMessage, variant: 'destructive' });
    } finally {
      setDeleteAudioId(null);
    }
  };

  const savePixConfig = async () => {
    if (!pixConfig) return;
    setSavingPix(true);
    try {
      const { error } = await supabase
        .from('pix_config')
        .update({
          pix_key: pixConfig.pix_key,
          pix_name: pixConfig.pix_name,
          qr_code_url: pixConfig.qr_code_url,
          is_active: pixConfig.is_active,
        })
        .eq('id', 'main');

      if (error) throw error;

      toast({
        title: 'Config PIX atualizada!',
        description: 'As novas configurações de PIX estão ativas.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao salvar config PIX',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSavingPix(false);
    }
  };

  const handleQrCodeUpload = async (file: File) => {
    if (!file) return;
    setUploadingQrCode(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `pix-qrcode-${Date.now()}.${fileExt}`;
      const filePath = `pix/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-samples')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('audio-samples')
        .getPublicUrl(filePath);

      const qrCodeUrl = publicUrlData.publicUrl;

      setPixConfig(prev => prev ? { ...prev, qr_code_url: qrCodeUrl } : null);

      toast({ title: 'QR Code enviado!', description: 'A nova imagem foi salva.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao enviar QR Code', description: errorMessage, variant: 'destructive' });
    } finally {
      setUploadingQrCode(false);
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Delete Audio Confirmation */}
      <AlertDialog open={!!deleteAudioId} onOpenChange={(open) => !open && setDeleteAudioId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar este áudio de exemplo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAudio} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Voucher Delete Confirmation */}
      <AlertDialog open={!!deleteVoucherId} onOpenChange={(open) => !open && setDeleteVoucherId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar este voucher?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteVoucher} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <div>
              <h1 className="font-bold text-xl gradient-text">Configurações do Sistema</h1>
              <p className="text-sm text-muted-foreground">Gerencie preços, vouchers, áudios e configurações</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={configTab} onValueChange={(v) => setConfigTab(v as any)} className="space-y-6">
          <TabsList className="w-full flex flex-wrap gap-1 bg-card/50 border border-border/50 p-1.5 h-auto">
            <TabsTrigger value="pricing" className="flex-1 min-w-[100px] text-xs sm:text-sm py-2">
              <DollarSign className="w-4 h-4 mr-1.5" />
              Preços
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="flex-1 min-w-[100px] text-xs sm:text-sm py-2">
              <Gift className="w-4 h-4 mr-1.5" />
              Vouchers
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex-1 min-w-[100px] text-xs sm:text-sm py-2">
              <Headphones className="w-4 h-4 mr-1.5" />
              Áudios
            </TabsTrigger>
            <TabsTrigger value="pix" className="flex-1 min-w-[100px] text-xs sm:text-sm py-2">
              <QrCode className="w-4 h-4 mr-1.5" />
              PIX
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex-1 min-w-[100px] text-xs sm:text-sm py-2">
              <Video className="w-4 h-4 mr-1.5" />
              Vídeos
            </TabsTrigger>
            <TabsTrigger value="reactions" className="flex-1 min-w-[100px] text-xs sm:text-sm py-2">
              <Camera className="w-4 h-4 mr-1.5" />
              Reações
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 min-w-[100px] text-xs sm:text-sm py-2">
              <MessageCircle className="w-4 h-4 mr-1.5" />
              Avaliações
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 min-w-[100px] text-xs sm:text-sm py-2">
              <BarChart3 className="w-4 h-4 mr-1.5" />
              Analytics
            </TabsTrigger>
          </TabsList>
          
          {/* PRICING TAB */}
          <TabsContent value="pricing" className="space-y-4">
            <PricingManager />
          </TabsContent>
          
          {/* VOUCHERS TAB */}
          <TabsContent value="vouchers" className="space-y-4">
            <Card className="p-4 sm:p-6 border-primary/30">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  Cupons de Desconto
                </h2>
                <Dialog open={voucherDialogOpen} onOpenChange={(open) => {
                  setVoucherDialogOpen(open);
                  if (!open) {
                    setEditingVoucher(null);
                    setNewVoucher({ code: '', discount_type: 'percent', discount_value: 10, max_uses: null, valid_until: null, plan_ids: null, is_active: true });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Novo Voucher
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingVoucher ? 'Editar Voucher' : 'Novo Voucher'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Código *</Label>
                        <Input
                          value={(editingVoucher || newVoucher).code || ''}
                          onChange={(e) => editingVoucher 
                            ? setEditingVoucher({ ...editingVoucher, code: e.target.value.toUpperCase() })
                            : setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })}
                          placeholder="DESCONTO10"
                          className="uppercase"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Tipo de Desconto</Label>
                          <Select
                            value={(editingVoucher || newVoucher).discount_type || 'percent'}
                            onValueChange={(v) => editingVoucher 
                              ? setEditingVoucher({ ...editingVoucher, discount_type: v })
                              : setNewVoucher({ ...newVoucher, discount_type: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">Porcentagem (%)</SelectItem>
                              <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Valor *</Label>
                          <Input
                            type="number"
                            value={(editingVoucher || newVoucher).discount_value || ''}
                            onChange={(e) => editingVoucher 
                              ? setEditingVoucher({ ...editingVoucher, discount_value: parseInt(e.target.value) || 0 })
                              : setNewVoucher({ ...newVoucher, discount_value: parseInt(e.target.value) || 0 })}
                            placeholder={(editingVoucher || newVoucher).discount_type === 'percent' ? '10' : '500'}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Máximo de Usos</Label>
                          <Input
                            type="number"
                            value={(editingVoucher || newVoucher).max_uses || ''}
                            onChange={(e) => editingVoucher 
                              ? setEditingVoucher({ ...editingVoucher, max_uses: e.target.value ? parseInt(e.target.value) : null })
                              : setNewVoucher({ ...newVoucher, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                            placeholder="Ilimitado"
                          />
                        </div>
                        <div>
                          <Label>Usos por Usuário</Label>
                          <Input
                            type="number"
                            value={((editingVoucher || newVoucher) as any).max_uses_per_user || ''}
                            onChange={(e) => editingVoucher 
                              ? setEditingVoucher({ ...editingVoucher, max_uses_per_user: e.target.value ? parseInt(e.target.value) : null } as any)
                              : setNewVoucher({ ...newVoucher, max_uses_per_user: e.target.value ? parseInt(e.target.value) : null })}
                            placeholder="Ilimitado"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Válido até</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !((editingVoucher || newVoucher).valid_until) && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {(editingVoucher || newVoucher).valid_until 
                                ? format(new Date((editingVoucher || newVoucher).valid_until!), "dd/MM/yyyy", { locale: ptBR })
                                : "Selecione uma data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={(editingVoucher || newVoucher).valid_until ? new Date((editingVoucher || newVoucher).valid_until!) : undefined}
                              onSelect={(date) => {
                                const dateStr = date ? date.toISOString() : null;
                                editingVoucher 
                                  ? setEditingVoucher({ ...editingVoucher, valid_until: dateStr })
                                  : setNewVoucher({ ...newVoucher, valid_until: dateStr });
                              }}
                              initialFocus
                              className="p-3 pointer-events-auto"
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      {/* Planos Destino - Multi-select */}
                      <div>
                        <Label>Válido para planos (opcional)</Label>
                        <div className="mt-2 border rounded-md p-3 max-h-48 overflow-y-auto space-y-2 bg-background">
                          {[
                            { id: 'single', label: '1 Crédito Universal' },
                            { id: 'package', label: '3 Créditos Universais' },
                            { id: 'subscription', label: '5 Créditos Universais' },
                            { id: 'creator_start', label: 'Creator Start' },
                            { id: 'creator_pro', label: 'Creator Pro' },
                            { id: 'creator_studio', label: 'Creator Studio' },
                          ].map((plan) => {
                            const currentPlanIds = (editingVoucher || newVoucher).plan_ids || [];
                            const isChecked = currentPlanIds.includes(plan.id);
                            return (
                              <label key={plan.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    let newPlanIds: string[];
                                    if (e.target.checked) {
                                      newPlanIds = [...currentPlanIds, plan.id];
                                    } else {
                                      newPlanIds = currentPlanIds.filter(id => id !== plan.id);
                                    }
                                    const finalPlanIds = newPlanIds.length === 0 ? null : newPlanIds;
                                    editingVoucher 
                                      ? setEditingVoucher({ ...editingVoucher, plan_ids: finalPlanIds })
                                      : setNewVoucher({ ...newVoucher, plan_ids: finalPlanIds });
                                  }}
                                  className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
                                />
                                <span className="text-sm">{plan.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Deixe todos desmarcados para permitir em todos os planos
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={(editingVoucher || newVoucher).is_active ?? true}
                          onCheckedChange={(checked) => editingVoucher 
                            ? setEditingVoucher({ ...editingVoucher, is_active: checked })
                            : setNewVoucher({ ...newVoucher, is_active: checked })}
                        />
                        <Label>Voucher ativo</Label>
                      </div>
                      <Button onClick={saveVoucher} className="w-full" disabled={savingVoucher}>
                        {savingVoucher ? <Music className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              {loadingVouchers ? (
                <div className="flex items-center justify-center py-8">
                  <Music className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : vouchers.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum voucher cadastrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vouchers.map((voucher) => (
                    <Card key={voucher.id} className={`p-4 ${!voucher.is_active ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            {voucher.discount_type === 'percent' ? (
                              <Percent className="w-6 h-6 text-primary" />
                            ) : (
                              <DollarSign className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-mono font-bold text-lg">{voucher.code}</p>
                            <p className="text-sm text-muted-foreground">
                              {voucher.discount_type === 'percent' 
                                ? `${voucher.discount_value}% de desconto`
                                : `R$ ${(voucher.discount_value / 100).toFixed(2).replace('.', ',')} de desconto`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {voucher.max_uses ? (
                                <Badge variant={voucher.current_uses >= voucher.max_uses ? 'destructive' : 'outline'} className="text-xs">
                                  {voucher.current_uses}/{voucher.max_uses} usos
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Ilimitado</Badge>
                              )}
                              {voucher.valid_until && (
                                <Badge variant="outline" className="text-xs">
                                  até {new Date(voucher.valid_until).toLocaleDateString('pt-BR')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={voucher.is_active ? 'default' : 'secondary'}>
                            {voucher.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <VoucherShareMenu voucher={voucher} />
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditingVoucher(voucher);
                            setVoucherDialogOpen(true);
                          }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteVoucherId(voucher.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
          
          {/* AUDIO TAB */}
          <TabsContent value="audio" className="space-y-4">
            <Card className="p-4 sm:p-6 border-primary/30">
              <AudioSampleManager
                audioSamples={audioSamples}
                setAudioSamples={setAudioSamples}
                loadingAudio={loadingAudio}
                onDeleteAudio={(id) => setDeleteAudioId(id)}
              />
            </Card>
          </TabsContent>

          {/* PIX TAB */}
          <TabsContent value="pix" className="space-y-4">
            <Card className="p-4 sm:p-6 border-primary/30">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                Configurações de Pagamento PIX
              </h2>
              
              {loadingPix ? (
                <div className="flex items-center justify-center py-8">
                  <Music className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : pixConfig ? (
                <div className="space-y-4">
                  <div>
                    <Label>Chave PIX (CNPJ/CPF/Email/Celular)</Label>
                    <Input
                      value={pixConfig.pix_key}
                      onChange={(e) => setPixConfig({ ...pixConfig, pix_key: e.target.value })}
                      placeholder="14.389.841/0001-47"
                    />
                  </div>
                  
                  <div>
                    <Label>Nome do Recebedor</Label>
                    <Input
                      value={pixConfig.pix_name}
                      onChange={(e) => setPixConfig({ ...pixConfig, pix_name: e.target.value })}
                      placeholder="Criando Músicas"
                    />
                  </div>
                  
                  <div>
                    <Label>QR Code PIX</Label>
                    <div className="flex items-start gap-4 mt-2">
                      {pixConfig.qr_code_url && (
                        <div className="bg-white p-2 rounded-lg">
                          <img 
                            src={pixConfig.qr_code_url} 
                            alt="QR Code PIX" 
                            className="w-32 h-32 object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <input
                          ref={qrCodeInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleQrCodeUpload(e.target.files[0])}
                        />
                        <Button
                          variant="outline"
                          onClick={() => qrCodeInputRef.current?.click()}
                          disabled={uploadingQrCode}
                          className="w-full"
                        >
                          {uploadingQrCode ? (
                            <Music className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          {uploadingQrCode ? 'Enviando...' : 'Alterar QR Code'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Label>PIX Ativo</Label>
                    <Switch
                      checked={pixConfig.is_active ?? true}
                      onCheckedChange={(checked) => setPixConfig({ ...pixConfig, is_active: checked })}
                    />
                  </div>

                  <Button onClick={savePixConfig} className="w-full" disabled={savingPix}>
                    {savingPix ? <Music className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Configurações PIX
                  </Button>
                </div>
              ) : null}
            </Card>
          </TabsContent>

          {/* VIDEOS TAB */}
          <TabsContent value="videos" className="space-y-4">
            <Card className="p-4 sm:p-6 border-primary/30">
              <VideoOrdersManager />
            </Card>
          </TabsContent>

          {/* REACTIONS TAB */}
          <TabsContent value="reactions" className="space-y-4">
            <Card className="p-4 sm:p-6 border-primary/30">
              <ReactionVideosManager />
            </Card>
          </TabsContent>

          {/* REVIEWS TAB */}
          <TabsContent value="reviews" className="space-y-4">
            <Card className="p-4 sm:p-6 border-primary/30">
              <ReviewsManager />
            </Card>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="space-y-4">
            <Card className="p-4 sm:p-6 border-primary/30">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Analytics de Compartilhamento
              </h2>
              <ShareAnalytics />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminSettings;
