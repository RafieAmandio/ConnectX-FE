import React from 'react';
import { ScrollView, View } from 'react-native';

import { AppCard, AppListItem, AppPill, AppText } from '@shared/components';

type AuthShellProps = React.PropsWithChildren<{
  description?: string;
  footer?: React.ReactNode;
  highlights?: readonly {
    description: string;
    title: string;
  }[];
  pill: string;
  title: string;
}>;

export function AuthShell({
  children,
  description,
  footer,
  highlights,
  pill,
  title,
}: AuthShellProps) {
  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-6 pb-24"
      contentInsetAdjustmentBehavior="automatic">

      <View className="gap-4 px-5">
        <View className="gap-3">
          <AppPill className="self-start" label={pill} tone="accent" />
          <AppText variant="display">{title}</AppText>
          {description ? <AppText tone="muted">{description}</AppText> : null}
        </View>

        {highlights && highlights.length > 0 ? (
          <AppCard tone="muted" className="gap-3 border-accent/15">
            {highlights.map((item) => (
              <AppListItem
                key={item.title}
                description={item.description}
                leading={<AppText tone="accent" variant="bodyStrong">{item.title.slice(0, 2)}</AppText>}
                title={item.title}
              />
            ))}
          </AppCard>
        ) : null}
      </View>

      <AppCard className="mx-5 gap-4 p-5">{children}</AppCard>

      {footer ? <View className="gap-4 px-5">{footer}</View> : null}
    </ScrollView>
  );
}
