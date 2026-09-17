import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const ROOT=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
export async function staticFixtureServer(){
 const server=http.createServer(async(req,res)=>{
  try {
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname!=='/'&&!/^\/(src|assets|test)\//.test(pathname)&&pathname!=='/index.html'){res.writeHead(404);res.end();return;}
   const target=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
   if(!target.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
   const data=await fs.readFile(target);
   const types={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html;charset=utf-8','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg','.png':'image/png','.woff2':'font/woff2'};
   res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {origin:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(r=>server.close(r))};
}
