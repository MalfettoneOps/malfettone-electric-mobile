# Quick Start Guide

## 1. Prerequisites

- **Node.js**: 16+ ([download](https://nodejs.org/))
- **Expo CLI**: `npm install -g expo-cli`
- **iOS Simulator** (macOS): Part of Xcode
- **Android Emulator**: Part of Android Studio

## 2. Installation (5 minutes)

```bash
# Navigate to project directory
cd malfettone-electric-mobile

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## 3. Configure Supabase

Edit `.env` with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these in your Supabase project settings:
1. Go to Settings → API
2. Copy Project URL and anon key

## 4. Update Supabase Client

Also update `/lib/supabase.ts` (same values):

```typescript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

## 5. Ensure Database Tables Exist

Your Supabase project needs these tables:

### profiles
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'technician',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

### jobs
```sql
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  technician_name text NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'booking_confirmed',
  scheduled_at timestamp NOT NULL,
  started_at timestamp,
  completed_at timestamp,
  internal_notes text,
  customer_phone text,
  customer_address text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

### customers
```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamp DEFAULT now()
);
```

### job_photos
```sql
CREATE TABLE job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  url text NOT NULL,
  uploaded_at timestamp DEFAULT now()
);
```

## 6. Create Storage Bucket

In Supabase dashboard:

1. Go to Storage
2. Create new bucket named `job-photos`
3. Set to Public (or configure RLS as needed)

## 7. Run the App

**Start development server:**
```bash
npm start
```

**Run on iOS Simulator:**
```bash
npm run ios
```

**Run on Android Emulator:**
```bash
npm run android
```

## 8. Test Login

Use any test credentials from your Supabase Auth:

- Email: `tech@example.com`
- Password: `password123`

(Note: Create test users in Supabase Auth and their profiles in the profiles table)

## 9. First Run Checklist

- [ ] App starts without errors
- [ ] Login screen appears
- [ ] Can sign in with valid credentials
- [ ] Today's Jobs screen loads (shows "No jobs" if empty)
- [ ] Can navigate tabs (Today/Jobs/Profile)
- [ ] Profile screen shows your name/email
- [ ] Sign Out button works and returns to login

## Common Issues

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install
```

### "Invalid Supabase URL"
Check `.env` file has correct format:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key-here
```

### "No jobs appear on Today screen"
- Verify jobs exist in database with today's date
- Check `technician_name` matches user's `full_name` in profiles
- Jobs must have `status != 'completed'`

### "Camera permission denied"
- iOS: Check Info.plist has NSCameraUsageDescription
- Android: Grant permissions when prompted
- Test with simulator/emulator (may need to manually enable)

### App crashes on photo upload
- Verify `job-photos` storage bucket exists
- Check RLS policies allow public uploads (or configure auth policy)
- Test photo URL is accessible

## Next Steps

### Development
- Modify screens in `app/` directory
- Update helpers in `lib/supabase.ts`
- Hot reload works with `npm start`

### Testing
- Create test job data in Supabase
- Test all status transitions
- Verify photo uploads work
- Check today's job filtering

### Deployment
- See `ARCHITECTURE.md` for deployment steps
- Build requires EAS CLI: `npm install -g eas-cli`
- Configure signing certificates for iOS/Android

## Documentation

- **Project Structure**: `README.md`
- **Architecture Details**: `ARCHITECTURE.md`
- **Expo Docs**: https://docs.expo.dev
- **React Native Docs**: https://reactnative.dev
- **Supabase Docs**: https://supabase.com/docs

## Support

If you encounter issues:

1. Check the console output: `npm start` shows detailed errors
2. Review Supabase logs in dashboard
3. Verify database schema matches tables above
4. Test with Supabase SQL editor directly

Happy coding! 🚀
