import { regions, detectRegionFromTimezone, type Region } from './regions.ts';
export type LocaleLanguage = 'pt-BR' | 'en' | 'es' | 'it';
export type LocaleSnapshot = { language: LocaleLanguage; mode: 'auto' | 'manual'; region: Region | null };
const languageKey='criandomusicas-language', regionKey='criandomusicas-region', modeKey='criandomusicas-locale-mode';
export function supportedBrowserLanguage(languages: readonly string[]): LocaleLanguage | null {
  for(const value of languages) {
    const base=value.toLowerCase().split('-')[0];
    if(base==='pt')return 'pt-BR';
    if(base==='en'||base==='es'||base==='it')return base;
  }
  return null;
}
export function countryLanguage(country: string | null): LocaleLanguage | null {
  if(!country)return null;
  if(['BR','PT','AO','MZ','CV','GW','ST','TL'].includes(country))return 'pt-BR';
  if(['IT','SM','VA'].includes(country))return 'it';
  if(['ES','MX','AR','CO','CL','PE','UY','PY','BO','EC','VE','PA','CR','NI','HN','SV','GT','DO','CU','GQ'].includes(country))return 'es';
  if(['US','GB','CA','AU','NZ','IE'].includes(country))return 'en';
  return null;
}
export function countryFromTrace(body: string): string | null {
  if(body.length>8192)return null;
  return body.match(/^loc=([A-Z]{2})\r?$/m)?.[1] || null;
}
/** Uses this site's existing edge endpoint. Never logs/stores the trace or its IP field. */
export async function detectAccessCountry(fetcher: typeof fetch, timeoutMs=1500): Promise<string | null> {
  const controller=new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    // The deadline also bounds faulty/offline transports that ignore abort signals.
    return await Promise.race([
      (async()=>{
        const response=await fetcher('/cdn-cgi/trace',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
        if(!response.ok || !response.headers.get('content-type')?.includes('text/plain'))return null;
        return countryFromTrace(await response.text());
      })(),
      new Promise<null>(resolve=>{timeout=setTimeout(()=>{controller.abort();resolve(null);},timeoutMs);}),
    ]);
  } catch { return null; }
  finally {if(timeout)clearTimeout(timeout);}
}

type Options={ storage?:()=>Pick<Storage,'getItem'|'setItem'|'removeItem'> | undefined; fetcher?:typeof fetch; timezone?:()=>string; languages?:()=>readonly string[] };
export function createLocaleController(options: Options={}) {
  const read=(key:string)=>{try{return options.storage?.()?.getItem(key) || null;}catch{return null;}};
  const write=(key:string,value:string)=>{try{options.storage?.()?.setItem(key,value);}catch{/* In-memory preferences still work. */}};
  const browser=()=>{try{return supportedBrowserLanguage(options.languages?.()||[]) || 'pt-BR';}catch{return 'pt-BR' as const;}};
  const timezone=()=>{try{return options.timezone?detectRegionFromTimezone(options.timezone()):null;}catch{return null;}};
  const savedRegion=regions.find(r=>r.code===read(regionKey))||null;
  const savedLanguage=supportedBrowserLanguage([read(languageKey)||'']);
  // Old language-only values were written automatically by the previous detector.
  // A legacy region, in contrast, was saved only after an explicit user selection.
  const manual=read(modeKey)==='manual'||(read(modeKey)!=='auto'&&!!savedRegion);
  let state: LocaleSnapshot={mode:manual?'manual':'auto',region:manual?savedRegion:timezone(),language:manual?(savedLanguage||savedRegion?.language as LocaleLanguage||browser()):(timezone()?.language as LocaleLanguage||browser())};
  let revision=0, country: Promise<string|null> | undefined;
  const listeners=new Set<()=>void>();
  const update=(next:LocaleSnapshot)=>{state=next;listeners.forEach(fn=>fn());return state;};
  const resolve=async()=>{
    const current=++revision;
    if(state.mode==='manual')return state;
    country??=options.fetcher?detectAccessCountry(options.fetcher):Promise.resolve(null);
    const code=await country;
    if(current!==revision || (state as LocaleSnapshot).mode==='manual')return state;
    const region=regions.find(r=>r.code===code)||timezone();
    return update({mode:'auto',region,language:countryLanguage(code)||(region?.language as LocaleLanguage)||browser()});
  };
  return {
    getSnapshot:()=>state,
    subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},
    resolve,
    selectRegion:(code:string)=>{
      const region=regions.find(r=>r.code===code);if(!region)return state;
      revision++;write(modeKey,'manual');write(regionKey,region.code);write(languageKey,region.language);
      // Preserve the existing explicit region/currency selector behavior.
      write('criandomusicas-currency',region.currency);
      return update({mode:'manual',region,language:region.language as LocaleLanguage});
    },
    selectLanguage:(language:LocaleLanguage)=>{
      revision++;write(modeKey,'manual');write(languageKey,language);
      return update({...state,mode:'manual',language});
    },
    automatic:()=>{
      revision++;write(modeKey,'auto');update({...state,mode:'auto'});
      return resolve();
    },
  };
}
export const localeController=createLocaleController({
  storage:()=>typeof window==='undefined'?undefined:window.localStorage,
  fetcher:typeof window==='undefined'?undefined:window.fetch.bind(window),
  languages:()=>typeof navigator==='undefined'?[]:navigator.languages,
  timezone:()=>Intl.DateTimeFormat().resolvedOptions().timeZone,
});
