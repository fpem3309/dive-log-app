import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { inkA } from '@/design/tokens';
import { daysOfTrip, padMD, weekdayKr } from '@/model/dates';
import type { Discipline, Dive, Trip } from '@/model/types';
import { useTrips } from '@/store/TripStore';
import { Button, Chip, Divider, Segmented } from '@/ui/controls';
import { useConfirm } from '@/ui/Confirm';
import { SwipeRow } from '@/ui/SwipeRow';
import { Field, MinSecField, NumberField, TextField } from '@/ui/fields';
import { radius, sp, surface, t } from '@/ui/theme';
import { PhotoPicker } from './PhotoPicker';
import { SightingsEditor } from './SightingsEditor';

/**
 * 다이브 한 줄 — 접히면 목록, 펼치면 편집기.
 *
 * 트립 화면을 떠나지 않는 게 핵심이다 (§2-③). 저녁에 8개를 몰아 쓰는 사람은
 * 방금 적은 것들이 계속 보여야 "3번까지 썼네" 감각이 유지된다.
 *
 * 필수는 날짜·장소·종목 세 개뿐이고 (§2-①) 나머지는 "더 적기" 뒤에 접혀 있다.
 * 안 채운 칸을 잘못처럼 보이게 하지 않는다 — 별표도 경고도 없다.
 */

const FREE_STYLES = ['CWT', 'CWTB', 'FIM', 'CNF', 'VWT'];

const numOrUndef = (s: string): number | undefined => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
};

const initialDraft = (d: Dive) => {
  const dur = d.duration;
  return {
    maxDepth: d.maxDepth?.toString() ?? '',
    durMin:
      dur == null ? '' : d.discipline === 'free' ? String(Math.floor(dur / 60)) : String(dur),
    durSec: dur == null ? '' : d.discipline === 'free' ? String(dur % 60).padStart(2, '0') : '',
    waterTemp: d.waterTemp?.toString() ?? '',
    visibility: d.visibility?.toString() ?? '',
    airEnd: d.airEnd?.toString() ?? '',
    time: d.time ?? '',
  };
};

/**
 * 선택 항목이 하나라도 적혀 있으면 "더 적기"를 펼친 채로 연다.
 * `time`도 여기 들어간다 — 시각 입력칸이 "더 적기" 안에 있어서, 빠뜨리면
 * 시각만 적은 다이브는 값이 저장돼 있는데도 화면에서 보이지도 지워지지도 않는다.
 */
const hasOptional = (d: Dive) =>
  d.maxDepth != null ||
  d.duration != null ||
  !!d.time ||
  d.waterTemp != null ||
  d.visibility != null ||
  d.airEnd != null ||
  !!d.style ||
  !!d.note ||
  !!d.photo ||
  d.sightings.length > 0;

type Props = {
  trip: Trip;
  dive: Dive;
  /** 트립 안에서 몇 번째인지 (1부터) */
  ordinal: number;
  /** 누적 다이브 번호 — 스쿠버이고 온보딩을 했을 때만 */
  diveNumber?: number;
  expanded: boolean;
  onToggle: () => void;
};

export function DiveRow({ trip, dive, ordinal, diveNumber, expanded, onToggle }: Props) {
  const { updateDive, deleteDive, speciesHistory } = useTrips();
  const { confirm } = useConfirm();
  const [draft, setDraft] = useState(() => initialDraft(dive));
  const [more, setMore] = useState(() => hasOptional(dive));

  const set = (patch: Partial<Dive>) => updateDive(trip.id, dive.id, patch);

  const setNum = (key: keyof typeof draft, field: keyof Dive) => (v: string) => {
    setDraft((p) => ({ ...p, [key]: v }));
    set({ [field]: numOrUndef(v) } as Partial<Dive>);
  };

  const setDuration = (m: string, s: string) => {
    setDraft((p) => ({ ...p, durMin: m, durSec: s }));
    const mm = parseInt(m, 10) || 0;
    const ss = parseInt(s, 10) || 0;
    const empty = m === '' && s === '';
    set({ duration: empty ? undefined : dive.discipline === 'free' ? mm * 60 + ss : mm });
  };

  /**
   * 종목을 바꾸면 시간의 의미가 바뀐다 (프리=초, 스쿠버=분).
   * 실제 길이를 유지하도록 환산하고, 종목 전용 항목은 지운다.
   */
  const setDiscipline = (next: Discipline) => {
    if (next === dive.discipline) return;
    const patch: Partial<Dive> = { discipline: next };
    if (dive.duration != null) {
      if (next === 'free') {
        const seconds = dive.duration * 60;
        patch.duration = seconds;
        setDraft((p) => ({
          ...p,
          durMin: String(Math.floor(seconds / 60)),
          durSec: String(seconds % 60).padStart(2, '0'),
        }));
      } else {
        const minutes = Math.max(1, Math.round(dive.duration / 60));
        patch.duration = minutes;
        setDraft((p) => ({ ...p, durMin: String(minutes), durSec: '' }));
      }
    }
    if (next === 'free') patch.airEnd = undefined;
    else patch.style = undefined;
    setDraft((p) => ({ ...p, airEnd: '' }));
    set(patch);
  };

  const confirmDelete = async () => {
    const ok = await confirm({
      title: '이 다이브를 지울까요?',
      message: `${padMD(dive.date)} · ${dive.site || '장소를 아직 안 적은 다이브'}`,
      destructive: true,
    });
    if (ok) deleteDive(trip.id, dive.id);
    return ok;
  };

  const days = daysOfTrip(trip.startDate, trip.endDate);
  const isFree = dive.discipline === 'free';

  // ---------- 접힌 줄 ----------
  // 펼친 편집기는 폼이라 감싸지 않는다 — 입력 중에 밀리면 곤란하다
  if (!expanded) {
    return (
      <SwipeRow onPress={onToggle} onDelete={confirmDelete}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: sp.md,
            paddingVertical: 14,
            paddingHorizontal: sp.md,
          }}>
          <Text style={[t.meta, { width: 20, textAlign: 'center', color: inkA(0.42) }]}>
            {ordinal}
          </Text>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text style={[t.rowTitle, !dive.site && { color: inkA(0.42) }]} numberOfLines={1}>
              {dive.site || '새 다이브'}
            </Text>
            <Text style={t.meta} numberOfLines={1}>
              {padMD(dive.date)} · {isFree ? '프리' : '스쿠버'}
              {dive.maxDepth != null && ` · ${dive.maxDepth}m`}
              {diveNumber != null && ` · ${diveNumber}번째`}
            </Text>
          </View>
          {dive.sightings.some((s) => s.isHighlight) && (
            <Text style={{ color: surface.accent, fontSize: 14 }}>♥</Text>
          )}
          <Text style={{ color: inkA(0.3), fontSize: 18 }}>›</Text>
        </View>
      </SwipeRow>
    );
  }

  // ---------- 펼친 편집기 ----------
  return (
    <View
      style={{
        borderRadius: radius.lg,
        backgroundColor: surface.sunken,
        borderWidth: 1,
        borderColor: surface.line,
        padding: sp.lg,
        gap: sp.lg,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[t.label, { flex: 1 }]}>다이브 {ordinal}</Text>
        <Pressable onPress={onToggle} hitSlop={12}>
          <Text style={{ color: inkA(0.5), fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>

      {/* 날짜 — 트립 기간 안에서 고른다. 달력을 띄우는 것보다 훨씬 빠르다 */}
      <Field label="날짜">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm }}>
          {days.map((d, i) => (
            <Chip
              key={d}
              mono
              label={`${i + 1}일차 ${padMD(d)} ${weekdayKr(d)}`}
              selected={dive.date === d}
              onPress={() => set({ date: d })}
            />
          ))}
        </View>
      </Field>

      <Field label="장소">
        <TextField
          value={dive.site}
          onChangeText={(v) => set({ site: v })}
          placeholder="문섬 새끼섬"
        />
      </Field>

      <Field label="종목">
        <Segmented<Discipline>
          value={dive.discipline}
          onChange={setDiscipline}
          options={[
            { value: 'free', label: '프리다이빙' },
            { value: 'scuba', label: '스쿠버' },
          ]}
        />
      </Field>

      {!more ? (
        <Pressable onPress={() => setMore(true)} hitSlop={8}>
          <Text style={[t.chip, { color: surface.accent }]}>› 더 적기 (수심 · 시간 · 생물 · 사진)</Text>
        </Pressable>
      ) : (
        <View style={{ gap: sp.lg }}>
          <Divider />

          <View style={{ flexDirection: 'row', gap: sp.lg }}>
            <Field label="최대 수심" style={{ flex: 1 }}>
              <NumberField
                value={draft.maxDepth}
                onChangeText={setNum('maxDepth', 'maxDepth')}
                unit="m"
                placeholder="24.5"
                decimal
              />
            </Field>
            <Field label="수온" style={{ flex: 1 }}>
              <NumberField
                value={draft.waterTemp}
                onChangeText={setNum('waterTemp', 'waterTemp')}
                unit="°C"
                placeholder="23"
                decimal
              />
            </Field>
          </View>

          <Field label="시간" hint={isFree ? '분:초' : '분'}>
            {isFree ? (
              <MinSecField minutes={draft.durMin} seconds={draft.durSec} onChange={setDuration} />
            ) : (
              <NumberField
                value={draft.durMin}
                onChangeText={(v) => setDuration(v, '')}
                unit="분"
                placeholder="42"
              />
            )}
          </Field>

          <View style={{ flexDirection: 'row', gap: sp.lg }}>
            <Field label="시야" style={{ flex: 1 }}>
              <NumberField
                value={draft.visibility}
                onChangeText={setNum('visibility', 'visibility')}
                unit="m"
                placeholder="15"
              />
            </Field>
            {isFree ? (
              <View style={{ flex: 1 }} />
            ) : (
              <Field label="남은 공기" style={{ flex: 1 }}>
                <NumberField
                  value={draft.airEnd}
                  onChangeText={setNum('airEnd', 'airEnd')}
                  unit="bar"
                  placeholder="50"
                />
              </Field>
            )}
          </View>

          {isFree && (
            <Field label="종목">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm }}>
                {FREE_STYLES.map((s) => (
                  <Chip
                    key={s}
                    mono
                    label={s}
                    selected={dive.style === s}
                    onPress={() => set({ style: dive.style === s ? undefined : s })}
                  />
                ))}
              </View>
            </Field>
          )}

          <Field label="시각" hint="비워도 됩니다">
            <TextField
              value={draft.time}
              onChangeText={(v) => {
                setDraft((p) => ({ ...p, time: v }));
                set({ time: v.trim() || undefined });
              }}
              placeholder="14:20"
              maxLength={5}
            />
          </Field>

          <Divider />

          {/*
            "카드 주인공이 됩니다"라고 약속하지 않는다 — 카드 화면에서 주인공을 직접
            고를 수 있게 되면서(§10-㉜) 하트가 항상 주인공이 되지는 않는다.
            하트가 실제로 하는 일(그날의 하이라이트 지정, §2-④)만 말한다.
          */}
          <Field label="본 생물" hint="하트를 누르면 그날의 하이라이트가 됩니다">
            <SightingsEditor
              sightings={dive.sightings}
              onChange={(next) => set({ sightings: next })}
              history={speciesHistory}
            />
          </Field>

          <Field label="사진" hint="없으면 물기둥 배경이 됩니다">
            <PhotoPicker photo={dive.photo} onChange={(p) => set({ photo: p })} keyId={dive.id} />
          </Field>

          <Field label="메모">
            <TextField
              value={dive.note ?? ''}
              onChangeText={(v) => set({ note: v || undefined })}
              placeholder="그날 기억나는 것"
              multiline
            />
          </Field>
        </View>
      )}

      <Divider />
      <View style={{ flexDirection: 'row', gap: sp.md }}>
        <Button label="접기" onPress={onToggle} style={{ flex: 1 }} />
        <Button label="지우기" variant="danger" onPress={confirmDelete} />
      </View>
    </View>
  );
}
