import { View, Text, Pressable, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Screen from '@/components/Screen';
import ErrorState from '@/components/ErrorState';
import { useChatThreads } from '@/hooks/useChat';

function fmtDay(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso.indexOf('T') > 0 ? iso : iso.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const p = (n: number) => String(n).padStart(2, '0');
  return sameDay ? `${p(d.getHours())}:${p(d.getMinutes())}` : `${d.getMonth() + 1}/${d.getDate()}`;
}

// Chat tab — list of conversations (one per booking room), mirroring the admin
// Inbox's thread list. Tap a conversation to open its room.
export default function ChatListScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useChatThreads();

  return (
    <Screen title="チャット">
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(t) => t.bookingId}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <Text className="text-center text-neutral-400 mt-10">チャットはまだありません</Text>
          }
          renderItem={({ item }) => {
            const q =
              `/chat/${item.bookingId}?ref=${encodeURIComponent(item.ref)}` +
              `&name=${encodeURIComponent(item.customerName)}&email=${encodeURIComponent(item.customerEmail)}`;
            return (
              <Pressable
                onPress={() => router.push(q as Href)}
                className="bg-white border border-neutral-200 rounded-2xl p-4 mb-2 active:opacity-70"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-brand flex-1 pr-2" numberOfLines={1}>
                    {item.customerName || '（お客様）'}
                  </Text>
                  <Text className="text-[11px] text-neutral-400">{fmtDay(item.lastAt)}</Text>
                </View>
                {item.ref ? (
                  <Text className="text-[11px] text-neutral-400 mt-0.5">予約 {item.ref}</Text>
                ) : null}
                <Text className="text-sm text-neutral-600 mt-1" numberOfLines={1}>
                  {item.lastText}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
