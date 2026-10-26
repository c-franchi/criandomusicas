import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Eye, Loader2, Save, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useMaintenance } from '@/hooks/useMaintenance';
import { maintenanceQueryKey } from '@/lib/maintenance';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function MaintenanceManager() {
  const { t } = useTranslation('admin');
  const query = useMaintenance();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.data && !dirty) {
      setEnabled(query.data.enabled);
      setTitle(query.data.title);
      setMessage(query.data.message);
    }
  }, [query.data, dirty]);

  const save = async () => {
    if (!title.trim() || !message.trim() || saving) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('site_maintenance')
        .update({ enabled, title: title.trim(), message: message.trim() })
        .eq('id', true).select('id, enabled, title, message, updated_at').single();
      if (error) throw error;
      queryClient.setQueryData(maintenanceQueryKey, data);
      setDirty(false);
      toast({ title: t(enabled ? 'maintenance.activated' : 'maintenance.deactivated') });
      void queryClient.invalidateQueries({ queryKey: maintenanceQueryKey });
    } catch (error) {
      toast({ title: t('maintenance.saveError'), description: error instanceof Error ? error.message : t('maintenance.retry'), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (query.isPending) return <Card className="p-6" role="status"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{t('maintenance.loading')}</Card>;
  if (query.isError) return <Card className="space-y-4 p-6"><p role="alert">{t('maintenance.loadError')}</p><Button onClick={() => { void query.refetch(); }}>{t('maintenance.retry')}</Button></Card>;
  return (
    <Card className="space-y-6 border-primary/30 p-5 sm:p-7">
      <div><h2 className="flex items-center gap-2 text-xl font-semibold"><Wrench className="h-5 w-5 text-primary" />{t('maintenance.title')}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('maintenance.description')}</p></div>
      <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm" role="status">{t(query.data.enabled ? 'maintenance.currentEnabled' : 'maintenance.currentDisabled')}</p>
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4"><div><Label htmlFor="maintenance-enabled" className="text-base">{t('maintenance.enabledLabel')}</Label><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t('maintenance.enabledHelp')}</p></div><Switch id="maintenance-enabled" checked={enabled} disabled={saving} onCheckedChange={value => { setEnabled(value); setDirty(true); }} /></div>
      <div className="space-y-2"><Label htmlFor="maintenance-title">{t('maintenance.titleLabel')}</Label><Input id="maintenance-title" value={title} maxLength={120} disabled={saving} onChange={event => { setTitle(event.target.value); setDirty(true); }} /></div>
      <div className="space-y-2"><Label htmlFor="maintenance-message">{t('maintenance.messageLabel')}</Label><Textarea id="maintenance-message" value={message} maxLength={1200} rows={5} disabled={saving} onChange={event => { setMessage(event.target.value); setDirty(true); }} /></div>
      <p className="text-xs leading-relaxed text-muted-foreground">{t('maintenance.delay')}</p>
      <div className="flex flex-wrap gap-3"><Button onClick={save} disabled={saving || !dirty || !title.trim() || !message.trim()} className="min-h-12">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t('maintenance.save')}</Button><Button asChild variant="outline" className="min-h-12"><Link to="/manutencao" target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" />{t('maintenance.preview')}</Link></Button></div>
    </Card>
  );
}
