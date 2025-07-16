// app/api/auth/disconnect/route.js

// import { kv } from '@vercel/kv'
import { deleteMeliTokens } from '@/lib/meliTokens';

export async function POST(request) {
  // In a real app, get the user ID from session/auth
  await deleteMeliTokens({ organization_id, meli_user_id });
  // await kv.del(key); // Delete the tokens from KV
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}