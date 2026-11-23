import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

interface ProfileOnboardingProps {
  open: boolean;
  onComplete: () => void;
  userId: string;
  userEmail: string;
  initialName?: string | null;
}

const ProfileOnboarding = ({
  open,
  onComplete,
  userId,
  userEmail,
  initialName,
}: ProfileOnboardingProps) => {
  const { toast } = useToast();
  const { t } = useTranslation("common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: initialName || "",
    whatsapp: "",
  });

  const formatWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: t("profileOnboarding.invalidFormat"),
        description: t("profileOnboarding.selectImage"),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("profileOnboarding.fileTooLarge"),
        description: t("profileOnboarding.maxSize"),
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast({
        title: t("profileOnboarding.photoUploaded"),
        description: t("profileOnboarding.photoUpdated"),
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: t("profileOnboarding.photoError"),
        description: t("profileOnboarding.retry"),
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: t("profileOnboarding.nameRequired"),
        description: t("profileOnboarding.enterName"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First try to update existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching profile:", fetchError);
        throw fetchError;
      }

      let error;
      
      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            name: formData.name.trim(),
            whatsapp: formData.whatsapp || null,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        error = updateError;
      } else {
        // Insert new profile if it doesn't exist
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            name: formData.name.trim(),
            whatsapp: formData.whatsapp || null,
            avatar_url: avatarUrl,
          });
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: t("profileOnboarding.profileUpdated"),
        description: t("profileOnboarding.savedOk"),
      });
      onComplete();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: t("profileOnboarding.saveError"),
        description: t("profileOnboarding.retry"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            {t("profileOnboarding.title")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t("profileOnboarding.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <div
              className="relative cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="w-24 h-24 border-2 border-primary/20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-muted">
                  <User className="w-10 h-10 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {t("profileOnboarding.addPhoto")}
          </p>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t("profileOnboarding.name")} *</Label>
            <Input
              id="name"
              placeholder={t("profileOnboarding.namePlaceholder")}
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          {/* WhatsApp */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp">{t("profileOnboarding.whatsapp")}</Label>
            <Input
              id="whatsapp"
              placeholder={t("profileOnboarding.phonePlaceholder")}
              value={formData.whatsapp}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  whatsapp: formatWhatsApp(e.target.value),
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              {t("profileOnboarding.whatsappHint")}
            </p>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={userEmail} disabled className="bg-muted/50" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("profileOnboarding.saving")}
              </>
            ) : (
              t("profileOnboarding.saveContinue")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileOnboarding;
