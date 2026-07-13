import { View, ActivityIndicator } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Screen from '@/components/Screen';
import BookingTable from '@/components/BookingTable';
import ErrorState from '@/components/ErrorState';
import { useBookings } from '@/hooks/useBookings';

// Bookings tab — the priority view: the admin panel's booking table as a mobile
// FlatList. Auth is enforced by (tabs)/_layout; this screen only renders data.
export default function BookingsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useBookings();

  return (
    <Screen title="予約一覧">
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : (
        <BookingTable
          data={data ?? []}
          refreshing={isRefetching}
          onRefresh={refetch}
          // Cast: Expo regenerates typed routes on `expo start`; offline the
          // new booking/[id] route isn't in the cached Href union yet.
          onPressItem={(b) => router.push(`/booking/${b.id}` as Href)}
        />
      )}
    </Screen>
  );
}
