import PrimaryButton from '@/components/primary-button';
import { router } from 'expo-router';
import {
    useEffect,
    useRef,
} from 'react';
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


const DEMO_OVERALL_ITEMS = [
  'The Shawshank Redemption',
  'The Godfather',
  'Fight Club',
];

const DEMO_TOPICS = [
  'Horror',
  'Comedy',
  'Sci-Fi',
  'Action',
  'Drama',
];


export default function OnboardingOverallTop3Screen() {
  const titleOpacity =
    useRef(new Animated.Value(0)).current;
  const subtitleOpacity =
    useRef(new Animated.Value(0)).current;
  const cardOpacity =
    useRef(new Animated.Value(0)).current;
  const cardScale =
    useRef(new Animated.Value(0.975)).current;
  const topicsOpacity =
    useRef(new Animated.Value(0)).current;


  useEffect(() => {
    Animated.sequence([
      Animated.delay(140),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(70),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(70),
      Animated.timing(topicsOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    cardOpacity,
    cardScale,
    subtitleOpacity,
    titleOpacity,
    topicsOpacity,
  ]);


  function continueOnboarding() {
    router.replace(
      '/onboarding-taste-match'
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>
          Top 3
        </Text>


        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
            },
          ]}>
          See what rises to the top.
        </Animated.Text>


        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
            },
          ]}>
          Every Top 3 helps shape the community rankings.
        </Animated.Text>


        <Animated.View
          style={[
            styles.overallCard,
            {
              opacity: cardOpacity,
              transform: [
                {
                  scale: cardScale,
                },
              ],
            },
          ]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardEyebrow}>
              OVERALL TOP 3
            </Text>

            <Text style={styles.cardTitle}>
              🎬 Movies
            </Text>
          </View>


          <View style={styles.rankingList}>
            {DEMO_OVERALL_ITEMS.map(
              (item, index) => (
                <View
                  key={item}
                  style={[
                    styles.rankingRow,
                    index <
                      DEMO_OVERALL_ITEMS.length - 1 &&
                      styles.rankingRowBorder,
                  ]}>
                  <Text style={styles.rank}>
                    {index + 1}
                  </Text>

                  <Text
                    style={styles.itemTitle}
                    numberOfLines={1}>
                    {item}
                  </Text>
                </View>
              )
            )}
          </View>


          <Text style={styles.contributionText}>
            Your picks help shape what appears here.
          </Text>
        </Animated.View>


        <Animated.View
          style={[
            styles.topicsSection,
            {
              opacity: topicsOpacity,
            },
          ]}>
          <Text style={styles.topicsLabel}>
            Explore rankings by category and genre
          </Text>

          <View style={styles.topicChips}>
            {DEMO_TOPICS.map((topic) => (
              <View
                key={topic}
                style={styles.topicChip}>
                <Text style={styles.topicChipText}>
                  {topic}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>


      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Continue"
          onPress={continueOnboarding}
        />
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },


  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },


  brand: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#222222',
    textAlign: 'center',
  },


  title: {
    marginTop: 12,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },


  subtitle: {
    marginTop: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    lineHeight: 24,
    color: '#777777',
    textAlign: 'center',
  },


  overallCard: {
    width: '100%',
    marginTop: 30,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDDDDD',
  },


  cardHeader: {
    alignItems: 'center',
  },


  cardEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#999999',
  },


  cardTitle: {
    marginTop: 6,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#222222',
  },


  rankingList: {
    marginTop: 18,
  },


  rankingRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },


  rankingRowBorder: {
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },


  rank: {
    width: 34,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },


  itemTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#222222',
  },


  contributionText: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
    color: '#777777',
    textAlign: 'center',
  },


  topicsSection: {
    marginTop: 24,
    alignItems: 'center',
  },


  topicsLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#555555',
    textAlign: 'center',
  },


  topicChips: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },


  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#EEEEEE',
  },


  topicChipText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: '#555555',
  },


  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },
});