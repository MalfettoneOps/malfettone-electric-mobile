import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, getCurrentProfile } from '../lib/supabase';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Fallback: go to login after 6 seconds no matter what
    const timeout = setTimeout(() => {
      router.replace('/login');
    }, 6000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      if (!session) {
        router.replace('/login');
        return;
      }
      try {
        const profile = await getCurrentProfile();
        if (profile?.is_admin) {
          router.replace('/dispatch/today');
        } else {
          router.replace('/portal/jobs');
        }
      } catch {
        router.replace('/login');
      }
    }).catch(() => {
      clearTimeout(timeout);
      router.replace('/login');
    });

    // Also listen for auth changes (e.g. sign out from another screen)
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login');
      }
    });

    return () => {
      clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0f1a', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#7CC73F" size="large" />
    </View>
  );
}
