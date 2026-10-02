import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Canvas, useImage } from '@shopify/react-native-skia';
import { useSavedDogs } from '../../dog/hooks/useSavedDogs';
import { fetchDog } from '../../dog/api/shelters';
import { SpriteFrame } from '../../game/core/entities/SpriteFrame';
import { DOG_FRAME_SIZE, dogIdleRow, dogWalkAtlas } from '../../game/core/assets/dog/dogWalkAtlas';
import { fonts } from '../../../shared/lib/fonts';
import { HomeSvg } from './HomeSvg';
import type { HomeTabScreenNavigationProp } from '../../../app/navigation';
import type { SavedDog } from '../../dog/types';

const SCENE_COLORS = ['#f1eddd', '#e3ecdf'];

// Figma "Saved friends / section heading" + "row" (nodes 22:15827, 22:15836) — home
// only shows the first 2, "모두 보기" goes to the full 저장한 친구 tab.
export function SavedFriendsSection() {
  const navigation = useNavigation<HomeTabScreenNavigationProp>();
  const state = useSavedDogs(2);
  const goToSavedTab = () => navigation.navigate('저장한 친구');

  if (state.status === 'loading') {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <HomeSvg name="heartSection" width={18} height={18} style={styles.headingIcon} />
        <Text style={styles.headingText}>마음에 담은 친구</Text>
        {state.status === 'ready' && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{state.dogs.length}</Text>
          </View>
        )}
        <Pressable style={styles.seeAll} onPress={goToSavedTab}>
          <Text style={styles.seeAllText}>모두 보기</Text>
          <HomeSvg name="chevronSeeall" width={14} height={14} />
        </Pressable>
      </View>

      {state.status === 'anon' && <Text style={styles.hintText}>로그인하면 마음에 담은 친구를 모아볼 수 있어요</Text>}
      {state.status === 'error' && <Text style={styles.hintText}>친구 목록을 못 불러왔어요</Text>}
      {state.status === 'ready' && state.dogs.length === 0 && <Text style={styles.hintText}>아직 담은 친구가 없어요</Text>}
      {state.status === 'ready' && state.dogs.length > 0 && (
        <View style={styles.row}>
          {state.dogs.map((dog, index) => (
            <FriendCard key={dog.dogId} dog={dog} index={index} />
          ))}
        </View>
      )}
    </View>
  );
}

// Figma "Card / Home compact friend" (22:12982). The dog itself is the app's own dot
// placeholder sprite (same one ChatScreen draws) — the Figma sample PNGs are
// illustrations of two specific dogs, not this saved dog.
function FriendCard({ dog, index }: { dog: SavedDog; index: number }) {
  const dogSheet = useImage(dogWalkAtlas);
  const [trait, setTrait] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDog(dog.dogId).then(
      ({ data }) => !cancelled && setTrait(data.traitLabels[0] ?? null),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [dog.dogId]);

  return (
    <View style={styles.card}>
      <View style={[styles.scene, { backgroundColor: SCENE_COLORS[index % SCENE_COLORS.length] }]}>
        <HomeSvg name="starSmall" width={6} height={6} style={styles.starA} />
        <HomeSvg name="starSmall" width={6} height={6} style={styles.starB} />
        <HomeSvg name="dogShadow" width={76} height={7} style={styles.dogShadow} />
        <Canvas style={styles.dogCanvas}>
          {dogSheet && (
            <SpriteFrame sheet={dogSheet} frameSize={DOG_FRAME_SIZE} col={0} row={dogIdleRow(index)} x={0} y={0} size={50} />
          )}
        </Canvas>
        <HomeSvg name="heartBadge" width={13} height={13} style={styles.heartBadge} />
      </View>
      <View style={styles.nameRow}>
        <Text style={styles.cardName} numberOfLines={1}>
          {dog.dogName}
        </Text>
        <Text style={styles.cardShelter} numberOfLines={1}>
          {dog.shelterName}
        </Text>
      </View>
      {trait && (
        <Text style={styles.cardTrait} numberOfLines={1}>
          {trait}
        </Text>
      )}
      <HomeSvg name="chevronFriend" width={15} height={15} style={styles.cardChevron} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 19 },
  heading: { flexDirection: 'row', alignItems: 'center', height: 27, marginBottom: 2 },
  headingIcon: { marginLeft: 1, marginRight: 10 },
  headingText: { fontFamily: fonts.pixel, fontSize: 17, lineHeight: 24, color: '#626577' },
  countBadge: {
    height: 21,
    minWidth: 22,
    marginLeft: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ede5f0',
    borderRadius: 10,
  },
  countBadgeText: { fontFamily: fonts.pixel, fontSize: 11, lineHeight: 15, color: '#9b87ac' },
  seeAll: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4 },
  seeAllText: { fontFamily: fonts.body, fontSize: 10, lineHeight: 14, color: '#9b929d' },
  hintText: { fontFamily: fonts.body, fontSize: 12, color: '#a1998e', marginTop: 8 },
  row: { flexDirection: 'row', gap: 14 },
  card: {
    flex: 1,
    height: 113,
    backgroundColor: '#fffdf7',
    borderWidth: 1,
    borderColor: '#e3d9ca',
    borderRadius: 15,
    shadowColor: '#495e70',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 3 },
  },
  scene: { position: 'absolute', top: 8, left: 8, right: 8, height: 60, borderRadius: 10, overflow: 'hidden' },
  starA: { position: 'absolute', left: 12, top: 14 },
  starB: { position: 'absolute', right: 25, top: 43 },
  dogShadow: { position: 'absolute', left: '50%', marginLeft: -38, top: 48 },
  dogCanvas: { position: 'absolute', left: '50%', marginLeft: -25, top: 4, width: 50, height: 50 },
  heartBadge: { position: 'absolute', right: 11, top: 6 },
  nameRow: { position: 'absolute', left: 13, right: 28, top: 74, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  cardName: { fontFamily: fonts.pixel, fontSize: 14, lineHeight: 20, color: '#77717b', flexShrink: 0 },
  cardShelter: { flex: 1, fontFamily: fonts.body, fontSize: 9, lineHeight: 13, color: '#a19596', paddingBottom: 3 },
  cardTrait: { position: 'absolute', left: 13, right: 28, top: 94, fontFamily: fonts.body, fontSize: 9.5, lineHeight: 13, color: '#a1998e' },
  cardChevron: { position: 'absolute', right: 8, top: 96 },
});
