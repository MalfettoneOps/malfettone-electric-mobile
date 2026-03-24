import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert,
  ActivityIndicator,
} from 'react-native';
import { getCurrentProfile, signOut, Profile } from '../../lib/supabase';

export default function DispatchProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getCurrentProfile().then(p => { setProfile(p); setLoading(false); });
  }, []);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try { await signOut(); } catch { setSigningOut(false); }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#7CC73F" size="large" />
      </SafeAreaView>
    );
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Profile</Text>
      </View>

      {/* Role badge */}
      <View style={styles.roleBanner}>
        <Text style={styles.roleText}>⚡ Field Technician / Admin</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.full_name}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
      </View>

      {/* Info rows */}
      <View style={styles.infoSection}>
        {profile?.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profile.phone}</Text>
          </View>
        )}
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : '—'}
          </Text>
        </View>
      </View>

      {/* Quick stats placeholder */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🔧</Text>
          <Text style={styles.statLabel}>Dispatch App</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>📍</Text>
          <Text style={styles.statLabel}>NJ Licensed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>⚡</Text>
          <Text style={styles.statLabel}>Malfettone</Text>
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut
            ? <ActivityIndicator color="#ef4444" size="small" />
            : <Text style={styles.signOutText}>Sign Out</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1a' },
  centered: { flex: 1, backgroundColor: '#0a0f1a', justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  heading: { color: '#fff', fontSize: 24, fontWeight: '700' },
  roleBanner: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: 'rgba(124,199,63,0.1)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(124,199,63,0.2)', alignSelf: 'flex-start',
  },
  roleText: { color: '#7CC73F', fontSize: 13, fontWeight: '600' },
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(124,199,63,0.18)', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#7CC73F', fontSize: 26, fontWeight: '700' },
  name: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  email: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  infoSection: {
    marginHorizontal: 20, backgroundColor: '#0d1b2e', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  infoLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '500' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#0d1b2e', borderRadius: 10, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '500', textAlign: 'center' },
  footer: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 32 },
  signOutBtn: {
    paddingVertical: 14, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    alignItems: 'center',
  },
  signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
