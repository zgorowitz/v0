// app/api/auth/disconnect/route.js

import { kv } from '@vercel/kv';
import { storeMeliTokens, getMeliTokens, deleteMeliTokens } from '@/lib/meliTokens';


export async function POST(request) {
  await deleteMeliTokens({
    organization_id, // get from session
    meli_user_id     // get from session
  }); // Delete the tokens from db
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}