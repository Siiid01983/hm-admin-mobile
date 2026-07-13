import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '@/api/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!email || !password) {
      Alert.alert('入力エラー', 'メールとパスワードを入力してください');
      return;
    }
    setBusy(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (e) {
      Alert.alert('ログイン失敗', e instanceof Error ? e.message : 'ログインに失敗しました');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-brand-cream"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-2xl font-bold text-brand mb-1">Hello Moving 管理</Text>
        <Text className="text-sm text-neutral-500 mb-8">管理者アカウントでログイン</Text>

        <Text className="text-xs font-medium text-neutral-600 mb-1">メールアドレス</Text>
        <TextInput
          className="bg-white border border-neutral-300 rounded-xl px-4 py-3 mb-4 text-base"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="admin@hello-moving.com"
          placeholderTextColor="#9ca3af"
        />

        <Text className="text-xs font-medium text-neutral-600 mb-1">パスワード</Text>
        <TextInput
          className="bg-white border border-neutral-300 rounded-xl px-4 py-3 mb-6 text-base"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
        />

        <Pressable
          className="bg-brand rounded-xl py-3.5 items-center active:opacity-80"
          onPress={onSubmit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">ログイン</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
