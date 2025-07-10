// app/api/auth/disconnect/route.js

import { kv } from '@vercel/kv';

export async function POST(request) {
  // In a real app, get the user ID from session/auth
  const userId = 'default_user';
  const key = `oauth_tokens:${userId}`;
  await kv.del(key); // Delete the tokens from KV
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}