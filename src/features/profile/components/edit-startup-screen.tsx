import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDiscoveryFilterOptions } from '@features/home/hooks/use-discovery';
import { AppCard, AppText } from '@shared/components';
import { cn } from '@shared/utils/cn';

import { useMyProfile, useUpdateStartupProfile, useUploadProfileImage } from '../hooks/use-profile';
import type {
  MyProfileData,
  ProfileStartupRawData,
  ProfileStartupRawOpenRole,
  UpdateStartupProfileRequest,
} from '../types/profile.types';

const palette = {
  accent: '#FF9A3E',
  accentSoft: '#2A2117',
  canvas: '#262626',
  field: '#292929',
  selected: '#1F1712',
  border: '#383838',
  borderSoft: 'rgba(255, 255, 255, 0.08)',
  text: '#FFFFFF',
  textMuted: '#98A2B3',
  textSoft: '#8F8F8F',
  buttonText: '#1A1208',
  danger: '#FF5A67',
};

const STAGE_OPTIONS = [
  { value: 'idea', label: 'Idea' },
  { value: 'mvp', label: 'MVP' },
  { value: 'live', label: 'Live' },
  { value: 'scale', label: 'Scale' },
];

const COMMITMENT_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
];

const EQUITY_OPTIONS = [
  { value: 'equity_only', label: 'Equity only' },
  { value: 'equity_and_salary', label: 'Equity + Salary' },
];

type FormState = {
  name: string;
  tagline: string;
  description: string;
  stage: string;
  industry: string;
  logo_url: string;
  secondary_industry: string;
  team_size: string;
  open_roles: string[];
  user_count: string;
  mau: string;
  revenue: string;
  website: string;
  prototype_url: string;
  linkedin: string;
  commitment: string;
  equity: string;
  paid: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

type FlatOption = { id: string; label: string };

function getOpenRoleValue(role: ProfileStartupRawOpenRole): string {
  if (typeof role === 'string') return role;
  return role.id ?? role.value ?? role.title ?? '';
}

function buildInitialFormState(
  startup?: MyProfileData['startup'],
  startupRaw?: ProfileStartupRawData
): FormState {
  return {
    name: startup?.name ?? '',
    tagline: startup?.tagline ?? '',
    description: startupRaw?.description ?? '',
    stage: startup?.stage.value ?? 'idea',
    industry: startup?.industries[0]?.id ?? '',
    logo_url: startupRaw?.logoUrl ?? '',
    secondary_industry: startup?.industries[1]?.id ?? '',
    team_size: startupRaw?.teamSize == null ? '' : String(startupRaw.teamSize),
    open_roles: startupRaw?.openRoles?.map(getOpenRoleValue).filter(Boolean) ?? [],
    user_count: getStageDetailValue(startup, 'q_user_count'),
    mau: getStageDetailValue(startup, 'q_mau'),
    revenue: getStageDetailValue(startup, 'q_mvp_revenue') || getStageDetailValue(startup, 'q_mrr') || getStageDetailValue(startup, 'q_arr'),
    website: getLinkUrl(startup, 'Website'),
    prototype_url: getLinkUrl(startup, 'Prototype') || getLinkUrl(startup, 'Pitch deck'),
    linkedin: getLinkUrl(startup, 'LinkedIn'),
    commitment: 'full_time',
    equity: 'equity_only',
    paid: false,
  };
}

function getStageDetailValue(startup: MyProfileData['startup'], detailId: string): string {
  const detail = startup?.stage.details?.find((d) => d.id === detailId);
  if (detail?.value == null) return '';
  return String(detail.value);
}

function getLinkUrl(startup: MyProfileData['startup'], labelMatch: string): string {
  const link = startup?.links?.find((l) =>
    l.label.toLowerCase().includes(labelMatch.toLowerCase())
  );
  return link?.url ?? '';
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Startup name is required.';
  if (form.name.trim().length > 80) errors.name = 'Name must be 80 characters or fewer.';
  if (form.tagline.trim().length > 120) errors.tagline = 'Tagline must be 120 characters or fewer.';
  return errors;
}

function flattenGroups(groups: { id: string; label: string; options: FlatOption[] }[]): FlatOption[] {
  return groups.flatMap((g) => g.options);
}

type StartupInputProps = TextInputProps & {
  className?: string;
  error?: string;
  label?: string;
  shellClassName?: string;
};

function StartupInput({
  className,
  error,
  label,
  placeholderTextColor = palette.textSoft,
  shellClassName,
  style,
  ...props
}: StartupInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View className={cn('gap-2', shellClassName)}>
      {label ? (
        <AppText
          style={{ color: isFocused ? palette.accent : palette.textMuted }}
          variant="label">
          {label}
        </AppText>
      ) : null}
      <TextInput
        className={cn(
          'min-h-14 rounded-[16px] border py-3 pl-3 pr-4 font-body text-[15px]',
          className
        )}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        placeholderTextColor={placeholderTextColor}
        style={[
          {
            backgroundColor: palette.field,
            borderColor: isFocused ? palette.accent : palette.border,
            color: palette.text,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <AppText className="text-[12px]" tone="danger" variant="code">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function ChipSelector({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View className="gap-2">
      <AppText style={{ color: palette.textMuted }} variant="label">
        {label}
      </AppText>
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              className="rounded-[14px] border px-4 py-3"
              onPress={() => onChange(opt.value)}
              style={{
                backgroundColor: isActive ? palette.selected : palette.field,
                borderColor: isActive ? palette.accent : palette.border,
              }}>
              <AppText
                className="text-[13px]"
                style={{ color: isActive ? palette.accent : palette.textMuted }}
                variant="bodyStrong">
                {opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DropdownSelector({
  error,
  label,
  options,
  placeholder,
  searchable,
  value,
  onChange,
}: {
  error?: string;
  label: string;
  options: FlatOption[];
  placeholder: string;
  searchable?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const selectedLabel = options.find((o) => o.id === value)?.label ?? '';

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <View className="gap-2">
      <AppText style={{ color: palette.textMuted }} variant="label">
        {label}
      </AppText>
      <Pressable
        className="min-h-14 flex-row items-center justify-between rounded-[16px] border px-3 py-3"
        onPress={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: palette.field, borderColor: isOpen ? palette.accent : palette.border }}>
        <AppText
          className="flex-1 text-[15px]"
          style={{ color: selectedLabel ? palette.text : palette.textSoft }}>
          {selectedLabel || placeholder}
        </AppText>
        <Ionicons color={palette.textMuted} name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} />
      </Pressable>

      {isOpen ? (
        <View
          className="rounded-[16px] border"
          style={{ backgroundColor: palette.field, borderColor: palette.border, maxHeight: 240 }}>
          {searchable ? (
            <TextInput
              autoFocus
              className="border-b px-3 py-3 text-[14px]"
              onChangeText={setSearch}
              placeholder="Search..."
              placeholderTextColor={palette.textSoft}
              style={{ borderBottomColor: palette.border, color: palette.text }}
              value={search}
            />
          ) : null}
          <ScrollView nestedScrollEnabled>
            {filtered.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <Pressable
                  key={opt.id}
                  className="flex-row items-center gap-3 px-3 py-3"
                  onPress={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  style={{ backgroundColor: isSelected ? palette.selected : 'transparent' }}>
                  <AppText
                    className="flex-1 text-[14px]"
                    style={{ color: isSelected ? palette.accent : palette.text }}>
                    {opt.label}
                  </AppText>
                  {isSelected ? <Ionicons color={palette.accent} name="checkmark" size={16} /> : null}
                </Pressable>
              );
            })}
            {filtered.length === 0 ? (
              <View className="items-center py-4">
                <AppText className="text-[13px]" tone="muted">No results</AppText>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      {error ? (
        <AppText className="text-[12px]" tone="danger" variant="code">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function SearchableMultiSelectDropdown({
  label,
  options,
  placeholder,
  selected,
  onChange,
}: {
  label: string;
  options: FlatOption[];
  placeholder: string;
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const filtered = search.trim()
    ? options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <View className="gap-2">
      <AppText style={{ color: palette.textMuted }} variant="label">
        {label}
      </AppText>
      <Pressable
        className="min-h-14 flex-row items-center justify-between rounded-[16px] border px-3 py-3"
        onPress={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: palette.field, borderColor: isOpen ? palette.accent : palette.border }}>
        <AppText
          className="flex-1 text-[15px]"
          style={{ color: selected.length ? palette.text : palette.textSoft }}>
          {selected.length ? `${selected.length} role${selected.length === 1 ? '' : 's'} selected` : placeholder}
        </AppText>
        <Ionicons color={palette.textMuted} name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} />
      </Pressable>

      {isOpen ? (
        <View
          className="rounded-[16px] border"
          style={{ backgroundColor: palette.field, borderColor: palette.border, maxHeight: 280 }}>
          <TextInput
            autoFocus
            className="border-b px-3 py-3 text-[14px]"
            onChangeText={setSearch}
            placeholder="Search roles..."
            placeholderTextColor={palette.textSoft}
            style={{ borderBottomColor: palette.border, color: palette.text }}
            value={search}
          />
          <ScrollView nestedScrollEnabled>
            {filtered.map((option) => {
              const isSelected = selected.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  className="flex-row items-center gap-3 px-3 py-3"
                  onPress={() => toggle(option.id)}
                  style={{ backgroundColor: isSelected ? palette.selected : 'transparent' }}>
                  <AppText
                    className="flex-1 text-[14px]"
                    style={{ color: isSelected ? palette.accent : palette.text }}>
                    {option.label}
                  </AppText>
                  {isSelected ? <Ionicons color={palette.accent} name="checkmark" size={16} /> : null}
                </Pressable>
              );
            })}
            {filtered.length === 0 ? (
              <View className="items-center py-4">
                <AppText className="text-[13px]" tone="muted">No roles found</AppText>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      {selected.length ? (
        <View className="flex-row flex-wrap gap-2">
          {selected.map((id) => {
            const label = options.find((option) => option.id === id)?.label ?? id;
            return (
              <Pressable
                key={id}
                className="flex-row items-center gap-1.5 rounded-full border px-3 py-2"
                onPress={() => toggle(id)}
                style={{ backgroundColor: palette.selected, borderColor: palette.accent }}>
                <AppText className="text-[13px]" style={{ color: palette.accent }}>
                  {label}
                </AppText>
                <Ionicons color={palette.accent} name="close" size={15} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function EditStartupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const myProfileQuery = useMyProfile();
  const filterOptionsQuery = useDiscoveryFilterOptions('explore_startups');
  const updateMutation = useUpdateStartupProfile();
  const uploadLogoMutation = useUploadProfileImage();

  const startup = myProfileQuery.data?.data?.startup;
  const startupRaw = myProfileQuery.data?.data?.startupRaw;
  const hasHydratedStartup = React.useRef(Boolean(startup));
  const [formState, setFormState] = React.useState<FormState>(() =>
    buildInitialFormState(startup, startupRaw)
  );
  const [formErrors, setFormErrors] = React.useState<FormErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (startup && !hasHydratedStartup.current) {
      setFormState(buildInitialFormState(startup, startupRaw));
      hasHydratedStartup.current = true;
    }
  }, [startup, startupRaw]);

  const industryOptions = React.useMemo(
    () => flattenGroups(filterOptionsQuery.data?.data?.industries ?? []),
    [filterOptionsQuery.data]
  );

  const roleOptions = React.useMemo(
    () => flattenGroups(filterOptionsQuery.data?.data?.roles ?? []),
    [filterOptionsQuery.data]
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) {
      setFormErrors((prev) => ({ ...prev, [key]: undefined }));
    }
    setSubmitError(null);
  }

  async function handlePickLogo() {
    if (uploadLogoMutation.isPending || updateMutation.isPending) {
      return;
    }

    setSubmitError(null);

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      allowsMultipleSelection: false,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: 1,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      setSubmitError('The selected image could not be read.');
      return;
    }

    try {
      const uploadedImage = await uploadLogoMutation.mutateAsync({
        fileName: asset.fileName ?? null,
        mimeType: asset.mimeType ?? null,
        uri: asset.uri,
      });

      updateField('logo_url', uploadedImage.url);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to upload this logo right now.');
    }
  }

  async function handleSave() {
    const errors = validateForm(formState);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitError(null);

    const payload: UpdateStartupProfileRequest = {
      name: formState.name.trim(),
      tagline: formState.tagline.trim() || undefined,
      description: formState.description.trim() || undefined,
      stage: formState.stage || undefined,
      industry: formState.industry || undefined,
      logo_url: formState.logo_url.trim() || undefined,
      secondary_industry: formState.secondary_industry || undefined,
      team_size: formState.team_size ? Number(formState.team_size) : undefined,
      open_roles: formState.open_roles.length > 0 ? formState.open_roles : undefined,
      user_count: formState.user_count.trim() || undefined,
      mau: formState.mau.trim() || undefined,
      revenue: formState.revenue.trim() || undefined,
      website: formState.website.trim() || undefined,
      prototype_url: formState.prototype_url.trim() || undefined,
      linkedin: formState.linkedin.trim() || undefined,
      commitment: formState.commitment || undefined,
      equity: formState.equity || undefined,
      paid: formState.paid,
    };

    try {
      await updateMutation.mutateAsync(payload);
      router.back();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save startup changes.');
    }
  }

  const isOptionsLoading = filterOptionsQuery.isLoading;
  const isSaving = updateMutation.isPending || uploadLogoMutation.isPending;
  const logoUrl = formState.logo_url.trim() || null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={{ backgroundColor: palette.canvas }}>
        <View
          className="flex-row items-center justify-between border-b px-5 pb-4"
          style={{
            backgroundColor: palette.canvas,
            borderBottomColor: palette.border,
            paddingTop: Math.max(insets.top + 14, 24),
          }}>
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full border active:opacity-80"
            hitSlop={12}
            onPress={() => router.back()}
            style={{ backgroundColor: palette.field, borderColor: palette.border }}>
            <Ionicons color={palette.text} name="chevron-back" size={22} />
          </Pressable>

          <View className="min-w-0 flex-1 px-4">
            <AppText className="text-[21px]" numberOfLines={1} variant="title">
              Edit Startup
            </AppText>
            <AppText className="text-[13px]" numberOfLines={1} tone="muted">
              Update your startup profile details.
            </AppText>
          </View>

          {isSaving ? (
            <ActivityIndicator color={palette.accent} size="small" />
          ) : (
            <View className="h-11 w-11" />
          )}
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom + 28, 36),
            paddingHorizontal: 20,
            paddingTop: 20,
          }}>
          <AppCard
            className="gap-5"
            style={{ backgroundColor: palette.field, borderColor: palette.border }}>
            <View className="gap-1">
              <AppText variant="subtitle">Identity</AppText>
              <AppText className="text-[13px]" tone="muted">
                The basics people see about your startup.
              </AppText>
            </View>
            <View className="flex-row items-center gap-4">
              {logoUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: logoUrl }}
                  style={{
                    borderColor: palette.accent,
                    borderRadius: 18,
                    borderWidth: 2,
                    height: 76,
                    width: 76,
                  }}
                />
              ) : (
                <View
                  className="items-center justify-center rounded-[18px] border"
                  style={{
                    backgroundColor: palette.accentSoft,
                    borderColor: palette.accent,
                    height: 76,
                    width: 76,
                  }}>
                  <Ionicons color={palette.accent} name="business-outline" size={30} />
                </View>
              )}
              <View className="min-w-0 flex-1 gap-1">
                <AppText className="text-[15px]" variant="bodyStrong">Startup Logo</AppText>
                <AppText className="text-[13px] leading-5" tone="muted">
                  Use a square image for the clearest result.
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  className="mt-2 h-9 self-start flex-row items-center justify-center gap-2 rounded-[12px] border px-3"
                  disabled={isSaving}
                  onPress={() => void handlePickLogo()}
                  style={{
                    backgroundColor: palette.selected,
                    borderColor: palette.accent,
                    opacity: isSaving ? 0.7 : 1,
                  }}>
                  {uploadLogoMutation.isPending ? (
                    <ActivityIndicator color={palette.accent} size="small" />
                  ) : (
                    <Ionicons color={palette.accent} name="image-outline" size={16} />
                  )}
                  <AppText className="text-[12px]" style={{ color: palette.accent }} variant="bodyStrong">
                    {uploadLogoMutation.isPending ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </AppText>
                </Pressable>
              </View>
            </View>
            <StartupInput
              error={formErrors.name}
              label="Startup Name"
              onChangeText={(v) => updateField('name', v)}
              placeholder="Your startup name"
              value={formState.name}
            />
            <StartupInput
              error={formErrors.tagline}
              label="Tagline"
              onChangeText={(v) => updateField('tagline', v)}
              placeholder="One-liner about your startup"
              value={formState.tagline}
            />
            <StartupInput
              className="min-h-[120px] px-4 py-4 text-[15px]"
              label="Description"
              multiline
              onChangeText={(v) => updateField('description', v)}
              placeholder="Tell people more about your startup..."
              style={{ paddingHorizontal: 16, paddingVertical: 16 }}
              textAlignVertical="top"
              value={formState.description}
            />
            <ChipSelector
              label="Stage"
              onChange={(v) => updateField('stage', v)}
              options={STAGE_OPTIONS}
              value={formState.stage}
            />
          </AppCard>

          <AppCard
            className="mt-4 gap-5"
            style={{ backgroundColor: palette.field, borderColor: palette.border }}>
            <View className="gap-1">
              <AppText variant="subtitle">Industry</AppText>
              <AppText className="text-[13px]" tone="muted">
                Help matches understand your space.
              </AppText>
            </View>
            {isOptionsLoading ? (
              <View className="items-center py-6">
                <ActivityIndicator color={palette.accent} />
                <AppText className="mt-2 text-[13px]" tone="muted">Loading options...</AppText>
              </View>
            ) : (
              <>
                <DropdownSelector
                  label="Primary Industry"
                  onChange={(v) => updateField('industry', v)}
                  options={industryOptions}
                  placeholder="Select industry"
                  searchable
                  value={formState.industry}
                />
                <DropdownSelector
                  label="Secondary Industry"
                  onChange={(v) => updateField('secondary_industry', v)}
                  options={industryOptions}
                  placeholder="Select secondary industry (optional)"
                  searchable
                  value={formState.secondary_industry}
                />
              </>
            )}
          </AppCard>

          <AppCard
            className="mt-4 gap-5"
            style={{ backgroundColor: palette.field, borderColor: palette.border }}>
            <View className="gap-1">
              <AppText variant="subtitle">Traction</AppText>
              <AppText className="text-[13px]" tone="muted">
                Share where you stand today.
              </AppText>
            </View>
            <StartupInput
              label="User Count"
              onChangeText={(v) => updateField('user_count', v)}
              placeholder="e.g. 1000+"
              value={formState.user_count}
            />
            <StartupInput
              label="Monthly Active Users"
              onChangeText={(v) => updateField('mau', v)}
              placeholder="e.g. 500"
              value={formState.mau}
            />
            <StartupInput
              label="Revenue"
              onChangeText={(v) => updateField('revenue', v)}
              placeholder="e.g. $10K ARR"
              value={formState.revenue}
            />
          </AppCard>

          <AppCard
            className="mt-4 gap-5"
            style={{ backgroundColor: palette.field, borderColor: palette.border }}>
            <View className="gap-1">
              <AppText variant="subtitle">Team</AppText>
              <AppText className="text-[13px]" tone="muted">
                Team setup and what you&apos;re looking for.
              </AppText>
            </View>
            <StartupInput
              keyboardType="numeric"
              label="Team Size"
              onChangeText={(v) => updateField('team_size', v.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 3"
              value={formState.team_size}
            />
            {isOptionsLoading ? (
              <View className="items-center py-4">
                <ActivityIndicator color={palette.accent} size="small" />
              </View>
            ) : (
              <SearchableMultiSelectDropdown
                label="Open Roles"
                onChange={(v) => updateField('open_roles', v)}
                options={roleOptions}
                placeholder="Select open roles"
                selected={formState.open_roles}
              />
            )}
            <ChipSelector
              label="Commitment"
              onChange={(v) => updateField('commitment', v)}
              options={COMMITMENT_OPTIONS}
              value={formState.commitment}
            />
            <ChipSelector
              label="Equity"
              onChange={(v) => updateField('equity', v)}
              options={EQUITY_OPTIONS}
              value={formState.equity}
            />
            <View className="flex-row items-center justify-between rounded-[16px] border px-4 py-4"
              style={{ backgroundColor: palette.field, borderColor: palette.border }}>
              <View className="gap-1">
                <AppText className="text-[15px]" variant="bodyStrong">Paid Position</AppText>
                <AppText className="text-[13px]" tone="muted">Does this role offer salary?</AppText>
              </View>
              <Switch
                onValueChange={(v) => updateField('paid', v)}
                thumbColor={palette.text}
                trackColor={{ false: palette.border, true: palette.accent }}
                value={formState.paid}
              />
            </View>
          </AppCard>

          <AppCard
            className="mt-4 gap-5"
            style={{ backgroundColor: palette.field, borderColor: palette.border }}>
            <View className="gap-1">
              <AppText variant="subtitle">Links</AppText>
              <AppText className="text-[13px]" tone="muted">
                Where can people find you online?
              </AppText>
            </View>
            <StartupInput
              autoCapitalize="none"
              keyboardType="url"
              label="Website"
              onChangeText={(v) => updateField('website', v)}
              placeholder="https://yourstartup.com"
              value={formState.website}
            />
            <StartupInput
              autoCapitalize="none"
              keyboardType="url"
              label="Prototype / Demo"
              onChangeText={(v) => updateField('prototype_url', v)}
              placeholder="https://figma.com/..."
              value={formState.prototype_url}
            />
            <StartupInput
              autoCapitalize="none"
              keyboardType="url"
              label="LinkedIn"
              onChangeText={(v) => updateField('linkedin', v)}
              placeholder="https://linkedin.com/company/..."
              value={formState.linkedin}
            />
          </AppCard>

          {submitError ? (
            <AppText className="mt-4 text-[12px]" tone="danger" variant="code">
              {submitError}
            </AppText>
          ) : null}

          <View className="mt-5 flex-row gap-3 pt-1">
            <Pressable
              className="h-12 flex-1 items-center justify-center rounded-[12px] border"
              disabled={isSaving}
              onPress={() => router.back()}
              style={{ backgroundColor: palette.field, borderColor: palette.border }}>
              <AppText className="text-[14px]" variant="bodyStrong">Cancel</AppText>
            </Pressable>
            <Pressable
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[12px] border"
              disabled={isSaving}
              onPress={() => void handleSave()}
              style={{
                backgroundColor: palette.accent,
                borderColor: palette.accent,
                opacity: isSaving ? 0.7 : 1,
              }}>
              {isSaving ? (
                <ActivityIndicator color={palette.buttonText} size="small" />
              ) : (
                <>
                  <Ionicons color={palette.buttonText} name="save-outline" size={18} />
                  <AppText
                    className="text-[14px]"
                    style={{ color: palette.buttonText }}
                    variant="bodyStrong">
                    Save Changes
                  </AppText>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
