import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse, optionsResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Not authenticated' }, 401);

  let confirm = false;
  try {
    const body = await req.json();
    confirm = body?.confirm === true;
  } catch {
    // body optional
  }

  if (!confirm) {
    return jsonResponse({ error: 'Account deletion must be confirmed.' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: 'Server not configured' }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user?.id) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  const userId = authData.user.id;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Remove uploaded style cover images for this user.
  const { data: styleFiles } = await adminClient.storage.from('style-covers').list(userId);
  if (styleFiles?.length) {
    const paths = styleFiles.map((file) => `${userId}/${file.name}`);
    await adminClient.storage.from('style-covers').remove(paths);
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500);
  }

  return jsonResponse({ ok: true });
});
