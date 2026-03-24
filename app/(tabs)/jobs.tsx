import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { getAllJobs, getCurrentProfile, Job } from '../../lib/supabase';

type FilterStatus = 'all' | 'active' | 'completed';

interface JobSection {
  title: string;
  data: Job[];
}

export default function JobsScreen() {
  const router = useRouter();
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [technicianName, setTechnicianName] = useState('');

  // Load all jobs
  const loadData = useCallback(async () => {
    try {
      const profile = await getCurrentProfile();
      if (profile) {
        setTechnicianName(profile.full_name);
        const jobs = await getAllJobs(profile.full_name);
        setAllJobs(jobs);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Filter and organize jobs
  useEffect(() => {
    filterAndOrganizeJobs();
  }, [allJobs, searchQuery, filterStatus]);

  const filterAndOrganizeJobs = () => {
    let filtered = allJobs;

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter((job) => job.status !== 'completed');
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter((job) => job.status === 'completed');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((job) => {
        const title = job.title.toLowerCase();
        const customer = job.customer?.name.toLowerCase() || '';
        return title.includes(query) || customer.includes(query);
      });
    }

    // Organize by status
    const activeJobs = filtered.filter((job) => job.status !== 'completed');
    const completedJobs = filtered.filter((job) => job.status === 'completed');

    const sections: JobSection[] = [];

    if (activeJobs.length > 0) {
      sections.push({
        title: 'Active Jobs',
        data: activeJobs.sort(
          (a, b) =>
            new Date(b.scheduled_at).getTime() -
            new Date(a.scheduled_at).getTime()
        ),
      });
    }

    if (completedJobs.length > 0) {
      sections.push({
        title: 'Completed',
        data: completedJobs.sort(
          (a, b) =>
            new Date(b.completed_at || '').getTime() -
            new Date(a.completed_at || '').getTime()
        ),
      });
    }

    setFilteredJobs(sections);
  };

  // Load on mount and when focused
  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'booking_confirmed':
        return '#7CC73F';
      case 'on_the_way':
        return '#60a5fa';
      case 'in_progress':
        return '#f97316';
      case 'completed':
        return '#22c55e';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'booking_confirmed':
        return 'Confirmed';
      case 'on_the_way':
        return 'On The Way';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const renderJobCard = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => router.push(`/job/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.customerName} numberOfLines={1}>
          {item.customer?.name || 'Unknown Customer'}
        </Text>

        <Text style={styles.address} numberOfLines={1}>
          {item.customer?.address || 'No address'}
        </Text>

        <Text style={styles.date}>{formatDate(item.scheduled_at)}</Text>
      </View>

      <View style={styles.cardArrow}>
        <Text style={styles.arrow}>→</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: JobSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📋</Text>
      <Text style={styles.emptyText}>No jobs found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery
          ? 'Try adjusting your search'
          : 'Your job list will appear here'}
      </Text>
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs or customers..."
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterStatus === 'all' && styles.filterTabActive,
          ]}
          onPress={() => setFilterStatus('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'all' && styles.filterTabTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filterStatus === 'active' && styles.filterTabActive,
          ]}
          onPress={() => setFilterStatus('active')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'active' && styles.filterTabTextActive,
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filterStatus === 'completed' && styles.filterTabActive,
          ]}
          onPress={() => setFilterStatus('completed')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'completed' && styles.filterTabTextActive,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Jobs List */}
      <SectionList
        sections={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJobCard}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#7CC73F"
            progressBackgroundColor="rgba(255, 255, 255, 0.1)"
          />
        }
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  clearIcon: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterTabActive: {
    backgroundColor: '#7CC73F',
    borderColor: '#7CC73F',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  filterTabTextActive: {
    color: '#0A1628',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7CC73F',
    backgroundColor: 'rgba(124, 199, 63, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  jobCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0A1628',
  },
  customerName: {
    fontSize: 13,
    color: '#FFFFFF',
    marginBottom: 3,
    fontWeight: '500',
  },
  address: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  cardArrow: {
    paddingRight: 12,
    paddingHorizontal: 6,
  },
  arrow: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.2)',
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
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
