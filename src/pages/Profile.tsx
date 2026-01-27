import { useState, useEffect, useRef } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Phone, 
  Mail, 
  Save, 
  ArrowLeft,
  Music,
  Camera,
  Loader2,
  Package,
  Gift,
  Crown,
  Globe
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import CreditsManagement from "@/components/CreditsManagement";
import CreditTransfer from "@/components/CreditTransfer";
import CreatorSubscriptionManager from "@/components/CreatorSubscriptionManager";
import { supportedLanguages, type SupportedLanguage } from "@/lib/i18n";

const Profile = () => {
  const { t, i18n } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    whatsapp: ""
  });

  // Get the tab from URL query params (default to 'profile')
  const tabFromUrl = searchParams.get('tab') || 'profile';
  const validTabs = ['profile', 'subscription', 'credits', 'transfer'];
  const activeTab = validTabs.includes(tabFromUrl) ? tabFromUrl : 'profile';

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
        whatsapp: (profile as any).whatsapp || ""
      });
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('profile.errors.invalidFile'),
        description: t('profile.errors.selectImage'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('profile.errors.fileTooLarge'),
        description: t('profile.errors.maxSize'),
        variant: 'destructive',
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      toast({
        title: t('profile.success.photoUpdated'),
        description: t('profile.success.photoSaved'),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : tc('errors.unknown');
      toast({
        title: t('profile.errors.uploadError'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
      // Reset input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone,
          whatsapp: formData.whatsapp
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: t('profile.success.updated'),
        description: t('profile.success.saved'),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : tc('errors.unknown');
      toast({
        title: t('profile.errors.saveError'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatWhatsApp = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica máscara (XX) XXXXX-XXXX
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{tc('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('profile.backToDashboard')}
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            {/* Avatar Upload */}
            <div className="relative group">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
              />
              <div 
                className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary transition-colors"
                onClick={() => avatarInputRef.current?.click()}
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              <div 
                className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
              <p className="text-muted-foreground">{t('profile.subtitle')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('profile.clickToChange')}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs for Profile, Credits, Subscription and Transfers */}
        <Tabs defaultValue={activeTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-1 text-xs sm:text-sm">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{t('profile.tabs.profile')}</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-1 text-xs sm:text-sm">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">{t('profile.tabs.subscription')}</span>
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-1 text-xs sm:text-sm">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">{t('profile.tabs.credits')}</span>
            </TabsTrigger>
            <TabsTrigger value="transfer" className="flex items-center gap-1 text-xs sm:text-sm">
              <Gift className="w-4 h-4" />
              <span className="hidden sm:inline">{t('profile.tabs.transfer')}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            {/* Profile Form */}
            <Card className="p-6">
              <div className="space-y-6">
                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {t('profile.fields.email')}
                  </Label>
                  <Input
                    value={user.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('profile.fields.emailHint')}
                  </p>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t('profile.fields.name')}
                  </Label>
                  <Input
                    id="name"
                    placeholder={t('profile.fields.namePlaceholder')}
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {t('profile.fields.phone')}
                  </Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      phone: formatWhatsApp(e.target.value) 
                    }))}
                    maxLength={15}
                  />
                </div>

                {/* WhatsApp */}
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {t('profile.fields.whatsapp')}
                  </Label>
                  <Input
                    id="whatsapp"
                    placeholder="(00) 00000-0000"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      whatsapp: formatWhatsApp(e.target.value) 
                    }))}
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('profile.fields.whatsappHint')}
                  </p>
                </div>

                {/* Language Selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {t('profile.fields.language', { defaultValue: 'Idioma / Language' })}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {supportedLanguages.map((lang) => (
                      <Button
                        key={lang.code}
                        type="button"
                        variant={i18n.language === lang.code ? "default" : "outline"}
                        className="justify-start gap-2"
                        onClick={() => i18n.changeLanguage(lang.code)}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="w-full"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Music className="w-4 h-4 mr-2 animate-spin" />
                      {tc('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('profile.save')}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="subscription">
            <CreatorSubscriptionManager />
          </TabsContent>

          <TabsContent value="credits">
            <CreditsManagement />
          </TabsContent>
          
          <TabsContent value="transfer">
            <CreditTransfer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
