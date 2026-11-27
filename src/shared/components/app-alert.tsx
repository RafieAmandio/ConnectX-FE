import React from 'react';
import { Modal, Pressable, View } from 'react-native';

import { useTranslation } from '@shared/localization';

import { AppButton } from './app-button';
import { AppText } from './app-text';

// Same shape as React Native's Alert.alert, drawn in the app theme instead of the
// white system dialog. <AppAlertHost /> is mounted once in app/_layout.tsx.
export type AppAlertButton = {
  onPress?: () => void;
  style?: 'cancel' | 'default' | 'destructive';
  text?: string;
};

type AlertRequest = { buttons: AppAlertButton[]; message?: string; title: string };

const queue: AlertRequest[] = [];
const listeners = new Set<() => void>();

export function showAlert(title: string, message?: string, buttons?: AppAlertButton[]) {
  queue.push({ buttons: buttons?.length ? buttons : [{ text: undefined }], message, title });
  listeners.forEach((listener) => listener());
}

export function AppAlertHost() {
  const t = useTranslation();
  const [current, setCurrent] = React.useState<AlertRequest | null>(null);

  React.useEffect(() => {
    const next = () => setCurrent((shown) => shown ?? queue.shift() ?? null);
    listeners.add(next);
    next();
    return () => {
      listeners.delete(next);
    };
  }, []);

  const close = (button?: AppAlertButton) => {
    setCurrent(queue.shift() ?? null);
    button?.onPress?.();
  };

  if (!current) {
    return null;
  }

  const cancelButton = current.buttons.find((button) => button.style === 'cancel');
  const stacked = current.buttons.length > 2;

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => close(cancelButton)}
      statusBarTranslucent
      transparent
      visible>
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(10, 10, 14, 0.6)' }}>
        <Pressable className="absolute inset-0" onPress={cancelButton ? () => close(cancelButton) : undefined} />
        <View className="w-full max-w-[400px] gap-3 rounded-[24px] border border-border bg-surface-raised p-5">
          <AppText className="text-[19px] text-white" variant="title">
            {current.title}
          </AppText>
          {current.message ? (
            <AppText className="text-[14px] leading-5" tone="muted">
              {current.message}
            </AppText>
          ) : null}
          <View className={stacked ? 'mt-2 gap-2' : 'mt-2 flex-row gap-3'}>
            {current.buttons.map((button, index) => (
              <AppButton
                className={stacked ? undefined : 'flex-1'}
                key={`${button.text ?? 'ok'}-${index}`}
                label={button.text ?? t('common.ok')}
                onPress={() => close(button)}
                variant={
                  button.style === 'destructive' ? 'danger' : button.style === 'cancel' ? 'secondary' : 'primary'
                }
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
