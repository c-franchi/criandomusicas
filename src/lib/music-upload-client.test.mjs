import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMusicUploadClient } from './music-upload-client.ts';
import { saveMusicUpload } from './music-upload.ts';

test('real Supabase SDK uploads normalized MIME and saves track/order with the same user JWT',async()=>{
  let sessionReads=0;
  const calls=[], token='fixture-user-token';
  const parent={auth:{getSession:async()=>{sessionReads++;return {data:{session:{access_token:token}},error:null}}}};
  const transport=async(input,options)=>{
    const url=String(input), headers=new Headers(options.headers);
    calls.push({url,options,headers});
    assert.equal(headers.get('authorization'),`Bearer ${token}`);
    if(url.includes('/storage/v1/object/')) {
      assert.equal(options.body.get('').type,'audio/wav');
      return Response.json({Key:'music-tracks/audio.wav',Id:'fixture'});
    }
    if(url.includes('/rest/v1/tracks') && options.method==='GET') return Response.json([{version:1,audio_url:'https://fixture.invalid/ready.wav'}]);
    return new Response(null,{status:201});
  };
  const c=await createMusicUploadClient(parent,new AbortController().signal,{url:'https://fixture.supabase.co',key:'fixture-publishable',transport});
  const result=await saveMusicUpload(c,new File(['wave'],'song.wav',{type:'application/octet-stream'}),{
    id:'order',user_id:'owner',status:'MUSIC_GENERATING',approved_lyric_id:'lyric',gift:{duration_seconds:15,track_version:1,music_source:'new'}
  },1,18);
  assert.equal(result.newlyCompleted,true);
  assert.equal(sessionReads,1);
  assert.equal(calls.length,4);
  assert(!calls.some(c=>c.url.includes('musical_gifts')));
  assert.equal(JSON.parse(calls.at(-1).options.body).status,'COMPLETED');
});
test('missing session blocks uploads before any storage request',async()=>{
  await assert.rejects(()=>createMusicUploadClient({auth:{getSession:async()=>({data:{session:null},error:null})}},new AbortController().signal,{url:'https://fixture.supabase.co',key:'fixture',transport:fetch}),/sessão expirou/);
});
