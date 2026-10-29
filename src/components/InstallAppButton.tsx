import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/hooks/usePwaInstall';
export default function InstallAppButton({className='',iconOnly=false,onClick}:{className?:string;iconOnly?:boolean;onClick?:()=>void}) {
 const {t}=useTranslation('common'); const navigate=useNavigate(); const pwa=usePwaInstall();
 return <Button variant="outline" size={iconOnly?'icon':'default'} className={className} aria-label={t('install.title')} title={t('install.title')} disabled={pwa.status==='prompting'||pwa.status==='installing'} onClick={()=>{
  if(pwa.status==='ready') void pwa.install(); else navigate('/install');
  onClick?.();
 }}><Download className="h-4 w-4 shrink-0" />{!iconOnly&&t('navigation.install')}</Button>;
}
