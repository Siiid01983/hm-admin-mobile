import { View, Image, Text, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { signChatUrl } from '@/api/chat';

// Resolves a private `chat` file to a short-lived signed URL and renders it.
// Cached per path (staleTime < the 300s signature TTL) so polling doesn't
// re-sign on every tick. Tap to open full-size in the browser.
export default function ChatImage({ path }: { path: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['chatSign', path],
    queryFn: () => signChatUrl(path),
    staleTime: 240_000,
  });

  if (isLoading) {
    return (
      <View className="w-48 h-48 rounded-xl bg-neutral-200 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View className="w-48 h-40 rounded-xl bg-neutral-100 items-center justify-center">
        <Text className="text-xs text-neutral-400">画像を読み込めません</Text>
      </View>
    );
  }
  return (
    <Pressable onPress={() => Linking.openURL(data)}>
      <Image source={{ uri: data }} className="w-48 h-48 rounded-xl" resizeMode="cover" />
    </Pressable>
  );
}
