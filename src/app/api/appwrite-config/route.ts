import { NextResponse } from 'next/server';

// Always read the ACTUAL running container's environment. Next.js statically
// replaces direct process.env.NEXT_PUBLIC_* references in browser code.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function readEnv(name: string): string {
  return (process.env[name] || '').trim();
}

export function GET() {
  // These are PUBLIC Appwrite SDK configuration values, not credentials.
  // The admin APPWRITE_API_KEY is deliberately NEVER read or returned here.
  const endpoint = readEnv(['NEXT_PUBLIC','APPWRITE','ENDPOINT'].join('_')) || readEnv('APPWRITE_ENDPOINT');
  const projectId = readEnv(['NEXT_PUBLIC','APPWRITE','PROJECT_ID'].join('_')) || readEnv('APPWRITE_PROJECT_ID');
  const databaseId = readEnv(['NEXT_PUBLIC','APPWRITE','DATABASE_ID'].join('_')) || 'rupturemap';
  const missing = [
    ...(!endpoint ? ['NEXT_PUBLIC_APPWRITE_ENDPOINT'] : []),
    ...(!projectId || projectId.toLowerCase().includes('your_') ? ['NEXT_PUBLIC_APPWRITE_PROJECT_ID'] : [])
  ];
  return NextResponse.json(
    missing.length ? {configured:false,missing} : {configured:true,endpoint,projectId,databaseId},
    {headers:{'Cache-Control':'no-store, max-age=0'}}
  );
}
