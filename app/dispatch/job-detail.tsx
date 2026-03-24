import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, Job, TimelineEvent, STATUS_CONFIG, JobStatus } from '../../lib/supabase';

const STATUS_ORDER: JobStatus[] = [
  'booking_confirmed', 'appointment_reminder', 'on_the_way', 'in_progress', 'completed', 'follow_up_sent',
];

export default function DispatchJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('jobs').select('*, profile:profiles(full_name, email, phone)').eq('id', id).single(),
      supabase.from('job_timeline').select('*').eq('job_id', id).order('timestamp', { ascending: true }),
    ]).then(([jobRes, timelineRes]) => {
      if (jobRes.data) setJob(jobRes.data as Job);
      if (timelineRes.data) setTimeline(timelineRes.data as TimelineEvent[]);
      setLoading(false);
    });
  }, [id]);

  const advanceStatus = async () => {
    if (!job) return;
    const currentIdx = STATUS_ORDER.indexOf(job.status);
    if (currentIdx >= STATUS_ORDER.length - 1) return;
    const nextStatus = STATUS_ORDER[currentIdx + 1];

    Alert.alert(
      'Advance Status',
      `Mark this job as "${STATUS_CONFIG[nextStatus].label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              await supabase.from('jobs').update({ status: nextStatus }).eq('id', job.id);
              const { data: newEvent } = await supabase
                .from('job_timeline')
                .insert({ job_id: job.id, status: nextStatus, timestamp: new Date().toISOString() })
                .select().single();
              setJob(prev => prev ? { ...prev, status: nextStatus } : prev);
              if (newEvent) setTimeline(prev => [...prev, newEvent as TimelineEvent]);
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ]
    );
  };

  const saveNote = async () => {
    if (!job || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const { data: newEvent } = await supabase
        .from('job_timeline')
        .insert({ job_id: job.id, status: job.status, note: noteText.trim(), timestamp: new Date().toISOString() })
        .select().single();
      if (newEvent) setTimeline(prev => [...prev, newEvent as TimelineEvent]);
      setNoteText('');
      setNoteModal(false);
    } finally {
      setSavingNote(false);
    }
  };

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
  const currentIdx = STATUS_ORDER.indexOf(job.status);
  const nextStatus = currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null;
  const scheduledDate = job.scheduled_at
    ? new Date(job.scheduled_at).toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : 'Not scheduled';

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Job Detail</Text>
        <TouchableOpacity onPress={() => setNoteModal(true)} style={styles.noteBtn}>
          <Text style={styles.noteBtnText}>+ Note</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status */}
        <View style={[styles.statusBanner, { backgroundColor: config.color + '18', borderColor: config.color + '44' }]}>
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>

        <Text style={styles.jobTitle}>{job.title}</Text>
        <Text style={styles.serviceType}>{job.service_type}</Text>

        {/* Customer card */}
        {job.profile && (
          <View style={styles.customerCard}>
            <Text style={styles.sectionTitle}>CUSTOMER</Text>
            <Text style={styles.customerName}>{job.profile.full_name}</Text>
            {job.profile.phone && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${job.profile!.phone}`)}
                style={styles.callBtn}
              >
                <Text style={styles.callBtnText}>📞 Call {job.profile.phone}</Text>
              </TouchableOpacity>
            )}
            {job.profile.email && (
              <Text style={styles.customerEmail}>{job.profile.email}</Text>
            )}
          </View>
        )}

        {/* Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>SCHEDULED</Text>
            <Text style={styles.detailValue}>{scheduledDate}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>TECHNICIAN</Text>
            <Text style={styles.detailValue}>{job.technician_name}</Text>
          </View>
          {job.description && (
            <View style={styles.descriptionBox}>
              <Text style={styles.detailLabel}>NOTES</Text>
              <Text style={styles.descriptionText}>{job.description}</Text>
            </View>
          )}
        </View>

        {/* Advance status */}
        {nextStatus && (
          <TouchableOpacity
            style={[styles.advanceBtn, { borderColor: STATUS_CONFIG[nextStatus].color + '55' }]}
            onPress={advanceStatus}
            disabled={updatingStatus}
          >
            {updatingStatus
              ? <ActivityIndicator color={STATUS_CONFIG[nextStatus].color} />
              : <Text style={[styles.advanceBtnText, { color: STATUS_CONFIG[nextStatus].color }]}>
                  Mark as {STATUS_CONFIG[nextStatus].label} →
                </Text>}
          </TouchableOpacity>
        )}

        {/* Invoice */}
        {job.invoice_url && (
          <TouchableOpacity
            style={styles.invoiceBtn}
            onPress={() => Linking.openURL(job.invoice_url!)}
          >
            <Text style={styles.invoiceBtnText}>💳 View Invoice</Text>
          </TouchableOpacity>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>ACTIVITY LOG</Text>
            {[...timeline].reverse().map((event, index, arr) => {
              const ec = STATUS_CONFIG[event.status];
              const ts = new Date(event.timestamp).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              });
              return (
                <View key={event.id} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.dot, { backgroundColor: ec.color }]} />
                    {index < arr.length - 1 && <View style={styles.line} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.tlStatus, { color: ec.color }]}>{ec.label}</Text>
                    <Text style={styles.tlTime}>{ts}</Text>
                    {event.note && <Text style={styles.tlNote}>{event.note}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Note Modal */}
      <Modal visible={noteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Note</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Enter your note..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setNoteModal(false); setNoteText(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !noteText.trim() && styles.saveBtnDisabled]}
                onPress={saveNote}
                disabled={!noteText.trim() || savingNote}
              >
                {savingNote
                  ? <ActivityIndicator color="#0a0f1a" size="small" />
                  : <Text style={styles.saveBtnText}>Save Note</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  backBtn: { width: 40, justifyContent: 'center' },
  backArrow: { color: '#7CC73F', fontSize: 22, fontWeight: '600' },
  navTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  noteBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(124,199,63,0.15)', borderRadius: 8 },
  noteBtnText: { color: '#7CC73F', fontSize: 13, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 60 },
  statusBanner: {
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  statusText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  jobTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  serviceType: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 20 },
  sectionTitle: {
    color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 10,
  },
  customerCard: {
    backgroundColor: '#0d1b2e', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 12,
  },
  customerName: { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 10 },
  callBtn: {
    backgroundColor: 'rgba(124,199,63,0.1)', borderWidth: 1, borderColor: 'rgba(124,199,63,0.25)',
    borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 8,
  },
  callBtnText: { color: '#7CC73F', fontSize: 14, fontWeight: '600' },
  customerEmail: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  detailsCard: {
    backgroundColor: '#0d1b2e', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16, overflow: 'hidden',
  },
  detailRow: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detailLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  detailValue: { color: '#fff', fontSize: 14 },
  descriptionBox: { paddingHorizontal: 16, paddingVertical: 12 },
  descriptionText: { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 20 },
  advanceBtn: {
    borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 12,
  },
  advanceBtnText: { fontSize: 15, fontWeight: '600' },
  invoiceBtn: {
    backgroundColor: 'rgba(124,199,63,0.1)', borderWidth: 1, borderColor: 'rgba(124,199,63,0.25)',
    borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 24,
  },
  invoiceBtnText: { color: '#7CC73F', fontSize: 15, fontWeight: '600' },
  timelineSection: { marginTop: 8 },
  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { alignItems: 'center', width: 20, marginRight: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { flex: 1, width: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: 20 },
  tlStatus: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  tlTime: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 2 },
  tlNote: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4, lineHeight: 18 },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0d1b2e', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, padding: 14, color: '#fff', fontSize: 15, minHeight: 100,
    textAlignVertical: 'top', marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center',
  },
  cancelBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    backgroundColor: '#7CC73F', alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#0a0f1a', fontSize: 15, fontWeight: '700' },
});
