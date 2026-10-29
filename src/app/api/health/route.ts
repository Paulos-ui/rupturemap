import { NextResponse } from 'next/server';

/** Synteq health probe: verifies the web server, not database credentials. */
export function GET() {
  return NextResponse.json({ status: 'ok', service: 'RUPTUREMAP', version: '3.0.0' });
}
