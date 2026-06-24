import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

async function readFunctionError(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  try {
    const body = await error.context.json();
    if (body && typeof body === 'object') {
      if ('error' in body && body.error) return String(body.error);
      if ('message' in body && body.message) return String(body.message);
    }
  } catch {
    // ignore
  }
  return null;
}

export async function deleteAccount(): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'delete-account',
    { method: 'POST', body: { confirm: true } },
  );

  if (error) {
    const detail = await readFunctionError(error);
    return { error: detail ?? error.message };
  }

  if (data?.error) {
    return { error: data.error };
  }

  return { error: null };
}
