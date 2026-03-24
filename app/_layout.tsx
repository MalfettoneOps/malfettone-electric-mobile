import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { supabase, getCurrentProfile } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const route = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      const profile = await getCurrentProfile();
      if (profile?.is_admin) {
        router.replace('/dispatch/today');
      } else {
        router.replace('/portal/jobs');
      }
    } catch {
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    route();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login');
      } else if (event === 'SIGNED_IN' && session) {
        const profile = await getCurrentProfile();
        if (profile?.is_admin) {
          router.replace('/dispatch/today');
        } else {
          router.replace('/portal/jobs');
        }
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#0a0f1a', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#7CC73F" size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0f1a' } }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="portal" />
        <Stack.Screen name="dispatch" />
      </Stack>
    </SafeAreaProvider>
  );
}
