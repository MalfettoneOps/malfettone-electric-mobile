import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, Job, getCurrentProfile } from '../../lib/supabase';

export default function CustomerInvoicesScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInvoices = useCallback(async () => {
    try {
      const profile = await getCurrentProfile();
      if (!profile) return;
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('customer_id', profile.id)
        .not('invoice_url', 'is', null)
        .order('created_at', { ascending: false });
      if (data) setJobs(data as Job[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);
  const onRefresh = () => { setRefreshing(true); loadInvoices(); };

  const totalPaid = jobs
    .filter(j => j.status === 'completed' || j.status === 'follow_up_sent')
    .reduce((sum, j) => sum + (j.amount ?? 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#7CC73F" size="large" />
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: Job }) => {
    const date = new Date(item.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    const isPaid = item.status === 'completed' || item.status === 'follow_up_sent';

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardDate}>{date}</Text>
          </View>
          <View style={styles.cardRight}>
            {item.amount != null && (
              <Text style={styles.amount}>${(item.amount / 100).toFixed(2)}</Text>
            )}
            <View style={[styles.paidBadge, { backgroundColor: isPaid ? '#7CC73F22' : '#FAAD1422' }]}>
              <Text style={[styles.paidText, { color: isPaid ? '#7CC73F' : '#FAAD14' }]}>
                {isPaid ? 'Paid' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>
        {item.invoice_url && (
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => Linking.openURL(item.invoice_url!)}
          >
            <Text style={styles.viewBtnText}>View Invoice →</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Invoices</Text>
        <Text style={styles.subheading}>{jobs.length} total</Text>
      </View>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>TOTAL SPENT</Text>
        <Text style={styles.summaryAmount}>${(totalPaid / 100).toFixed(2)}</Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7CC73F" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptyText}>Your invoices will appear here once jobs are completed.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1a' },
  centered: { flex: 1, backgroundColor: '#0a0f1a', justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  heading: { color: '#fff', fontSize: 24, fontWeight: '700' },
  subheading: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  summaryCard: {
    marginHorizontal: 20, marginVertical: 16, backgroundColor: 'rgba(124,199,63,0.1)',
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(124,199,63,0.2)',
  },
  summaryLabel: { color: 'rgba(124,199,63,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  summaryAmount: { color: '#7CC73F', fontSize: 28, fontWeight: '800' },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: '#0d1b2e', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1, marginRight: 12 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cardDate: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  amount: { color: '#fff', fontSize: 17, fontWeight: '700' },
  paidBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  paidText: { fontSize: 11, fontWeight: '600' },
  viewBtn: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  viewBtnText: { color: '#7CC73F', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center' },
});
