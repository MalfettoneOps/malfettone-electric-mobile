import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, Job, STATUS_CONFIG, getCurrentProfile } from '../../lib/supabase';

export default function CustomerJobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const loadJobs = useCallback(async () => {
    try {
      const profile = await getCurrentProfile();
      if (!profile) return;
      setCustomerName(profile.full_name);

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false });

      if (!error && data) setJobs(data as Job[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const onRefresh = () => { setRefreshing(true); loadJobs(); };

  const activeJobs = jobs.filter(j => j.status !== 'completed' && j.status !== 'follow_up_sent');
  const pastJobs = jobs.filter(j => j.status === 'completed' || j.status === 'follow_up_sent');

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#7CC73F" size="large" />
      </SafeAreaView>
    );
  }

  const renderJob = ({ item }: { item: Job }) => {
    const config = STATUS_CONFIG[item.status];
    const date = item.scheduled_at
      ? new Date(item.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/portal/job-detail', params: { id: item.id } })}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: config.color + '22', borderColor: config.color + '55' }]}>
            <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        <Text style={styles.cardService}>{item.service_type}</Text>
        {date && <Text style={styles.cardDate}>📅 {date}</Text>}
        <Text style={styles.cardTech}>🔧 {item.technician_name}</Text>
        {item.amount != null && (
          <Text style={styles.cardAmount}>${(item.amount / 100).toFixed(2)}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {customerName.split(' ')[0]} 👋</Text>
          <Text style={styles.subheading}>Your service history</Text>
        </View>
        <View style={styles.logo}>
          <Text style={styles.logoText}>⚡</Text>
        </View>
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {activeJobs.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>ACTIVE JOBS</Text>
                {activeJobs.map(j => renderJob({ item: j }))}
              </>
            )}
            {pastJobs.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>PAST JOBS</Text>
                {pastJobs.map(j => renderJob({ item: j }))}
              </>
            )}
            {jobs.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔌</Text>
                <Text style={styles.emptyTitle}>No jobs yet</Text>
                <Text style={styles.emptyText}>Your service history will appear here.</Text>
              </View>
            )}
          </>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7CC73F" />}
        contentContainerStyle={styles.list}
        keyExtractor={(_, i) => String(i)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1a' },
  centered: { flex: 1, backgroundColor: '#0a0f1a', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '700' },
  subheading: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 },
  logo: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(124,199,63,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  logoText: { fontSize: 22 },
  list: { padding: 16, paddingBottom: 100 },
  sectionLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 10, marginTop: 4,
  },
  card: {
    backgroundColor: '#0d1b2e', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardService: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 4 },
  cardDate: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 2 },
  cardTech: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  cardAmount: { color: '#7CC73F', fontSize: 15, fontWeight: '700', marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center' },
});
