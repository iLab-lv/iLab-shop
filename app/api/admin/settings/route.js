import { NextResponse } from 'next/server';
import { getPermissionSession } from '../../../../lib/auth/sessionAuth';
import { authorizeAdminMutation, PRIVATE_NO_STORE } from '../../../../lib/auth/adminMutationAuth';
import { PERMISSIONS } from '../../../../lib/auth/roles.mjs';
import { getAdminShopSettings, updateShopSettings } from '../../../../lib/shopSettings';

export const dynamic = 'force-dynamic';
export async function GET() { const session = await getPermissionSession(PERMISSIONS.MANAGE_SETTINGS); if (!session.authenticated) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401, headers: PRIVATE_NO_STORE }); if (!session.authorized) return NextResponse.json({ error: 'Settings management access is required.' }, { status: 403, headers: PRIVATE_NO_STORE }); try { return NextResponse.json(await getAdminShopSettings(), { headers: PRIVATE_NO_STORE }); } catch (error) { console.error('Unable to load Shop settings.', error); return NextResponse.json({ error: 'Unable to load settings.' }, { status: 500, headers: PRIVATE_NO_STORE }); } }
export async function PUT(request) { const denied = await authorizeAdminMutation(request, PERMISSIONS.MANAGE_SETTINGS); if (denied) return denied; try { return NextResponse.json({ settings: await updateShopSettings(await request.json()) }, { headers: PRIVATE_NO_STORE }); } catch (error) { const invalid = error instanceof SyntaxError || error?.message?.startsWith('invalid_'); if (!invalid) console.error('Unable to save Shop settings.', error); return NextResponse.json({ error: invalid ? 'Check the settings fields and try again.' : 'Unable to save settings.' }, { status: invalid ? 400 : 500, headers: PRIVATE_NO_STORE }); } }
