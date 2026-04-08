import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

import { AppText } from './app-text';

const ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  index: 'home',
  matches: 'favorite',
  products: 'shopping-bag',
  chat: 'chat',
  team: 'groups',
  profile: 'account-circle',
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
  const iconName = ICONS[route.name] || 'circle';
  const label =
    options.tabBarLabel !== undefined
      ? options.tabBarLabel
      : options.title !== undefined
      ? options.title
      : route.name;

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(isFocused ? 1.15 : 1, { damping: 12, stiffness: 200 }) },
        { translateY: withTiming(isFocused ? -2 : 0, { duration: 150 }) },
      ],
    };
  });

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isFocused ? 1 : 0, { duration: 150 }),
      transform: [{ scale: withSpring(isFocused ? 1 : 0, { damping: 15, stiffness: 200 }) }],
    };
  });

  return (
    <Pressable onPress={onPress} className="flex-1 items-center justify-center gap-1.5 pt-2">
      <Animated.View style={animatedIconStyle} className="items-center justify-center">
        <MaterialIcons name={iconName} size={24} color={isFocused ? '#f5f7fa' : '#667085'} />
        <Animated.View
          style={animatedIndicatorStyle}
          className="absolute -bottom-4 h-1 w-1 rounded-full bg-accent"
        />
      </Animated.View>
      <AppText
        variant="label"
        style={{
          color: isFocused ? '#f5f7fa' : '#667085',
          fontSize: 10,
          fontWeight: isFocused ? '600' : '500',
        }}>
        {String(label)}
      </AppText>
    </Pressable>
  );
}

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-between border-t border-border bg-canvas px-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12), paddingTop: 8 }}>
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
