import { useEffect, useState } from 'react';
import { supabase } from './supabase';

interface Session {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
  user?: object;
}

export const useSupabaseSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setError(error.message);
        } else {
          setSession(data?.session ?? null);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  return { session, loading, error };
};
