import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Screen from '@/components/Screen';
import ErrorState from '@/components/ErrorState';
import ChatBubble from '@/components/ChatBubble';
import BandPickerModal from '@/components/BandPickerModal';
import BookingRequestBar from '@/components/BookingRequestBar';
import { useChatMessages, useSendChat } from '@/hooks/useChat';
import { useBooking, useUpdateBookingStatus } from '@/hooks/useBookings';
import { useReserveSlot, useReleaseSlot } from '@/hooks/useSlots';
import { SlotConflictError } from '@/api/slots';
import { isPending, STATUS_APPROVE, STATUS_REJECT } from '@/api/bookings';
import type { ChatMessage } from '@/api/chat';
import type { Band } from '@/api/calendar';

const REJECT_MESSAGE =
  'ご連絡ありがとうございます。申し訳ございませんが、ご希望の日程は現在空きがございません。別の日程をご検討いただけますと幸いです。';

// One booking's chat room — the Conversation-Driven hub. Replies thread to
// 'chat:<bookingId>'. When the room's booking is still pending, an in-chat
// Action Bar (Approve / Reject) appears below the conversation so the admin can
// close the booking without leaving the chat.
export default function ChatRoomScreen() {
  const params = useLocalSearchParams<{ bookingId: string; ref?: string; name?: string; email?: string }>();
  const bookingId = String(params.bookingId ?? '');
  const ref = String(params.ref ?? '');
  const name = String(params.name ?? '');
  const email = String(params.email ?? '');

  const router = useRouter();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [text, setText] = useState('');
  const [approving, setApproving] = useState(false);

  const { data, isLoading, isError, error, refetch } = useChatMessages(bookingId);
  const send = useSendChat(bookingId, { ref, customerEmail: email });

  // Booking behind this room — drives the in-chat Action Bar.
  const booking = useBooking(bookingId);
  const statusMut = useUpdateBookingStatus();
  const reserveMut = useReserveSlot();
  const releaseMut = useReleaseSlot();
  const actionBusy = statusMut.isPending || reserveMut.isPending || releaseMut.isPending;

  const bookingDate = booking.data
    ? (booking.data.booking_date || '').match(/\d{4}-\d{2}-\d{2}/)?.[0] || ''
    : '';
  const showRequestBar = !!booking.data && isPending(booking.data.status);

  function onSendError(e: unknown) {
    Alert.alert('送信失敗', e instanceof Error ? e.message : '送信に失敗しました');
  }

  function onSendText() {
    const t = text.trim();
    if (!t || send.isPending) return;
    setText('');
    send.mutate({ text: t }, { onError: onSendError });
  }

  async function onAttach() {
    if (send.isPending) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('権限が必要です', '写真を添付するにはフォトライブラリへのアクセスを許可してください。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.length) return;
    const a = result.assets[0];
    const fileName = a.fileName || a.uri.split('/').pop() || 'photo.jpg';
    const mime = a.mimeType || 'image/jpeg';
    send.mutate({ images: [{ uri: a.uri, name: fileName, mime }] }, { onError: onSendError });
  }

  // ── Approve: pick a band → reserve the slot (collision-checked) → 確定 ──────
  function onApprove() {
    if (!bookingDate) {
      Alert.alert('日付が必要', '予約日が設定されていません。詳細画面から日付を設定してください。');
      return;
    }
    setApproving(true);
  }

  function confirmWithBand(band: Band) {
    reserveMut.mutate(
      { bookingId, date: bookingDate, band },
      {
        onSuccess: () =>
          statusMut.mutate(
            { id: bookingId, status: STATUS_APPROVE },
            { onSettled: () => setApproving(false) },
          ),
        onError: (e) => {
          if (e instanceof SlotConflictError) {
            Alert.alert('Time Slot Occupied', 'Please release the slot first.\nこの時間帯は既に予約されています。');
          } else {
            Alert.alert('エラー', e instanceof Error ? e.message : '予約に失敗しました');
          }
        },
      },
    );
  }

  // ── Reject: send the pre-defined "unavailable" reply + mark キャンセル + free slot ─
  function onReject() {
    if (actionBusy || send.isPending) return;
    send.mutate(
      { text: REJECT_MESSAGE },
      {
        onSuccess: () =>
          statusMut.mutate(
            { id: bookingId, status: STATUS_REJECT },
            { onSuccess: () => releaseMut.mutate(bookingId) },
          ),
        onError: onSendError,
      },
    );
  }

  const title = name || '（お客様）';

  return (
    <Screen title={title} onBack={() => router.back()}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : isError ? (
          <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
        ) : (
          <FlatList
            ref={listRef}
            data={data ?? []}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingVertical: 10 }}
            renderItem={({ item }) => <ChatBubble msg={item} />}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={
              ref ? (
                <Text className="text-center text-[11px] text-neutral-400 mb-1">予約番号 {ref}</Text>
              ) : null
            }
            ListEmptyComponent={
              <Text className="text-center text-neutral-400 mt-10">まだメッセージはありません。</Text>
            }
            ListFooterComponent={
              showRequestBar && booking.data ? (
                <BookingRequestBar
                  booking={booking.data}
                  busy={actionBusy}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ) : null
            }
          />
        )}

        <View className="flex-row items-end gap-x-2 px-3 py-2 border-t border-neutral-200 bg-white">
          <Pressable
            onPress={onAttach}
            disabled={send.isPending}
            className="w-10 h-10 rounded-full items-center justify-center bg-neutral-100 active:opacity-70"
          >
            <Text className="text-lg">＋</Text>
          </Pressable>
          <TextInput
            className="flex-1 bg-neutral-50 border border-neutral-300 rounded-2xl px-4 py-2.5 text-[15px] max-h-28"
            placeholder="メッセージを入力…"
            placeholderTextColor="#9ca3af"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={4000}
          />
          <Pressable
            onPress={onSendText}
            disabled={send.isPending || !text.trim()}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              send.isPending || !text.trim() ? 'bg-neutral-300' : 'bg-brand'
            } active:opacity-80`}
          >
            {send.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-base">➤</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {approving && booking.data ? (
        <BandPickerModal
          date={bookingDate}
          title="承認：時間帯を選択"
          busy={reserveMut.isPending || statusMut.isPending}
          onPick={confirmWithBand}
          onClose={() => setApproving(false)}
        />
      ) : null}
    </Screen>
  );
}
