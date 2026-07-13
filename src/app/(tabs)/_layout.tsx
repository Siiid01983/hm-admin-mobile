import { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator, type ColorValue } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { getToken } from '@/lib/session';

type AuthState = 'checking' | 'authed' | 'guest';

// Dependency-free tab glyph. @expo/vector-icons is not installed; emoji render
// consistently across iOS/Android/web with no extra assets. Swap for vector
// icons later if desired.
function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

// Single auth gate for the whole authenticated area: no valid (non-expired)
// token → bounce to /login. Every tab lives behind this, so individual screens
// no longer need their own guard.
export default function TabsLayout() {
  const [auth, setAuth] = useState<AuthState>('checking');

  useEffect(() => {
    getToken().then((t) => setAuth(t ? 'authed' : 'guest'));
  }, []);

  if (auth === 'checking') {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream">
        <ActivityIndicator />
      </View>
    );
  }
  if (auth === 'guest') return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2C3626', // brand dark green
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      {/* Chat-First: the conversation list is the anchor (index / home). */}
      <Tabs.Screen
        name="index"
        options={{ title: 'チャット', tabBarIcon: ({ color }) => <TabIcon glyph="💬" color={color} /> }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: '予約管理', tabBarIcon: ({ color }) => <TabIcon glyph="🏠" color={color} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'カレンダー', tabBarIcon: ({ color }) => <TabIcon glyph="📅" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '設定', tabBarIcon: ({ color }) => <TabIcon glyph="⚙️" color={color} /> }}
      />
    </Tabs>
  );
}
