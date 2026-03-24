import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, Job, TimelineEvent, STATUS_CONFIG } from '../../lib/supabase';

export default function CustomerJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('jobs').select('*').eq('id', id).single(),
      supabase.from('job_timeline').select('*').eq('job_id', id).order('timestamp', { ascending: true }),
    ]).then(([jobRes, timelineRes]) => {
      if (jobRes.data) setJob(jobRes.data as Job);
      if (timelineRes.data) setTimeline(timelineRes.data as TimelineEvent[]);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#7CC73F" size="large" />
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>Job not found.</Text>
      </SafeAreaView>
    );
  }

  const config = STATUS_CONFIG[job.status];
  const scheduledDate = job.scheduled_at
    ? new Date(job.scheduled_at).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : 'Not scheduled yet';

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav bar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Job Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status badge */}
        <View style={[styles.statusBanner, { backgroundColor: config.color + '18', borderColor: config.color + '44' }]}>
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>

        {/* Job title */}
        <Text style={styles.jobTitle}>{job.title}</Text>
        <Text style={styles.serviceType}>{job.service_type}</Text>

        {/* Info cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>TECHNICIAN</Text>
            <Text style={styles.infoValue}>🔧 {job.technician_name}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>SCHEDULED</Text>
            <Text style={styles.infoValue}>📅 {scheduledDate}</Text>
          </View>
          {job.amount != null && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>AMOUNT</Text>
              <Text style={[styles.infoValue, { color: '#7CC73F', fontWeight: '700' }]}>
                ${(job.amount / 100).toFixed(2)}
              </Text>
            </View>
          )}
          {job.description && (
            <View style={[styles.infoCard, { flex: 1, width: '100%' }]}>
              <Text style={styles.infoLabel}>DESCRIPTION</Text>
              <Text style={styles.infoValue}>{job.description}</Text>
            </View>
          )}
        </View>

        {/* Invoice button */}
        {job.invoice_url && (
          <TouchableOpacity
            style={styles.invoiceBtn}
            onPress={() => Linking.openURL(job.invoice_url!)}
          >
            <Text style={styles.invoiceBtnText}>💳  View Invoice</Text>
          </TouchableOpacity>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>STATUS HISTORY</Text>
            {timeline.map((event, index) => {
              const ec = STATUS_CONFIG[event.status];
              const ts = new Date(event.timestamp).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              });
              return (
                <View key={event.id} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: ec.color }]} />
                    {index < timeline.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineStatus, { color: ec.color }]}>{ec.label}</Text>
                    <Text style={styles.timelineTime}>{ts}</Text>
                    {event.note && <Text style={styles.timelineNote}>{event.note}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1a' },
  centered: { flex: 1, backgroundColor: '#0a0f1a', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backArrow: { color: '#7CC73F', fontSize: 22, fontWeight: '600' },
  navTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 60 },
  statusBanner: {
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  statusText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  jobTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  serviceType: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 20 },
  infoGrid: { gap: 10, marginBottom: 20 },
  infoCard: {
    backgroundColor: '#0d1b2e', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700',
    letterSpacing: 1, marginBottom: 4,
  },
  infoValue: { color: '#fff', fontSize: 14 },
  invoiceBtn: {
    backgroundColor: 'rgba(124,199,63,0.12)', borderWidth: 1, borderColor: 'rgba(124,199,63,0.3)',
    borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 24,
  },
  invoiceBtnText: { color: '#7CC73F', fontSize: 15, fontWeight: '600' },
  section: { marginTop: 8 },
  sectionTitle: {
    color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 16,
  },
  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { alignItems: 'center', width: 20, marginRight: 14 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { flex: 1, width: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineStatus: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  timelineTime: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 2 },
  timelineNote: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 2 },
});
