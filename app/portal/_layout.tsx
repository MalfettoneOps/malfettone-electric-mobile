import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

function TabIcon({ label, emoji, focused }: { label: string; emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={{ fontSize: 10, color: focused ? '#7CC73F' : 'rgba(255,255,255,0.4)', fontWeight: focused ? '600' : '400' }}>
        {label}
      </Text>
    </View>
  );
}

export default function PortalLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0d1b2e',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="jobs"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Jobs" emoji="🔧" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Invoices" emoji="💳" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Account" emoji="👤" focused={focused} />,
        }}
      />
      {/* Hidden detail screen */}
      <Tabs.Screen name="job-detail" options={{ href: null }} />
    </Tabs>
  );
}
