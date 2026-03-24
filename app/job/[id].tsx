import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  FlatList,
  Alert,
  Linking,
  ActionSheetIOS,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  getJobById,
  updateJobStatus,
  updateJobNotes,
  uploadJobPhoto,
  getJobPhotos,
  Job,
  JobStatus,
} from '../../lib/supabase';

interface JobPhoto {
  id: string;
  job_id: string;
  url: string;
  uploaded_at: string;
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'notes'>(
    'details'
  );
  const [photoPreviewModal, setPhotoPreviewModal] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState('');

  useEffect(() => {
    loadJobData();
  }, [id]);

  const loadJobData = async () => {
    if (!id) return;

    try {
      const jobData = await getJobById(id as string);
      setJob(jobData);
      setNotes(jobData.internal_notes || '');

      const photosData = await getJobPhotos(id as string);
      setPhotos(photosData);
    } catch (error) {
      console.error('Error loading job:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: JobStatus) => {
    if (!job) return;

    setIsUpdating(true);
    try {
      const updated = await updateJobStatus(job.id, newStatus);
      setJob(updated);
      Alert.alert('Success', `Job marked as ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update job status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!job) return;

    setIsUpdating(true);
    try {
      const updated = await updateJobNotes(job.id, notes);
      setJob(updated);
      Alert.alert('Success', 'Notes saved successfully');
    } catch (error) {
      console.error('Error saving notes:', error);
      Alert.alert('Error', 'Failed to save notes');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && job) {
        const asset = result.assets[0];
        setIsUploadingPhoto(true);

        const fileName = `photo_${Date.now()}.jpg`;
        await uploadJobPhoto(job.id, asset.uri, fileName);

        // Reload photos
        const photosData = await getJobPhotos(job.id);
        setPhotos(photosData);

        Alert.alert('Success', 'Photo uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && job) {
        const asset = result.assets[0];
        setIsUploadingPhoto(true);

        const fileName = `photo_${Date.now()}.jpg`;
        await uploadJobPhoto(job.id, asset.uri, fileName);

        // Reload photos
        const photosData = await getJobPhotos(job.id);
        setPhotos(photosData);

        Alert.alert('Success', 'Photo captured and uploaded successfully');
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
          userInterfaceStyle: 'dark',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleCameraCapture();
          } else if (buttonIndex === 2) {
            handleAddPhoto();
          }
        }
      );
    } else {
      Alert.alert('Add Photo', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleCameraCapture },
        { text: 'Choose from Library', onPress: handleAddPhoto },
      ]);
    }
  };

  const handleCallCustomer = () => {
    if (job?.customer_phone) {
      Linking.openURL(`tel:${job.customer_phone}`);
    }
  };

  const handleOpenMaps = () => {
    if (job?.customer_address) {
      const encodedAddress = encodeURIComponent(job.customer_address);
      const mapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
      Linking.openURL(mapsUrl);
    }
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

  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        weekday: 'short',
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

  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const renderPhotoCard = ({ item }: { item: JobPhoto }) => (
    <TouchableOpacity
      style={styles.photoCard}
      onPress={() => {
        setPreviewPhotoUrl(item.url);
        setPhotoPreviewModal(true);
      }}
    >
      <Image
        source={{ uri: item.url }}
        style={styles.photoImage}
        onError={(e) => console.error('Image load error:', e)}
      />
      <View style={styles.photoOverlay}>
        <Text style={styles.photoPreviewIcon}>👁️</Text>
      </View>
    </TouchableOpacity>
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

  if (!job) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Job not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <View
            style={[
              styles.statusBadgeLarge,
              { backgroundColor: getStatusColor(job.status) },
            ]}
          >
            <Text style={styles.statusBadgeTextLarge}>
              {getStatusLabel(job.status)}
            </Text>
          </View>
        </View>

        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>

          <TouchableOpacity
            style={styles.detailRow}
            onPress={handleCallCustomer}
            disabled={!job.customer_phone}
          >
            <Text style={styles.detailIcon}>👤</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>
                {job.customer?.name || 'Unknown'}
              </Text>
            </View>
            {job.customer_phone && (
              <Text style={styles.detailAction}>📞</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailRow}
            onPress={handleOpenMaps}
            disabled={!job.customer_address}
          >
            <Text style={styles.detailIcon}>📍</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {job.customer_address || job.customer?.address || 'No address'}
              </Text>
            </View>
            {job.customer_address && (
              <Text style={styles.detailAction}>🗺️</Text>
            )}
          </TouchableOpacity>

          {job.customer_phone && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📱</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{job.customer_phone}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🕐</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Scheduled</Text>
              <Text style={styles.detailValue}>
                {formatDateTime(job.scheduled_at)}
              </Text>
            </View>
          </View>

          {job.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📝</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{job.description}</Text>
              </View>
            </View>
          )}

          {job.started_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>▶️</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Started</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(job.started_at)}
                </Text>
              </View>
            </View>
          )}

          {job.completed_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>✅</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Completed</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(job.completed_at)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Status Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Actions</Text>

          {job.status === 'booking_confirmed' && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonPrimary,
                isUpdating && styles.buttonDisabled,
              ]}
              onPress={() => handleStatusUpdate('on_the_way')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#0A1628" size="small" />
              ) : (
                <>
                  <Text style={styles.actionButtonIcon}>🚗</Text>
                  <Text style={styles.actionButtonText}>Mark On The Way</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {job.status === 'on_the_way' && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonPrimary,
                isUpdating && styles.buttonDisabled,
              ]}
              onPress={() => handleStatusUpdate('in_progress')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#0A1628" size="small" />
              ) : (
                <>
                  <Text style={styles.actionButtonIcon}>🔧</Text>
                  <Text style={styles.actionButtonText}>Mark In Progress</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {job.status === 'in_progress' && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonSuccess,
                isUpdating && styles.buttonDisabled,
              ]}
              onPress={() => handleStatusUpdate('completed')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#0A1628" size="small" />
              ) : (
                <>
                  <Text style={styles.actionButtonIcon}>✅</Text>
                  <Text style={styles.actionButtonText}>Mark Complete</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {job.status === 'completed' && (
            <View style={styles.completedBanner}>
              <Text style={styles.completedIcon}>✅</Text>
              <Text style={styles.completedText}>Job Completed</Text>
            </View>
          )}
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handlePhotoOptions}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <ActivityIndicator color="#7CC73F" size="small" />
              ) : (
                <>
                  <Text style={styles.addPhotoIcon}>📸</Text>
                  <Text style={styles.addPhotoText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {photos.length > 0 ? (
            <FlatList
              data={photos}
              renderItem={renderPhotoCard}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.photoRow}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.noPhotosContainer}>
              <Text style={styles.noPhotosIcon}>📷</Text>
              <Text style={styles.noPhotosText}>No photos yet</Text>
              <Text style={styles.noPhotosSubtext}>
                Add photos to document the job
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>

          <TextInput
            style={styles.notesInput}
            placeholder="Add internal notes about the job..."
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.saveNotesButton, isUpdating && styles.buttonDisabled]}
            onPress={handleSaveNotes}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color="#0A1628" size="small" />
            ) : (
              <>
                <Text style={styles.saveNotesIcon}>💾</Text>
                <Text style={styles.saveNotesText}>Save Notes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Photo Preview Modal */}
      <Modal
        visible={photoPreviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPreviewModal(false)}
      >
        <Pressable
          style={styles.photoPreviewModal}
          onPress={() => setPhotoPreviewModal(false)}
        >
          <Image
            source={{ uri: previewPhotoUrl }}
            style={styles.previewImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.closePreviewButton}
            onPress={() => setPhotoPreviewModal(false)}
          >
            <Text style={styles.closePreviewText}>✕</Text>
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  jobTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  statusBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusBadgeTextLarge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A1628',
    textTransform: 'capitalize',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(124, 199, 63, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7CC73F',
  },
  addPhotoIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7CC73F',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  detailAction: {
    fontSize: 20,
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionButtonPrimary: {
    backgroundColor: '#7CC73F',
  },
  actionButtonSuccess: {
    backgroundColor: '#22c55e',
  },
  actionButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A1628',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 8,
  },
  completedIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  completedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#86efac',
  },
  photoRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  photoCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
  photoPreviewIcon: {
    fontSize: 20,
    opacity: 0,
  },
  noPhotosContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  noPhotosIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  noPhotosText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  noPhotosSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  saveNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#7CC73F',
    borderRadius: 8,
  },
  saveNotesIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  saveNotesText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A1628',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  photoPreviewModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  closePreviewButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
  },
  closePreviewText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
