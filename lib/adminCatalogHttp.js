import 'server-only';
import { NextResponse } from 'next/server';
import { CatalogError } from './adminCatalogValidation.mjs';
import { PRIVATE_NO_STORE } from './auth/adminMutationAuth';

export function catalogErrorResponse(error, fallback) {
  if (error instanceof CatalogError) return NextResponse.json({ error: error.message }, { status: error.status, headers: PRIVATE_NO_STORE });
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500, headers: PRIVATE_NO_STORE });
}

export async function readJsonObject(request) {
  try {
    const value = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new CatalogError('A valid JSON object is required.'); }
}
