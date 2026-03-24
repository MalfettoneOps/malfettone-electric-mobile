import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase, Job, STATUS_CONFIG, JobStatus, getCurrentProfile } from '../../lib/supabase';

const STATUS_ORDER: JobStatus[] = [
  'booking_confirmed', 'appointment_reminder', 'on_the_way', 'in_progress', 'completed', 'follow_up_sent',
];

export default function DispatchTodayScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [techName, setTechName] = useState('');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const loadJobs = useCallback(async () => {
    try {
      const profile = await getCurrentProfile();
      if (profile) setTechName(profile.full_name);

      // Today's jobs: scheduled today OR active (on the way / in progress)
      const { data } = await supabase
        .from('jobs')
        .select('*, profile:profiles(full_name, email, phone)')
        .or(`scheduled_at.gte.${todayStr}T00:00:00,status.in.(on_the_way,in_progress)`)
        .order('scheduled_at', { ascending: true, nullsFirst: false });

      if (data) {
        const todayJobs = (data as Job[]).filter(j => {
          if (j.status === 'on_the_way' || j.status === 'in_progress') return true;
          if (!j.scheduled_at) return false;
          return j.scheduled_at.startsWith(todayStr);
        });
        setJobs(todayJobs);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayStr]);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  const onRefresh = () => { setRefreshing(true); loadJobs(); };

  const advanceStatus = async (job: Job) => {
    const currentIdx = STATUS_ORDER.indexOf(job.status);
    if (currentIdx === STATUS_ORDER.length - 1) return;
    const nextStatus = STATUS_ORDER[currentIdx + 1];

    Alert.alert(
      'Update Status',
      `Mark as "${STATUS_CONFIG[nextStatus].label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setUpdatingId(job.id);
            try {
              await supabase.from('jobs').update({ status: nextStatus }).eq('id', job.id);
              await supabase.from('job_timeline').insert({
                job_id: job.id, status: nextStatus, timestamp: new Date().toISOString(),
              });
              setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: nextStatus } : j));
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#7CC73F" size="large" />
      </SafeAreaView>
    );
  }

  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const renderJob = ({ item }: { item: Job }) => {
    const config = STATUS_CONFIG[item.status];
    const currentIdx = STATUS_ORDER.indexOf(item.status);
    const nextStatus = currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null;
    const isUpdating = updatingId === item.id;
    const time = item.scheduled_at
      ? new Date(item.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/dispatch/job-detail', params: { id: item.id } })}
        activeOpacity={0.75}
      >
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            {item.profile && (
              <Text style={styles.cardCustomer}>👤 {item.profile.full_name}</Text>
            )}
          </View>
          <View style={[styles.badge, { backgroundColor: config.color + '22', borderColor: config.color + '55' }]}>
            <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <Text style={styles.cardService}>{item.service_type}</Text>
        {time && <Text style={styles.cardTime}>🕐 {time}</Text>}
        {item.profile?.phone && (
          <Text style={styles.cardPhone}>📞 {item.profile.phone}</Text>
        )}

        {/* Advance status button */}
        {nextStatus && item.status !== 'follow_up_sent' && (
          <TouchableOpacity
            style={[styles.advanceBtn, { borderColor: STATUS_CONFIG[nextStatus].color + '44' }]}
            onPress={() => advanceStatus(item)}
            disabled={isUpdating}
          >
            {isUpdating
              ? <ActivityIndicator color={STATUS_CONFIG[nextStatus].color} size="small" />
              : <Text style={[styles.advanceBtnText, { color: STATUS_CONFIG[nextStatus].color }]}>
                  → Mark as {STATUS_CONFIG[nextStatus].label}
                </Text>}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Today's Jobs</Text>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{jobs.length}</Text>
        </View>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={item => item.id}
        renderItem={renderJob}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7CC73F" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyTitle}>No jobs today</Text>
            <Text style={styles.emptyText}>Nothing scheduled. Check "All Jobs" for upcoming work.</Text>
          </View>
        }
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
  heading: { color: '#fff', fontSize: 22, fontWeight: '700' },
  dateLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  countBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(124,199,63,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  countText: { color: '#7CC73F', fontSize: 18, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#0d1b2e', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardCustomer: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardService: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 4 },
  cardTime: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 2 },
  cardPhone: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  advanceBtn: {
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, alignItems: 'center',
  },
  advanceBtnText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
