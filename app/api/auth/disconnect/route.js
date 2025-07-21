// app/api/auth/disconnect/route.js
import { deleteMeliTokens } from '@/lib/meliTokens';
import { handleAuthError } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    await deleteMeliTokens();
    return Response.json({ success: true });
  } catch (error) {
    const { status, body } = handleAuthError(error);
    return Response.json(body, { status });
  }
}