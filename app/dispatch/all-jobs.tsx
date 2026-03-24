import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase, Job, STATUS_CONFIG, JobStatus } from '../../lib/supabase';

const FILTERS: { label: string; value: JobStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Confirmed', value: 'booking_confirmed' },
  { label: 'On the Way', value: 'on_the_way' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

export default function DispatchAllJobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const loadJobs = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('jobs')
        .select('*, profile:profiles(full_name, phone)')
        .order('scheduled_at', { ascending: false, nullsFirst: true });
      if (data) setJobs(data as Job[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  const onRefresh = () => { setRefreshing(true); loadJobs(); };

  const filtered = jobs.filter(j => {
    if (filter !== 'all' && j.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        j.title.toLowerCase().includes(q) ||
        j.service_type.toLowerCase().includes(q) ||
        (j.profile?.full_name?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

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
      ? new Date(item.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'No date';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/dispatch/job-detail', params: { id: item.id } })}
        activeOpacity={0.75}
      >
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            {item.profile && <Text style={styles.cardCustomer}>{item.profile.full_name}</Text>}
            <Text style={styles.cardMeta}>{item.service_type} · {date}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: config.color + '22', borderColor: config.color + '55' }]}>
            <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>All Jobs</Text>
        <Text style={styles.count}>{filtered.length} jobs</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs or customers..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter chips */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={f => f.value}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.chip, filter === f.value && styles.chipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.chipList}
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderJob}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7CC73F" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No jobs found</Text>
            <Text style={styles.emptyText}>Try adjusting your search or filter.</Text>
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
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  heading: { color: '#fff', fontSize: 22, fontWeight: '700' },
  count: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  searchContainer: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#0d1b2e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    color: '#fff', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  chipScroll: { maxHeight: 44 },
  chipList: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: { backgroundColor: 'rgba(124,199,63,0.15)', borderColor: '#7CC73F55' },
  chipText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#7CC73F', fontWeight: '600' },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#0d1b2e', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  cardCustomer: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 2 },
  cardMeta: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
});
