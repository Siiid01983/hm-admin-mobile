import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import Screen from '@/components/Screen';
import AdminCard from '@/components/AdminCard';
import { useSession } from '@/hooks/useSession';
import { useHealth } from '@/hooks/useHealth';
import { logout } from '@/api/auth';
import { API_BASE } from '@/api/config';

type HealthStatus = 'checking' | 'ok' | 'degraded' | 'offline';

const STATUS_META: Record<HealthStatus, { dot: string; label: string }> = {
  checking: { dot: 'bg-neutral-300', label: '確認中…' },
  ok: { dot: 'bg-green-500', label: '正常' },
  degraded: { dot: 'bg-amber-500', label: 'DB接続エラー' },
  offline: { dot: 'bg-red-500', label: 'オフライン' },
};

// Settings tab — admin identity, live API health, build info, and account
// actions (cache clear, confirm-gated logout).
export default function SettingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const session = useSession();
  const health = useHealth();

  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const user = session.data?.user;
  const exp = session.data?.exp;
  const expLabel = exp ? new Date(exp * 1000).toLocaleString('ja-JP') : '—';

  const h = health.data;
  const status: HealthStatus = !h
    ? 'checking'
    : !h.reachable
      ? 'offline'
      : h.ok && h.db
        ? 'ok'
        : 'degraded';
  const statusMeta = STATUS_META[status];

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([session.refetch(), health.refetch()]);
    setRefreshing(false);
  }

  function confirmLogout() {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: doLogout },
    ]);
  }

  async function doLogout() {
    setLoggingOut(true);
    await logout();
    qc.clear(); // drop cached admin data on the way out
    router.replace('/login');
  }

  function onClearCache() {
    qc.clear();
    Alert.alert('完了', 'キャッシュをクリアしました。');
  }

  return (
    <Screen title="設定">
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <AdminCard
          title={user?.name || user?.email || '管理者'}
          subtitle={user?.email || ''}
        >
          <View className="mt-2 gap-y-1">
            <Text className="text-xs text-neutral-600">権限: {user?.role || '—'}</Text>
            <Text className="text-xs text-neutral-600">セッション有効期限: {expLabel}</Text>
          </View>
        </AdminCard>

        <AdminCard
          title="サーバー状態"
          right={
            <View className="flex-row items-center gap-x-2">
              <View className={`w-2.5 h-2.5 rounded-full ${statusMeta.dot}`} />
              <Text className="text-xs font-medium text-neutral-700">{statusMeta.label}</Text>
            </View>
          }
        >
          <View className="mt-2 gap-y-1">
            {h?.time ? (
              <Text className="text-xs text-neutral-500">
                最終確認: {new Date(h.time).toLocaleString('ja-JP')}
              </Text>
            ) : null}
            {h?.diag?.php ? (
              <Text className="text-xs text-neutral-500">PHP: {h.diag.php}</Text>
            ) : null}
            {status !== 'ok' && h?.error ? (
              <Text className="text-xs text-red-600">{h.error}</Text>
            ) : null}
          </View>
        </AdminCard>

        <AdminCard title="アプリ情報">
          <View className="mt-2 gap-y-1">
            <Text className="text-xs text-neutral-600">
              バージョン: {Constants.expoConfig?.version || '—'}
            </Text>
            <Text className="text-xs text-neutral-600">API: {API_BASE}</Text>
          </View>
        </AdminCard>

        <Pressable
          onPress={onClearCache}
          className="mb-3 bg-white border border-neutral-200 rounded-xl py-3.5 items-center active:opacity-80"
        >
          <Text className="text-neutral-700 font-medium">キャッシュをクリア</Text>
        </Pressable>

        <Pressable
          onPress={confirmLogout}
          disabled={loggingOut}
          className="bg-red-50 border border-red-200 rounded-xl py-3.5 items-center active:opacity-80"
        >
          {loggingOut ? (
            <ActivityIndicator color="#b91c1c" />
          ) : (
            <Text className="text-red-700 font-semibold">ログアウト</Text>
          )}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
