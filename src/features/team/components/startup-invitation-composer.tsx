import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppInput, AppText } from '@shared/components';

import { useCreateStartupInvitation, useStartupInvitationOptions } from '../hooks/use-team';
import type { TeamInviteCommitment } from '../types/team.types';

const EQUITY_THUMB_SIZE = 24;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clampSteppedValue(value: number, min: number, max: number, step: number) {
  const clampedValue = Math.min(max, Math.max(min, value));
  const steppedValue = min + Math.round((clampedValue - min) / step) * step;

  return Math.min(max, Math.max(min, steppedValue));
}

function EquitySlider({
  disabled = false,
  max,
  min,
  onChange,
  step,
  value,
}: {
  disabled?: boolean;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  const nextValue = clampSteppedValue(value, min, max, step);
  const trackRef = React.useRef<View>(null);
  const trackPageXRef = React.useRef(0);
  const trackWidthRef = React.useRef(0);
  const draggingRef = React.useRef(false);
  const draftValueRef = React.useRef(nextValue);
  const [trackWidth, setTrackWidth] = React.useState(0);
  const [draftValue, setDraftValue] = React.useState(nextValue);

  React.useEffect(() => {
    if (draggingRef.current) {
      return;
    }

    draftValueRef.current = nextValue;
    setDraftValue(nextValue);
  }, [nextValue]);

  const progress = (draftValue - min) / Math.max(max - min, 1);
  const thumbOffset = Math.min(
    Math.max(progress * trackWidth - EQUITY_THUMB_SIZE / 2, 0),
    Math.max(trackWidth - EQUITY_THUMB_SIZE, 0)
  );

  const syncTrackMetrics = React.useCallback(() => {
    trackRef.current?.measureInWindow((pageX, _pageY, measuredWidth) => {
      trackPageXRef.current = pageX;
      trackWidthRef.current = measuredWidth;
      setTrackWidth((current) => (current === measuredWidth ? current : measuredWidth));
    });
  }, []);

  const handleTrackLayout = React.useCallback((event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;

    trackWidthRef.current = measuredWidth;
    setTrackWidth(measuredWidth);
    requestAnimationFrame(syncTrackMetrics);
  }, [syncTrackMetrics]);

  const setDraftValueFromPosition = React.useCallback(
    (positionX: number) => {
      const measuredTrackWidth = trackWidthRef.current;

      if (measuredTrackWidth <= 0) {
        return;
      }

      const clampedX = Math.min(measuredTrackWidth, Math.max(0, positionX));
      const rawValue = min + (clampedX / measuredTrackWidth) * (max - min);
      const clampedValue = clampSteppedValue(rawValue, min, max, step);

      if (draftValueRef.current === clampedValue) {
        return;
      }

      draftValueRef.current = clampedValue;
      setDraftValue(clampedValue);
    },
    [max, min, step]
  );

  const updateValueFromPageX = React.useCallback(
    (pageX: number, locationX: number) => {
      const measuredPageX = trackPageXRef.current;

      if (measuredPageX > 0) {
        setDraftValueFromPosition(pageX - measuredPageX);
        return;
      }

      setDraftValueFromPosition(locationX);
    },
    [setDraftValueFromPosition]
  );

  const commitDraftValue = React.useCallback(() => {
    draggingRef.current = false;

    if (draftValueRef.current !== nextValue) {
      onChange(draftValueRef.current);
    }
  }, [nextValue, onChange]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          !disabled && Math.abs(gestureState.dx) >= Math.abs(gestureState.dy),
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          !disabled && Math.abs(gestureState.dx) >= Math.abs(gestureState.dy),
        onPanResponderGrant: (event) => {
          if (disabled) {
            return;
          }

          draggingRef.current = true;
          syncTrackMetrics();
          updateValueFromPageX(event.nativeEvent.pageX, event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          if (disabled) {
            return;
          }

          updateValueFromPageX(event.nativeEvent.pageX, event.nativeEvent.locationX);
        },
        onPanResponderRelease: commitDraftValue,
        onPanResponderTerminate: commitDraftValue,
        onPanResponderTerminationRequest: () => false,
        onPanResponderReject: commitDraftValue,
        onStartShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponderCapture: () => !disabled,
      }),
    [commitDraftValue, disabled, syncTrackMetrics, updateValueFromPageX]
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <AppText tone="muted" variant="label">Equity Share</AppText>
        <AppText className="text-[#FF9A3E]" variant="bodyStrong">
          {draftValue}%
        </AppText>
      </View>
      <View className="gap-2">
        <View
          ref={trackRef}
          className="justify-center"
          onLayout={handleTrackLayout}
          {...panResponder.panHandlers}
          style={{ height: 30 }}>
          <View className="absolute inset-x-0 top-3 h-1.5 rounded-full bg-[#15171C]" />
          <View
            className="absolute left-0 top-3 h-1.5 rounded-full"
            style={{
              backgroundColor: disabled ? '#667085' : '#FF9A3E',
              width: `${progress * 100}%`,
            }}
          />
          <View
            style={{
              backgroundColor: disabled ? '#98A2B3' : '#FF9A3E',
              borderColor: '#2C2C2C',
              borderRadius: 999,
              borderWidth: 4,
              height: EQUITY_THUMB_SIZE,
              left: thumbOffset,
              position: 'absolute',
              top: 3,
              width: EQUITY_THUMB_SIZE,
            }}
          />
        </View>
        <View className="flex-row items-center justify-between px-0.5">
          <AppText className="text-[12px]" tone="muted">{min}%</AppText>
          <AppText className="text-[12px]" tone="muted">{max}%</AppText>
        </View>
      </View>
    </View>
  );
}

export function StartupInvitationComposer({
  initialEmail = '',
  onClose,
  onSuccess,
  recipientName,
  visible,
}: {
  initialEmail?: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  recipientName?: string;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const createInvitationMutation = useCreateStartupInvitation();
  const invitationOptionsQuery = useStartupInvitationOptions(visible);
  const invitationOptions = invitationOptionsQuery.data?.data;
  const roleOptions = invitationOptions?.roleOptions ?? [];
  const commitmentOptions = invitationOptions?.commitmentOptions ?? [];
  const equityOptions = invitationOptions?.equity ?? {
    defaultValue: 15,
    max: 50,
    min: 1,
    step: 1,
  };
  const [email, setEmail] = React.useState(initialEmail);
  const [roleId, setRoleId] = React.useState<string | null>(null);
  const [equityPercent, setEquityPercent] = React.useState(equityOptions.defaultValue);
  const [commitment, setCommitment] = React.useState<TeamInviteCommitment | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    setEmail(initialEmail);
    setError(null);
  }, [initialEmail, visible]);

  React.useEffect(() => {
    if (!visible || !invitationOptions) {
      return;
    }

    setRoleId((currentValue) => currentValue ?? invitationOptions.roleOptions[0]?.id ?? null);
    setCommitment((currentValue) => currentValue ?? invitationOptions.commitmentOptions[0]?.id ?? null);
    setEquityPercent((currentValue) =>
      clampSteppedValue(
        currentValue || invitationOptions.equity.defaultValue,
        invitationOptions.equity.min,
        invitationOptions.equity.max,
        invitationOptions.equity.step
      )
    );
  }, [invitationOptions, visible]);

  const closeAndReset = React.useCallback(() => {
    setEmail(initialEmail);
    setRoleId(null);
    setEquityPercent(equityOptions.defaultValue);
    setCommitment(null);
    setError(null);
    onClose();
  }, [equityOptions.defaultValue, initialEmail, onClose]);

  const canSubmit =
    isValidEmail(email.trim().toLowerCase()) &&
    Boolean(roleId) &&
    Boolean(commitment) &&
    !createInvitationMutation.isPending &&
    !invitationOptionsQuery.isPending;

  const handleSubmit = React.useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!roleId || !commitment) {
      setError('Choose a role and commitment level.');
      return;
    }

    setError(null);

    try {
      const response = await createInvitationMutation.mutateAsync({
        commitment,
        email: normalizedEmail,
        equityPercent,
        roleId,
      });

      onSuccess?.(response.message);
      closeAndReset();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to send team invitation.');
    }
  }, [closeAndReset, commitment, createInvitationMutation, email, equityPercent, onSuccess, roleId]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={closeAndReset}>
      <Pressable className="flex-1" onPress={closeAndReset} />
      <View
        style={{
          backgroundColor: '#2C2C2C',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '85%',
        }}>
        {/* Drag handle */}
        <View className="items-center pb-2 pt-3">
          <View className="h-[5px] w-10 rounded-full bg-[#555]" />
        </View>
        <ScrollView
          bounces={false}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom + 20, 32),
            paddingHorizontal: 20,
            paddingTop: 4,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="gap-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1">
                <AppText variant="subtitle">
                  {recipientName ? `Add ${recipientName}` : 'Add to Team'}
                </AppText>
                <AppText tone="muted">
                  Assign role, equity, and commitment before sending the invitation.
                </AppText>
              </View>
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full bg-[#3A3A3C]"
                onPress={closeAndReset}>
                <Ionicons color="#98A2B3" name="close" size={20} />
              </Pressable>
            </View>

            <AppInput
              autoCapitalize="none"
              autoCorrect={false}
              className="border-none bg-[#3A3A3C]"
              keyboardType="email-address"
              label="Email"
              onChangeText={(value) => {
                setEmail(value);
                setError(null);
              }}
              placeholder="person@example.com"
              value={email}
            />

            <View className="gap-3">
              <AppText tone="muted" variant="label">Assign Role</AppText>
              {invitationOptionsQuery.isPending ? (
                <View className="flex-row items-center gap-2 rounded-[16px] border border-white/10 bg-[#343434] px-4 py-3">
                  <ActivityIndicator color="#FF9A3E" size="small" />
                  <AppText tone="muted">Loading roles...</AppText>
                </View>
              ) : null}
              {invitationOptionsQuery.isError ? (
                <View className="rounded-[16px] border border-danger/30 bg-danger-tint px-4 py-3">
                  <AppText tone="danger">Unable to load invitation options right now.</AppText>
                </View>
              ) : null}
              <View className="flex-row flex-wrap gap-2">
                {roleOptions.map((role) => {
                  const isSelected = roleId === role.id;

                  return (
                    <Pressable
                      key={role.id}
                      className="rounded-full border px-4 py-2"
                      onPress={() => {
                        setRoleId(role.id);
                        setError(null);
                      }}
                      style={{
                        backgroundColor: isSelected ? '#3B2A1C' : '#343434',
                        borderColor: isSelected ? '#FF9A3E' : 'rgba(255, 255, 255, 0.1)',
                      }}>
                      <AppText
                        className="text-[13px]"
                        style={{ color: isSelected ? '#FF9A3E' : '#98A2B3' }}
                        variant="bodyStrong">
                        {role.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <EquitySlider
              disabled={createInvitationMutation.isPending || invitationOptionsQuery.isPending}
              max={equityOptions.max}
              min={equityOptions.min}
              onChange={setEquityPercent}
              step={equityOptions.step}
              value={equityPercent}
            />

            <View className="gap-3">
              <AppText tone="muted" variant="label">Commitment</AppText>
              <View className="flex-row gap-2">
                {commitmentOptions.map((item) => {
                  const isSelected = commitment === item.id;

                  return (
                    <Pressable
                      key={item.id}
                      className="min-h-12 flex-1 items-center justify-center rounded-[16px] border px-3 py-3"
                      onPress={() => {
                        setCommitment(item.id);
                        setError(null);
                      }}
                      style={{
                        backgroundColor: isSelected ? '#3B2A1C' : '#343434',
                        borderColor: isSelected ? '#FF9A3E' : 'rgba(255, 255, 255, 0.1)',
                      }}>
                      <AppText
                        className="text-[13px]"
                        style={{ color: isSelected ? '#FF9A3E' : '#98A2B3' }}
                        variant="bodyStrong">
                        {item.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {error ? (
              <View className="rounded-[16px] border border-danger/30 bg-danger-tint px-4 py-3">
                <AppText tone="danger">{error}</AppText>
              </View>
            ) : null}

            <View className="flex-row gap-3">
              <Pressable
                className="min-h-12 flex-1 items-center justify-center rounded-[16px] border border-white/10 bg-[#3A3A3C] px-4 py-3"
                disabled={createInvitationMutation.isPending}
                onPress={closeAndReset}>
                <AppText variant="bodyStrong">Cancel</AppText>
              </Pressable>
              <Pressable
                className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-[#FF9A3E] px-3 py-3"
                disabled={!canSubmit}
                onPress={() => {
                  void handleSubmit();
                }}
                style={{ opacity: canSubmit ? 1 : 0.55 }}>
                {createInvitationMutation.isPending ? (
                  <ActivityIndicator color="#11131A" size="small" />
                ) : (
                  <Ionicons color="#11131A" name="person-add-outline" size={16} />
                )}
                <AppText
                  align="center"
                  className="flex-1 text-[12px] leading-[14px] text-[#11131A]"
                  numberOfLines={2}
                  variant="bodyStrong">
                  {createInvitationMutation.isPending ? 'Sending...' : 'Confirm Add to Team'}
                </AppText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
