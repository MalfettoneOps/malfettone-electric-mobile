# Malfettone Electric Mobile App Architecture

## Overview

This is a production-ready Expo React Native app designed for field technicians at Malfettone Electric. It provides real-time access to job assignments, status updates, photo documentation, and on-site note-taking.

## Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State**: React Hooks (useCallback, useEffect, useState)
- **Storage**: AsyncStorage for session persistence
- **UI**: React Native StyleSheet (no external component libraries)

## Navigation Structure

```
Root (_layout.tsx)
├── Login (/login.tsx)
└── Tabs (/(tabs)/_layout.tsx)
    ├── Today Screen (/tabs/index.tsx)
    ├── Jobs Screen (/tabs/jobs.tsx)
    ├── Profile Screen (/tabs/profile.tsx)
    └── Job Detail (/job/[id].tsx)
```

### Auth Flow

1. App checks session on mount via `supabase.auth.getSession()`
2. If no session → redirect to `/login`
3. On login success → redirect to `/(tabs)/`
4. Listens for auth state changes and redirects accordingly

## Screen Components

### Login Screen (`app/login.tsx`)

- Email/password authentication
- Error handling and validation
- Loading state during auth request
- Styled with dark theme and green accent

**Key Features:**
- Form validation (email and password required)
- Error message display
- Loading spinner during sign-in
- Keyboard avoiding for better UX

### Today's Jobs (`app/(tabs)/index.tsx`)

- Personalized greeting with technician first name
- Lists only jobs scheduled for today with status ≠ 'completed'
- Job cards showing title, customer, address, scheduled time, status
- Pull-to-refresh capability
- Loading skeletons while fetching
- Empty state when no jobs scheduled

**Data Filtering:**
- Fetches jobs where `technician_name` = current user's full name
- Filters for jobs with `scheduled_at` between today 00:00 and tomorrow 00:00
- Excludes completed jobs

**Status Colors:**
- Confirmed: #7CC73F (green)
- On The Way: #60a5fa (blue)
- In Progress: #f97316 (orange)
- Completed: #22c55e (light green)

### All Jobs (`app/(tabs)/jobs.tsx`)

- Browse all jobs assigned to technician across all dates
- Filter tabs: All / Active / Completed
- Search by customer name or job title
- Section-based display (Active Jobs first, then Completed)
- Pull-to-refresh

**Features:**
- Real-time filtering and search
- Organized sections with job counts
- Sorted by scheduled date (newest first)
- Same card design as Today screen

### Profile Screen (`app/(tabs)/profile.tsx`)

- Display technician name, email, role
- Sign out functionality
- Navigation to web dashboard
- App version display
- Settings placeholders for future features

**Security:**
- Sign out clears session and redirects to login
- Uses secure Supabase auth signOut

### Job Detail (`app/job/[id].tsx`)

The most critical screen for field technicians. Provides comprehensive job information and action capabilities.

**Sections:**

1. **Header**: Job title and status badge
2. **Customer Info**: Name, phone (clickable to call), address (clickable to open Maps)
3. **Job Details**: Scheduled time, description, start/completion times
4. **Service Actions**: Context-aware buttons for status updates
5. **Photos**: Grid display with add capability
6. **Notes**: Text area for internal notes

**Status Workflow:**
```
booking_confirmed → on_the_way → in_progress → completed
```

Only the next available action is shown as a button.

**Photo Management:**
- Users can add photos via camera or gallery picker
- Photos stored in Supabase Storage (`job-photos` bucket)
- Photo metadata tracked in `job_photos` table
- Grid layout with photo preview modal
- Tap to view full-screen preview

**Notes:**
- Text area for documenting job details
- "Save Notes" button updates `internal_notes` field
- Visible only to app users

## Supabase Integration (`lib/supabase.ts`)

### Client Initialization

- Uses AsyncStorage for auth persistence
- Auto-refresh token enabled
- Detects session in URL disabled (mobile app)

### Authentication Helpers

- `getSession()`: Returns current user session
- `signIn(email, password)`: Email/password authentication
- `signOut()`: Clear session and sign out
- `getCurrentProfile()`: Fetch user's profile record

### Data Fetching

- `getTodayJobs(technicianName)`: Today's non-completed jobs
- `getAllJobs(technicianName)`: All jobs for technician
- `getJobById(jobId)`: Single job with customer details

### Status Updates

- `updateJobStatus(jobId, status)`: Update job status
- Sets `started_at` when transitioning to in_progress
- Sets `completed_at` when transitioning to completed
- Updates `updated_at` timestamp

### Notes Management

- `updateJobNotes(jobId, notes)`: Save internal notes

### Photo Uploads

- `uploadJobPhoto(jobId, fileUri, fileName)`: Upload to Storage and create DB record
- `getJobPhotos(jobId)`: Fetch all photos for a job

## Type Definitions

All TypeScript types match the web app for consistency:

```typescript
type JobStatus =
  | 'booking_confirmed'
  | 'on_the_way'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

interface Job {
  id: string
  customer_id: string
  technician_name: string
  title: string
  description: string
  status: JobStatus
  scheduled_at: string
  started_at: string | null
  completed_at: string | null
  internal_notes: string | null
  customer_phone: string | null
  customer_address: string | null
  created_at: string
  updated_at: string
  customer?: { /* customer details */ }
}

interface Profile {
  id: string
  full_name: string
  email: string
  role: 'technician' | 'admin' | 'manager'
  created_at: string
  updated_at: string
}
```

## Styling System

### Design Tokens

- **Background**: #0A1628 (dark navy)
- **Card Background**: rgba(255, 255, 255, 0.06)
- **Card Border**: rgba(255, 255, 255, 0.1)
- **Primary Accent**: #7CC73F (green)
- **Primary Text**: #FFFFFF
- **Secondary Text**: rgba(255, 255, 255, 0.5)
- **Status Green**: #22c55e
- **Status Orange**: #f97316
- **Status Blue**: #60a5fa
- **Error Red**: #EF4444

### Component Patterns

- Cards: Rounded borders, subtle transparency, border accent
- Buttons: Full-width or content-fit with accent color
- Inputs: Transparent background with light borders
- Icons: Unicode emoji for simplicity (no asset dependencies)
- Tab Bar: Dark with green accent on active

## State Management

Uses React hooks for local component state:

- `useState`: Component-level state (jobs, user data, form inputs)
- `useCallback`: Memoized functions to prevent unnecessary renders
- `useEffect`: Side effects (data fetching, auth listeners)
- `useFocusEffect`: Refresh data when screen comes into focus

**No global state library** - keeps dependencies minimal and increases performance.

## Error Handling

- Try-catch blocks around all async operations
- User-friendly error messages via Alert
- Console logging for debugging
- Graceful fallbacks (empty states, null checks)

## Performance Optimizations

- Lazy loading via `useFocusEffect` (only fetch when screen visible)
- Pagination-ready structure (can add limit/offset)
- Efficient filtering and searching
- FlatList/SectionList for efficient rendering of long lists
- Image memoization on photo screen

## Security Considerations

- Credentials never logged or exposed
- Secure token storage via AsyncStorage
- HTTPS-only Supabase communication
- RLS policies enforce row-level security (configured on Supabase)
- No sensitive data in Redux/global state
- Session validation on auth state changes

## Testing Recommendations

- Unit tests for Supabase helper functions
- Integration tests for auth flow
- E2E tests for critical workflows (job status updates, photo uploads)
- Mock Supabase client for unit testing

## Future Enhancements

- Offline support with local database (SQLite)
- Push notifications for job assignments
- Real-time updates via Supabase subscriptions
- GPS tracking during job execution
- Signature capture for job completion
- Voice notes alongside photos
- Dark/light theme toggle
- Technician scheduling and calendar view
- Customer feedback ratings
- Invoice generation on-site

## Deployment

### Prerequisites
- Supabase project with configured tables
- Expo developer account
- Apple Developer account (iOS)
- Google Play Developer account (Android)

### Steps
1. Update environment variables
2. Build app: `eas build`
3. Configure signing certificates
4. Submit to App Store / Google Play

See EAS documentation for detailed deployment guide.
