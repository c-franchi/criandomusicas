import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { generationLanguageEnglishName, resolveGenerationLanguage } from '../../supabase/functions/_shared/generationLanguage.ts';

test('sample description generation requires Italian output',async()=>{
 let aiBody;
 globalThis.Deno={env:{get:()=> 'fixture'},serve:handler=>{globalThis.__descriptionHandler=handler;}};
 globalThis.fetch=async(_url,options)=>{aiBody=JSON.parse(options.body);return Response.json({choices:[{message:{content:'Una descrizione italiana.'}}]});};
 globalThis.__descriptionLanguage={generationLanguageEnglishName,resolveGenerationLanguage};
 const source=readFileSync(new URL('../../supabase/functions/generate-audio-description/index.ts',import.meta.url),'utf8')
  .replace(/^import ["']https:\/\/deno.land\/x\/xhr[^\n]+\n/m,'')
  .replace(/^import .*http\/server.ts.*$/m,'const serve=handler=>{globalThis.__descriptionHandler=handler;};')
  .replace(/^import .*generationLanguage.*$/m,'const {generationLanguageEnglishName,resolveGenerationLanguage}=globalThis.__descriptionLanguage;')
  .replace(/^import .*requestAuth.*$/m,'const getRequestAuth=async()=>({isAdmin:true});const authError=()=>new Response(null,{status:401});');
 await import('data:text/javascript,'+encodeURIComponent(transformSync(source,{loader:'ts',format:'esm'}).code));
 const response=await globalThis.__descriptionHandler(new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify({title:'Per Te',style:'pop',language:'it'})}));
 assert.equal(response.status,200);assert.match(aiBody.messages[0].content,/Write only in Italian/);assert.match(aiBody.messages[1].content,/IDIOMA OBRIGATÓRIO DA DESCRIÇÃO: Italian/);
});

test('audio capture and admin samples carry the selected order language',()=>{
 const wizard=readFileSync(new URL('../components/briefing/AudioModeWizard.tsx',import.meta.url),'utf8');
 const transcription=readFileSync(new URL('../../supabase/functions/transcribe-audio/index.ts',import.meta.url),'utf8');
 const samples=readFileSync(new URL('../components/admin/AudioSampleManager.tsx',import.meta.url),'utf8');
 assert.match(wizard,/body: \{ audio_id: audioId, language: audioLanguage \}/);
 assert.doesNotMatch(wizard,/language: ["']pt["']/);
 assert.match(transcription,/formData.append\('language', resolvedLanguage\)/);assert.match(transcription,/transcriptionPrompt\(resolvedLanguage\)/);
 assert.match(samples,/language: track.language/);assert.match(samples,/audioSampleFallbackDescription\(track.language, track.purpose\)/);
});
