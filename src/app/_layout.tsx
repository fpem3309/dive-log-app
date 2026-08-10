import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Onboarding } from '@/components/Onboarding';
import { surface } from '@/ui/theme';
import { fontAssets } from '@/design/type';
import { TripProvider } from '@/store/TripStore';
import { ConfirmProvider } from '@/ui/Confirm';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // 폰트가 카드 레이아웃의 일부라 (계기판 느낌의 mono 숫자) 먼저 로드하고 그린다
  if (!loaded && !error) return null;

  return (
    // 스와이프 제스처(목록에서 밀어 지우기)에 필요하다 — 없으면 조용히 동작하지 않는다
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TripProvider>
        <ConfirmProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: surface.bg },
            }}
          />
          {/* 저장소를 읽은 뒤 처음 한 번만 뜬다 */}
          <Onboarding />
        </ConfirmProvider>
      </TripProvider>
    </GestureHandlerRootView>
  );
}
