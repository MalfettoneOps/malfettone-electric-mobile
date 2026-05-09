import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { getTodayJobs, getCurrentProfile, Job } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';

// ─── Day Status ───────────────────────────────────────────────────────────────
type DayStatus = 'at_base' | 'supply_house' | 'en_route' | 'on_job';

const STATUS_STEPS: { key: DayStatus; emoji: string; label: string; color: string }[] = [
  { key: 'at_base',      emoji: '🚗', label: 'At Base',      color: '#60a5fa' },
  { key: 'supply_house', emoji: '🏭', label: 'Supply House', color: '#f59e0b' },
  { key: 'en_route',     emoji: '🚐', label: 'En Route',     color: '#a78bfa' },
  { key: 'on_job',       emoji: '🔧', label: 'On Job',       color: '#7CC73F' },
];

const NEXT_ACTION: Record<DayStatus, { to: DayStatus; label: string } | null> = {
  at_base:      { to: 'supply_house', label: '🏭  Head to Supply House' },
  supply_house: { to: 'en_route',     label: '🚐  En Route to Job'      },
  en_route:     { to: 'on_job',       label: '🔧  Arrived — On Job'     },
  on_job:       null,
};

function todayKey(): string {
  return `tech_day_status_${new Date().toISOString().slice(0, 10)}`;
}

function DayStatusWidget() {
  const [status, setStatus] = useState<DayStatus | null>(null);
  const [since, setSince]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(todayKey());
      if (raw) {
        try {
          const { s, t } = JSON.parse(raw);
          setStatus(s as DayStatus);
          setSince(t);
        } catch { /* ignore */ }
      } else {
        const now = new Date().toISOString();
        setStatus('at_base');
        setSince(now);
        await AsyncStorage.setItem(todayKey(), JSON.stringify({ s: 'at_base', t: now }));
      }
    })();
  }, []);

  const advance = useCallback(async (to: DayStatus) => {
    const now = new Date().toISOString();
    setStatus(to);
    setSince(now);
    await AsyncStorage.setItem(todayKey(), JSON.stringify({ s: to, t: now }));
  }, []);

  if (!status) return null;

  const currentIdx = STATUS_STEPS.findIndex(s => s.key === status);
  const current    = STATUS_STEPS[currentIdx];
  const next       = NEXT_ACTION[status];
  const sinceTime  = since
    ? new Date(since).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <View style={[styles.statusCard, { borderColor: current.color + '44' }]}>
      {/* Progress dots */}
      <View style={styles.stepsRow}>
        {STATUS_STEPS.map((step, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;
          return (
            <React.Fragment key={step.key}>
              <View style={styles.stepCol}>
                <View style={[
                  styles.stepDot,
                  {
                    borderColor: (done || active) ? step.color : '#D1D5DB',
                    backgroundColor: active ? step.color + '22' : done ? step.color + '11' : '#F3F4F6',
                    opacity: i > currentIdx ? 0.4 : 1,
                  },
                ]}>
                  <Text style={styles.stepEmoji}>{done ? '✓' : step.emoji}</Text>
                </View>
                <Text style={[styles.stepLabel, { color: active ? step.color : 'rgba(255,255,255,0.3)' }]}>
                  {step.label}
                </Text>
              </View>
              {i < STATUS_STEPS.length - 1 && (
                <View style={[styles.stepLine, { backgroundColor: done ? step.color + '66' : '#E5E7EB' }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Current status label */}
      <View style={styles.statusLabelRow}>
        <Text style={styles.statusEmoji}>{current.emoji}</Text>
        <View>
          <Text style={[styles.statusLabel, { color: current.color }]}>{current.label}</Text>
          {sinceTime && (
            <Text style={styles.statusSince}>since {sinceTime}</Text>
          )}
        </View>
      </View>

      {/* Action buttons */}
      {next && (
        <View style={styles.actionCol}>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: current.color }]}
            onPress={() => advance(next.to)}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>{next.label}</Text>
          </TouchableOpacity>

          {status === 'at_base' && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => advance('en_route')}
              activeOpacity={0.7}
            >
              <Text style={styles.skipBtnText}>⤭  Skip — Going straight to job</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {status === 'on_job' && (
        <Text style={styles.onJobMsg}>✅  You're on the job — let's get it done!</Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TodayScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [technicianName, setTechnicianName] = useState('');
  const [userName, setUserName] = useState('');

  const loadData = useCallback(async () => {
    try {
      const profile = await getCurrentProfile();
      if (profile) {
        setUserName(profile.full_name.split(' ')[0]);
        setTechnicianName(profile.full_name);
        const todayJobs = await getTodayJobs(profile.full_name);
        setJobs(todayJobs);
      }
    } catch (error) {
      console.error('Error loading today jobs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleRefresh = () => { setIsRefreshing(true); loadData(); };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'booking_confirmed':    return '#7CC73F';
      case 'on_the_way':           return '#60a5fa';
      case 'in_progress':          return '#f97316';
      case 'completed':            return '#22c55e';
      default:                     return '#6b7280';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'booking_confirmed':    return 'Confirmed';
      case 'on_the_way':           return 'On The Way';
      case 'in_progress':          return 'In Progress';
      case 'completed':            return 'Completed';
      default:                     return status;
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return dateString; }
  };

  const formatDate = (): string =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const renderJobCard = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => router.push(`/job/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusBadgeText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        <Text style={styles.customerName} numberOfLines={1}>
          {item.customer?.name || 'Unknown Customer'}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {item.customer?.address || 'No address'}
        </Text>
        <View style={styles.timeRow}>
          <Text style={styles.time}>🕐 {formatTime(item.scheduled_at)}</Text>
        </View>
      </View>
      <View style={styles.cardArrow}>
        <Text style={styles.arrow}>→</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🎉</Text>
      <Text style={styles.emptyText}>No jobs scheduled for today</Text>
      <Text style={styles.emptySubtext}>You're all caught up!</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7CC73F" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {userName ? `Hey, ${userName} 👋` : 'Good morning! 👋'}
          </Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>
      </View>

      <FlatList
        data={jobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#7CC73F"
            progressBackgroundColor="#FFFFFF"
          />
        }
        ListHeaderComponent={<DayStatusWidget />}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // ── Day Status Widget ────────────────────────────────────────────────────────
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  stepCol: {
    alignItems: 'center',
    flexShrink: 0,
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepEmoji: {
    fontSize: 15,
  },
  stepLabel: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    width: 52,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginTop: 17,
    marginHorizontal: 2,
  },
  statusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  statusEmoji: {
    fontSize: 26,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '800',
  },
  statusSince: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  actionCol: {
    gap: 8,
  },
  nextBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  skipBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skipBtnText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  onJobMsg: {
    textAlign: 'center',
    color: '#7CC73F',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 4,
  },

  // ── Jobs List ────────────────────────────────────────────────────────────────
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  customerName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
  },
  address: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  cardArrow: {
    paddingRight: 14,
    paddingHorizontal: 8,
  },
  arrow: {
    fontSize: 18,
    color: '#D1D5DB',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
