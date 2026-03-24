# Malfettone Electric Field Service Mobile App

A React Native Expo app for field technicians to manage jobs, update status, and capture photos on-site.

## Setup

### Prerequisites

- Node.js 16+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Xcode) or Android Emulator

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env` file with your Supabase credentials:

```bash
cp .env.example .env
```

3. Fill in the `.env` file with your Supabase project URL and anonymous key.

### Running the App

**Start the Expo development server:**

```bash
npm start
```

**Run on iOS:**

```bash
npm run ios
```

**Run on Android:**

```bash
npm run android
```

## Project Structure

```
app/
├── _layout.tsx           # Root navigation layout
├── login.tsx             # Login screen
├── (tabs)/               # Tab-based navigation
│   ├── _layout.tsx       # Tab bar layout
│   ├── index.tsx         # Today's jobs screen
│   ├── jobs.tsx          # All jobs screen
│   └── profile.tsx       # User profile screen
└── job/
    └── [id].tsx          # Job detail screen

lib/
└── supabase.ts           # Supabase client and helpers
```

## Features

### Authentication

- Email/password sign-in via Supabase Auth
- Session persistence using AsyncStorage
- Automatic auth state checking

### Today's Jobs

- Real-time list of jobs scheduled for today
- Status filtering and visual indicators
- Pull-to-refresh
- Quick view of customer name, address, and scheduled time

### All Jobs

- Browse all assigned jobs (past and current)
- Filter by status (All / Active / Completed)
- Search by customer name or job title
- Organized by status groups

### Job Details

- Full job information with customer contact details
- Call customer directly from app
- Open job address in maps
- Visual status indicators

### Service Actions

- Update job status through interactive workflow
- Buttons appear based on current status:
  - Booking Confirmed → On The Way
  - On The Way → In Progress
  - In Progress → Completed

### Photos

- Capture photos using device camera
- Select photos from device gallery
- Photos stored in Supabase Storage
- Photo metadata tracked in database

### Notes

- Add and edit internal job notes
- Notes saved to job record
- Visible only to app users

### Profile

- View technician details
- Sign out securely
- App version information
- Link to web dashboard

## Database Schema

### Required Tables

The following Supabase tables are expected:

#### `profiles`

```sql
id (uuid, primary key)
full_name (text)
email (text)
role (text: 'technician' | 'admin' | 'manager')
created_at (timestamp)
updated_at (timestamp)
```

#### `jobs`

```sql
id (uuid, primary key)
customer_id (uuid)
technician_name (text)
title (text)
description (text)
status (text: 'booking_confirmed' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled')
scheduled_at (timestamp)
started_at (timestamp, nullable)
completed_at (timestamp, nullable)
internal_notes (text, nullable)
customer_phone (text, nullable)
customer_address (text, nullable)
created_at (timestamp)
updated_at (timestamp)
```

#### `customers`

```sql
id (uuid, primary key)
name (text)
email (text)
phone (text)
address (text)
```

#### `job_photos`

```sql
id (uuid, primary key)
job_id (uuid)
url (text)
uploaded_at (timestamp)
```

### Storage

- Bucket: `job-photos`
- Files stored as: `{job_id}/{filename}`

## Styling

- **Theme**: Dark mode with navy background (#0A1628)
- **Primary Color**: Green (#7CC73F)
- **Cards**: Semi-transparent white with borders
- **Font**: System default (SF Pro on iOS, Roboto on Android)
- **Styling**: React Native StyleSheet (no external UI libraries)

## Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

Requires Expo Account and EAS CLI setup.

## Troubleshooting

### Supabase Connection Issues

- Verify credentials in `.env`
- Check Supabase project is active
- Ensure RLS policies allow read/write access

### Image Upload Failures

- Check `job-photos` storage bucket exists
- Verify bucket is public or has appropriate RLS policies
- Check file permissions and size limits

### Camera Permission Denied

- iOS: Add NSCameraUsageDescription to Info.plist
- Android: Add camera permission to AndroidManifest.xml
- Grant permissions when prompted by app

## Support

For issues or questions, contact the development team.
