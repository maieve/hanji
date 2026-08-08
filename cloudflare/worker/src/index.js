const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json;charset=utf-8','cache-control':'no-store'}});
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS','access-control-allow-headers':'authorization,content-type,x-hanji-device'};
const withCors=response=>{const next=new Response(response.body,response);for(const [key,value] of Object.entries(cors))next.headers.set(key,value);return next};
const authorized=(request,env)=>{
  const value=request.headers.get('authorization')||'';
  return env.SYNC_TOKEN&&value===`Bearer ${env.SYNC_TOKEN}`;
};

export default {
  async fetch(request,env){
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(!authorized(request,env))return withCors(json({error:'unauthorized'},401));
    const url=new URL(request.url);const prefix='/v1/backups';
    if(url.pathname==='/health')return withCors(json({ok:true,service:'hanji-sync'}));
    if(url.pathname.startsWith('/v1/multipart/')){
      const parts=url.pathname.split('/').filter(Boolean);const action=parts[2];const name=decodeURIComponent(parts[3]||'');
      if(!/^[a-zA-Z0-9._-]+\.hanji$/.test(name))return withCors(json({error:'invalid_name'},400));
      const key=`backups/${name}`;
      if(action==='start'&&request.method==='POST'){const upload=await env.HANJI_BACKUPS.createMultipartUpload(key,{httpMetadata:{contentType:'application/zip'},customMetadata:{device:request.headers.get('x-hanji-device')||'ipad'}});return withCors(json({key:upload.key,uploadId:upload.uploadId}));}
      const uploadId=decodeURIComponent(parts[4]||'');if(!uploadId)return withCors(json({error:'missing_upload_id'},400));const upload=env.HANJI_BACKUPS.resumeMultipartUpload(key,uploadId);
      if(action==='part'&&request.method==='PUT'){const partNumber=Number(parts[5]);if(!Number.isInteger(partNumber)||partNumber<1||partNumber>10000)return withCors(json({error:'invalid_part'},400));const part=await upload.uploadPart(partNumber,request.body);return withCors(json({partNumber:part.partNumber,etag:part.etag}));}
      if(action==='complete'&&request.method==='POST'){const body=await request.json();const object=await upload.complete(body.parts);const listed=await env.HANJI_BACKUPS.list({prefix:'backups/',limit:100});const old=listed.objects.sort((a,b)=>b.uploaded-a.uploaded).slice(10);await Promise.all(old.map(x=>env.HANJI_BACKUPS.delete(x.key)));return withCors(json({ok:true,key:object.key,etag:object.httpEtag}));}
      if(action==='abort'&&request.method==='DELETE'){await upload.abort();return withCors(json({ok:true}));}
      return withCors(json({error:'invalid_multipart_request'},400));
    }
    if(url.pathname===prefix&&request.method==='GET'){
      const listed=await env.HANJI_BACKUPS.list({prefix:'backups/',limit:100});
      return withCors(json({objects:listed.objects.sort((a,b)=>b.uploaded-a.uploaded).map(x=>({key:x.key,name:x.key.slice(8),size:x.size,uploaded:x.uploaded,etag:x.etag}))}));
    }
    if(!url.pathname.startsWith(`${prefix}/`))return withCors(json({error:'not_found'},404));
    const name=decodeURIComponent(url.pathname.slice(prefix.length+1));
    if(!/^[a-zA-Z0-9._-]+\.hanji$/.test(name))return withCors(json({error:'invalid_name'},400));
    const key=`backups/${name}`;
    if(request.method==='PUT'){
      const length=Number(request.headers.get('content-length')||0);if(length>90_000_000)return withCors(json({error:'use_multipart',maxBytes:90_000_000},413));
      await env.HANJI_BACKUPS.put(key,request.body,{httpMetadata:{contentType:'application/zip'},customMetadata:{device:request.headers.get('x-hanji-device')||'ipad'}});
      const listed=await env.HANJI_BACKUPS.list({prefix:'backups/',limit:100});const old=listed.objects.sort((a,b)=>b.uploaded-a.uploaded).slice(10);await Promise.all(old.map(x=>env.HANJI_BACKUPS.delete(x.key)));
      return withCors(json({ok:true,key}));
    }
    if(request.method==='GET'){
      const object=await env.HANJI_BACKUPS.get(key);if(!object)return withCors(json({error:'not_found'},404));
      const headers=new Headers(cors);object.writeHttpMetadata(headers);headers.set('etag',object.httpEtag);headers.set('content-disposition',`attachment; filename="${name}"`);return new Response(object.body,{headers});
    }
    if(request.method==='DELETE'){await env.HANJI_BACKUPS.delete(key);return withCors(json({ok:true}));}
    return withCors(json({error:'method_not_allowed'},405));
  }
};
