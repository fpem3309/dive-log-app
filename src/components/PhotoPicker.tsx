import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, Text, View } from 'react-native';

import { inkA } from '@/design/tokens';
import { deletePhoto, persistPhoto } from '@/model/photos';
import type { Dive } from '@/model/types';
import { Button } from '@/ui/controls';
import { useConfirm } from '@/ui/Confirm';
import { radius, sp, surface, t } from '@/ui/theme';

/**
 * 사진 1장 — CLAUDE.md §7 "사진 1장 첨부 (없어도 됨)".
 *
 * 없을 때 대체 이미지를 넣지 않는다 (§5). 사진이 없으면 카드는 물기둥 배경이 되고
 * 그게 더 나은 결과라, 여기서도 "사진을 넣으라"고 재촉하지 않는다.
 */

type Props = {
  photo: Dive['photo'];
  onChange: (photo: Dive['photo']) => void;
  /** 다이브 id — 사진 파일명으로 쓴다 (다이브당 1장) */
  keyId: string;
};

export function PhotoPicker({ photo, onChange, keyId }: Props) {
  const { notify } = useConfirm();
  const uri = typeof photo === 'object' && photo && 'uri' in photo ? photo.uri : undefined;

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      await notify('사진 접근 권한이 필요합니다', '설정에서 사진 접근을 허용해 주세요.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      // 카드가 9:16이라 세로로 자르게 유도한다
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });
    if (res.canceled || !res.assets[0]) return;
    // 피커 uri는 캐시 경로다. 앱이 소유하는 곳으로 복사해 두고 그 경로를 저장한다.
    onChange({ uri: persistPhoto(res.assets[0].uri, keyId) });
  };

  if (!uri) {
    return <Button label="사진 고르기" onPress={pick} />;
  }

  return (
    <View style={{ flexDirection: 'row', gap: sp.md, alignItems: 'center' }}>
      <Pressable onPress={pick} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        <Image
          source={{ uri }}
          style={{
            width: 54,
            height: 96,
            borderRadius: radius.sm,
            backgroundColor: surface.raised,
          }}
          resizeMode="cover"
        />
      </Pressable>
      <View style={{ flex: 1, gap: sp.sm, alignItems: 'flex-start' }}>
        <Text style={[t.meta, { fontSize: 11 }]}>탭해서 바꾸기</Text>
        <Pressable
          onPress={() => {
            deletePhoto(uri);
            onChange(undefined);
          }}
          hitSlop={10}>
          <Text style={[t.chip, { color: inkA(0.55), fontSize: 12.5 }]}>사진 빼기</Text>
        </Pressable>
      </View>
    </View>
  );
}
