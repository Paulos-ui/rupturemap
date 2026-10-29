/** No npm dependencies needed. Runs on Node.js >=20 using built-in fetch. */
export const endpoint=(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '').replace(/\/$/,'');
export const project=process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const databaseId=process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'rupturemap';
const key=process.env.APPWRITE_API_KEY;
export function assertConfiguration(){
  if(!/^https:\/\/.+\/v1$/.test(endpoint)||!project||!key||/^(your_|replace_|paste_)/i.test(project)||/^(your_|replace_|paste_)/i.test(key)) {
    throw Error('Missing Appwrite settings. Set NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID and APPWRITE_API_KEY. Keep the API key private.');
  }
}
export const tablePath = id=>`/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(id)}`;
export class AppwriteError extends Error {constructor(message,status,details){super(message);this.status=status;this.details=details;}}
export async function api(method,path,body){
  assertConfiguration();
  const response=await fetch(`${endpoint}${path}`,{
    method,
    headers:{'Content-Type':'application/json','X-Appwrite-Project':project,'X-Appwrite-Key':key},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const data=await response.json().catch(()=>({message:`Non-JSON response (${response.status})`}));
  if(!response.ok)throw new AppwriteError(`${method} ${path}: ${data.message||response.statusText} (HTTP ${response.status})`,response.status,data);
  return data;
}
export async function exists(path){try{return await api('GET',path);}catch(e){if(e.status===404)return null;throw e;}}
export const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
