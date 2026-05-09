import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

function TabIcon({ label, emoji, focused }: { label: string; emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={{ fontSize: 10, color: focused ? '#7CC73F' : '#9CA3AF', fontWeight: focused ? '600' : '400' }}>
        {label}
      </Text>
    </View>
  );
}

export default function DispatchLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Today" emoji="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="all-jobs"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="All Jobs" emoji="🗂️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" emoji="👤" focused={focused} />,
        }}
      />
      {/* Hidden detail screen */}
      <Tabs.Screen name="job-detail" options={{ href: null }} />
    </Tabs>
  );
}
