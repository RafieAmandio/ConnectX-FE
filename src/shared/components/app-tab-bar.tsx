import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './app-text';

const ACTIVE_COLOR = '#f59e0b'; // Signal/Orange color from design
const INACTIVE_COLOR = '#667085';
const TAB_BAR_BG = '#232323';

const ICONS: Record<string, { outline: keyof typeof Ionicons.glyphMap; solid: keyof typeof Ionicons.glyphMap }> = {
  index: { outline: 'home-outline', solid: 'home' },
  matches: { outline: 'heart-outline', solid: 'heart' },
  chat: { outline: 'chatbubble-outline', solid: 'chatbubble' },
  team: { outline: 'people-outline', solid: 'people' },
  profile: { outline: 'person-outline', solid: 'person' },
};

function TabBarItem({
  route,
  options,
  isFocused,
  onPress,
}: {
  route: any;
  options: any;
  isFocused: boolean;
  onPress: () => void;
}) {
  const iconConfig = ICONS[route.name] || { outline: 'ellipse-outline', solid: 'ellipse' };
  const iconName = isFocused ? iconConfig.solid : iconConfig.outline;
  const label =
    options.tabBarLabel !== undefined
      ? options.tabBarLabel
      : options.title !== undefined
        ? options.title
        : route.name;

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(isFocused ? 1.1 : 1, { damping: 12, stiffness: 200 }) },
      ],
      opacity: withTiming(isFocused ? 1 : 0.8, { duration: 200 }),
    };
  });

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isFocused ? 1 : 0, { duration: 150 }),
      transform: [{ scale: withSpring(isFocused ? 1 : 0, { damping: 15, stiffness: 200 }) }],
    };
  });

  return (
    <Pressable onPress={onPress} className="flex-1 items-center justify-center gap-1 pt-2">
      <Animated.View style={animatedIconStyle} className="items-center justify-center">
        <Ionicons name={iconName} size={24} color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR} />
      </Animated.View>
      <AppText
        variant="label"
        style={{
          color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR,
          fontSize: 10,
          fontWeight: isFocused ? '600' : '500',
        }}>
        {String(label)}
      </AppText>
      <Animated.View
        className="h-1 w-1 rounded-full"
        style={[{ backgroundColor: ACTIVE_COLOR }, animatedIndicatorStyle]}
      />
    </Pressable>
  );
}

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-between border-t border-border px-2"
      style={{ backgroundColor: TAB_BAR_BG, paddingBottom: Math.max(insets.bottom, 12), paddingTop: 8 }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        // Expo Router hides tabs by setting href to null, which may expose it here or omit from routes entirely
        // Usually, routes with href null are removed from state.routes in Expo Router ^3, 
        // but adding a safeguard manually in case options.href is exposed.
        if ((options as any).href === null) {
          return null;
        }

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <TabBarItem
            key={route.key}
            isFocused={isFocused}
            options={options}
            onPress={onPress}
            route={route}
          />
        );
      })}
    </View>
  );
}
