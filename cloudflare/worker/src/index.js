const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json;charset=utf-8','cache-control':'no-store'}});
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,PUT,DELETE,OPTIONS','access-control-allow-headers':'authorization,content-type'};
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
    if(url.pathname===prefix&&request.method==='GET'){
      const listed=await env.HANJI_BACKUPS.list({prefix:'backups/',limit:100});
      return withCors(json({objects:listed.objects.sort((a,b)=>b.uploaded-a.uploaded).map(x=>({key:x.key,name:x.key.slice(8),size:x.size,uploaded:x.uploaded,etag:x.etag}))}));
    }
    if(!url.pathname.startsWith(`${prefix}/`))return withCors(json({error:'not_found'},404));
    const name=decodeURIComponent(url.pathname.slice(prefix.length+1));
    if(!/^[a-zA-Z0-9._-]+\.hanji$/.test(name))return withCors(json({error:'invalid_name'},400));
    const key=`backups/${name}`;
    if(request.method==='PUT'){
      const length=Number(request.headers.get('content-length')||0);if(length>100_000_000)return withCors(json({error:'backup_too_large',maxBytes:100_000_000},413));
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
