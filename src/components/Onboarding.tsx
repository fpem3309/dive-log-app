import { useState } from 'react';
import { Modal, Text, View } from 'react-native';

import { useTrips } from '@/store/TripStore';
import { Button } from '@/ui/controls';
import { Field, NumberField } from '@/ui/fields';
import { radius, shadow, sp, surface, t } from '@/ui/theme';

/**
 * 한 번만 묻는 것 — 지금까지 몇 번 하셨어요?
 *
 * CLAUDE.md §4 주의: 이미 300번 넘게 탄 사람이 앱을 처음 켠다. 1번부터 시작하게
 * 만들면 경력자가 바로 나간다. 여기서 받은 값 위에 번호를 얹는다.
 *
 * 건너뛸 수 있어야 한다 — 프리다이버는 누적 횟수를 안 세는 사람이 많고,
 * 이 값이 없어도 앱은 정상 동작한다(횟수형 카드가 안 나올 뿐).
 */

export function Onboarding() {
  const { ready, settings, updateSettings, trips } = useTrips();
  const [value, setValue] = useState('');

  // 저장소를 읽기 전이거나, 이미 지난 사람에게는 안 띄운다
  const show = ready && !settings.onboarded;

  const finish = (start?: number) => updateSettings({ onboarded: true, diveNumberStart: start });

  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={() => finish()}>
      <View
        style={{
          flex: 1,
          backgroundColor: surface.scrim,
          justifyContent: 'center',
          padding: sp.xl,
        }}>
        <View
          style={{
            gap: sp.xl,
            padding: sp.xl,
            paddingTop: sp.xxl,
            borderRadius: radius.xl,
            backgroundColor: surface.raised,
            boxShadow: shadow.modal,
          }}>
          <View style={{ gap: sp.sm, paddingHorizontal: sp.xs }}>
            <Text style={t.title}>지금까지 몇 번{'\n'}다이빙하셨어요?</Text>
            <Text style={t.body}>
              스쿠버 누적 횟수예요. 여기서부터 이어서 셀게요.{'\n'}
              안 세셨으면 건너뛰어도 돼요 — 나중에 바꿀 수 있어요.
            </Text>
          </View>

          <Field label="지금까지" hint="대충이어도 괜찮아요">
            <NumberField
              value={value}
              onChangeText={setValue}
              unit="번"
              placeholder="300"
              style={{ minHeight: 68, borderRadius: 20, paddingHorizontal: 20 }}
              big
            />
          </Field>

          <View style={{ gap: sp.sm }}>
            <Button
              label={value.trim() ? `${value}번부터 시작` : '1번부터 시작'}
              variant="primary"
              onPress={() => finish(parseInt(value, 10) || 0)}
            />
            <Button label="건너뛰기" onPress={() => finish(undefined)} />
          </View>

          {trips.length > 0 && (
            <Text style={[t.meta, { fontSize: 12, paddingHorizontal: sp.xs }]}>
              이미 적어 둔 로그가 있으면 번호는 날짜순으로 다시 매겨져요
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
