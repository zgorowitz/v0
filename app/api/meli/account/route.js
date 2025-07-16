import { storeMeliAccounts } from '@/lib/meliTokens';

export async function POST(request) {
  try {
    const userInfo = await request.json();

    // Basic validation
    if (!userInfo || !userInfo.id) {
      console.error('Missing userInfo or userInfo.id in request body:', userInfo);
      return Response.json({ error: 'Missing user info or user ID' }, { status: 400 });
    }

    const { error, data } = await storeMeliAccounts(userInfo);

    if (error) {
      console.error('Supabase error in storeMeliAccounts:', error);
      return Response.json({ error: error.message || error }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('Unexpected error in /api/meli/account:', err);
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}