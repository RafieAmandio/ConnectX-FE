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
import {
  composeLinkedInUrl,
  getLinkedInInputPrefix,
  normalizeLinkedInSlug,
} from '@shared/utils/linkedin';

import { useMyProfile, useUpdateStartupProfile, useUploadProfileImage } from '../hooks/use-profile';
import type {
  MyProfileData,
  ProfileStartupLinkKind,
  ProfileStartupStageValue,
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

const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

type TractionFieldId =
  | 'q_arr'
  | 'q_funding_raised'
  | 'q_growth_rate'
  | 'q_has_prototype'
  | 'q_investors'
  | 'q_key_metrics'
  | 'q_live_users'
  | 'q_mau'
  | 'q_mrr'
  | 'q_mvp_revenue'
  | 'q_prototype_link'
  | 'q_retention'
  | 'q_scale_team_size'
  | 'q_user_count'
  | 'q_validation_methods'
  | 'q_waitlist_size';

const TRACTION_FIELDS_BY_STAGE: Record<ProfileStartupStageValue, TractionFieldId[]> = {
  idea: ['q_has_prototype', 'q_prototype_link', 'q_waitlist_size', 'q_validation_methods'],
  mvp: ['q_user_count', 'q_mau', 'q_mvp_revenue', 'q_growth_rate'],
  live: ['q_mrr', 'q_live_users', 'q_retention', 'q_key_metrics'],
  scale: ['q_funding_raised', 'q_investors', 'q_scale_team_size', 'q_arr'],
};

const NUMERIC_TRACTION_FIELDS = new Set<TractionFieldId>([
  'q_live_users',
  'q_mau',
  'q_scale_team_size',
  'q_user_count',
  'q_waitlist_size',
]);

type FormState = {
  name: string;
  tagline: string;
  description: string;
  problem: string;
  solution: string;
  target_users: string;
  stage: ProfileStartupStageValue;
  industry: string;
  logo_url: string;
  secondary_industry: string;
  team_size: string;
  open_roles: string[];
  traction: Partial<Record<TractionFieldId, string>>;
  website: string;
  linkedin: string;
  twitter: string;
  instagram: string;
  pitch_deck: string;
  commitment: string;
  equity: string;
  paid: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

type FlatOption = { id: string; label: string; value?: string };

function buildInitialFormState(startup?: MyProfileData['startup']): FormState {
  return {
    name: startup?.name ?? '',
    tagline: startup?.tagline ?? '',
    description: startup?.description ?? '',
    problem: startup?.vision?.problem ?? '',
    solution: startup?.vision?.solution ?? '',
    target_users: startup?.vision?.targetUsers ?? '',
    stage: startup?.stage.value ?? 'idea',
    industry: startup?.industries[0]?.id ?? '',
    logo_url: startup?.logoUrl ?? '',
    secondary_industry: startup?.industries[1]?.id ?? '',
    team_size: startup?.teamSize == null ? '' : String(startup.teamSize),
    open_roles: startup?.openRoles?.map((role) => role.id) ?? [],
    traction: Object.fromEntries(
      startup?.stage.details
        .filter((detail) => detail.value != null && !Array.isArray(detail.value))
        .map((detail) => [detail.id, String(detail.value)]) ?? []
    ),
    website: getLinkUrl(startup, 'website'),
    linkedin: normalizeLinkedInSlug(getLinkUrl(startup, 'linkedin'), 'company'),
    twitter: getLinkUrl(startup, 'twitter'),
    instagram: getLinkUrl(startup, 'instagram'),
    pitch_deck: getLinkUrl(startup, 'pitch_deck'),
    commitment: startup?.hiringPreferences?.commitment ?? 'full_time',
    equity: startup?.hiringPreferences?.equity ?? 'equity_only',
    paid: startup?.hiringPreferences?.paid ?? false,
  };
}

function getLinkUrl(startup: MyProfileData['startup'] | undefined, kind: ProfileStartupLinkKind): string {
  const link = startup?.links.find((item) => item.kind === kind);
  return link?.url ?? '';
}

function getNullableText(value: string) {
  return value.trim() || null;
}

function buildTractionPayload(form: FormState) {
  return Object.fromEntries(
    TRACTION_FIELDS_BY_STAGE[form.stage].map((fieldId) => {
      const trimmedValue = form.traction[fieldId]?.trim() ?? '';

      if (!trimmedValue || (fieldId === 'q_prototype_link' && form.traction.q_has_prototype !== 'yes')) {
        return [fieldId, null];
      }

      return [fieldId, NUMERIC_TRACTION_FIELDS.has(fieldId) ? Number(trimmedValue) : trimmedValue];
    })
  );
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

function getOptionValue(option: FlatOption) {
  return option.value ?? option.id;
}

function normalizeOptionLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function optionMatchesValue(option: FlatOption, value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  if (option.id === trimmedValue || option.value === trimmedValue) {
    return true;
  }

  const normalizedValue = normalizeOptionLookupKey(trimmedValue);

  return [option.id, option.value, option.label]
    .filter((item): item is string => Boolean(item))
    .some((item) => normalizeOptionLookupKey(item) === normalizedValue);
}

function findOptionByValue(options: FlatOption[], value: string) {
  return options.find((option) => optionMatchesValue(option, value));
}

function resolveOptionValue(options: FlatOption[], value: string) {
  const option = findOptionByValue(options, value);

  return option ? getOptionValue(option) : value;
}

type StartupInputProps = TextInputProps & {
  className?: string;
  error?: string;
  label?: string;
  prefix?: string;
  shellClassName?: string;
};

function StartupInput({
  className,
  error,
  label,
  placeholderTextColor = palette.textSoft,
  prefix,
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
      {prefix ? (
        <View
          className={cn(
            'min-h-14 flex-row items-center rounded-[16px] border pl-3',
            className
          )}
          style={{
            backgroundColor: palette.field,
            borderColor: isFocused ? palette.accent : palette.border,
          }}>
          <AppText className="text-[15px]" numberOfLines={1} style={{ color: palette.textSoft }}>
            {prefix}
          </AppText>
          <TextInput
            className="min-w-0 flex-1 py-3 pr-4 font-body text-[15px]"
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
                color: palette.text,
              },
              style,
            ]}
            {...props}
          />
        </View>
      ) : (
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
      )}
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
  const selectedLabel = findOptionByValue(options, value)?.label ?? '';

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
              const isSelected = optionMatchesValue(opt, value);
              return (
                <Pressable
                  key={opt.id}
                  className="flex-row items-center gap-3 px-3 py-3"
                  onPress={() => {
                    onChange(getOptionValue(opt));
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

function TractionFields({
  onChange,
  stage,
  traction,
}: {
  onChange: (key: TractionFieldId, value: string) => void;
  stage: ProfileStartupStageValue;
  traction: FormState['traction'];
}) {
  function tractionValue(key: TractionFieldId) {
    return traction[key] ?? '';
  }

  function updateNumericField(key: TractionFieldId, value: string) {
    onChange(key, value.replace(/[^0-9]/g, ''));
  }

  if (stage === 'idea') {
    const hasPrototype = tractionValue('q_has_prototype');

    return (
      <>
        <ChipSelector
          label="Do you have a prototype?"
          onChange={(value) => onChange('q_has_prototype', value)}
          options={YES_NO_OPTIONS}
          value={hasPrototype}
        />
        {hasPrototype === 'yes' ? (
          <StartupInput
            autoCapitalize="none"
            keyboardType="url"
            label="Prototype Link"
            onChangeText={(value) => onChange('q_prototype_link', value)}
            placeholder="https://figma.com/..."
            value={tractionValue('q_prototype_link')}
          />
        ) : null}
        <StartupInput
          keyboardType="numeric"
          label="Waitlist Size"
          onChangeText={(value) => updateNumericField('q_waitlist_size', value)}
          placeholder="e.g. 100"
          value={tractionValue('q_waitlist_size')}
        />
        <StartupInput
          className="min-h-[100px] px-4 py-4 text-[15px]"
          label="Validation So Far"
          multiline
          onChangeText={(value) => onChange('q_validation_methods', value)}
          placeholder="Interviews, surveys, landing page tests..."
          style={{ paddingHorizontal: 16, paddingVertical: 16 }}
          textAlignVertical="top"
          value={tractionValue('q_validation_methods')}
        />
      </>
    );
  }

  if (stage === 'mvp') {
    return (
      <>
        <StartupInput
          keyboardType="numeric"
          label="User Count"
          onChangeText={(value) => updateNumericField('q_user_count', value)}
          placeholder="e.g. 1000"
          value={tractionValue('q_user_count')}
        />
        <StartupInput
          keyboardType="numeric"
          label="Monthly Active Users"
          onChangeText={(value) => updateNumericField('q_mau', value)}
          placeholder="e.g. 500"
          value={tractionValue('q_mau')}
        />
        <StartupInput
          label="Revenue"
          onChangeText={(value) => onChange('q_mvp_revenue', value)}
          placeholder="e.g. $500 MRR"
          value={tractionValue('q_mvp_revenue')}
        />
        <StartupInput
          label="Growth Rate"
          onChangeText={(value) => onChange('q_growth_rate', value)}
          placeholder="e.g. 20% MoM"
          value={tractionValue('q_growth_rate')}
        />
      </>
    );
  }

  if (stage === 'live') {
    return (
      <>
        <StartupInput
          label="MRR"
          onChangeText={(value) => onChange('q_mrr', value)}
          placeholder="e.g. $5,000"
          value={tractionValue('q_mrr')}
        />
        <StartupInput
          keyboardType="numeric"
          label="Users / Customers"
          onChangeText={(value) => updateNumericField('q_live_users', value)}
          placeholder="e.g. 1000"
          value={tractionValue('q_live_users')}
        />
        <StartupInput
          label="Retention"
          onChangeText={(value) => onChange('q_retention', value)}
          placeholder="e.g. 80% 3-month retention"
          value={tractionValue('q_retention')}
        />
        <StartupInput
          className="min-h-[100px] px-4 py-4 text-[15px]"
          label="Key Metrics"
          multiline
          onChangeText={(value) => onChange('q_key_metrics', value)}
          placeholder="GMV, conversion, or anything else worth highlighting"
          style={{ paddingHorizontal: 16, paddingVertical: 16 }}
          textAlignVertical="top"
          value={tractionValue('q_key_metrics')}
        />
      </>
    );
  }

  return (
    <>
      <StartupInput
        label="Funding Raised"
        onChangeText={(value) => onChange('q_funding_raised', value)}
        placeholder="e.g. $2M seed"
        value={tractionValue('q_funding_raised')}
      />
      <StartupInput
        label="Investors"
        onChangeText={(value) => onChange('q_investors', value)}
        placeholder="e.g. East Ventures, Alpha JWC"
        value={tractionValue('q_investors')}
      />
      <StartupInput
        keyboardType="numeric"
        label="Team Size at Scale"
        onChangeText={(value) => updateNumericField('q_scale_team_size', value)}
        placeholder="e.g. 25"
        value={tractionValue('q_scale_team_size')}
      />
      <StartupInput
        label="Revenue / ARR"
        onChangeText={(value) => onChange('q_arr', value)}
        placeholder="e.g. $1.2M ARR"
        value={tractionValue('q_arr')}
      />
    </>
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
  const hasHydratedStartup = React.useRef(Boolean(startup));
  const [formState, setFormState] = React.useState<FormState>(() =>
    buildInitialFormState(startup)
  );
  const [formErrors, setFormErrors] = React.useState<FormErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (startup && !hasHydratedStartup.current) {
      setFormState(buildInitialFormState(startup));
      hasHydratedStartup.current = true;
    }
  }, [startup]);

  const industryOptions = React.useMemo(
    () => flattenGroups(filterOptionsQuery.data?.data?.industries ?? []),
    [filterOptionsQuery.data]
  );

  const roleOptions = React.useMemo(
    () => flattenGroups(filterOptionsQuery.data?.data?.roles ?? []),
    [filterOptionsQuery.data]
  );

  React.useEffect(() => {
    if (!industryOptions.length) {
      return;
    }

    setFormState((current) => {
      const industry = resolveOptionValue(industryOptions, current.industry);
      const secondaryIndustry = resolveOptionValue(industryOptions, current.secondary_industry);

      if (industry === current.industry && secondaryIndustry === current.secondary_industry) {
        return current;
      }

      return {
        ...current,
        industry,
        secondary_industry: secondaryIndustry,
      };
    });
  }, [industryOptions]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) {
      setFormErrors((prev) => ({ ...prev, [key]: undefined }));
    }
    setSubmitError(null);
  }

  function updateTractionField(key: TractionFieldId, value: string) {
    setFormState((current) => ({
      ...current,
      traction: {
        ...current.traction,
        [key]: value,
      },
    }));
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
      tagline: getNullableText(formState.tagline),
      description: getNullableText(formState.description),
      problem: getNullableText(formState.problem),
      solution: getNullableText(formState.solution),
      target_users: getNullableText(formState.target_users),
      stage: formState.stage,
      industry: formState.industry || null,
      logo_url: getNullableText(formState.logo_url),
      secondary_industry: formState.secondary_industry || null,
      team_size: formState.team_size ? Number(formState.team_size) : null,
      open_roles: formState.open_roles,
      traction: buildTractionPayload(formState),
      website: getNullableText(formState.website),
      linkedin: formState.linkedin
        ? getNullableText(composeLinkedInUrl(formState.linkedin, 'company'))
        : null,
      twitter: getNullableText(formState.twitter),
      instagram: getNullableText(formState.instagram),
      pitch_deck: getNullableText(formState.pitch_deck),
      commitment: formState.commitment === 'full_time' || formState.commitment === 'part_time'
        ? formState.commitment
        : null,
      equity: formState.equity === 'equity_only' || formState.equity === 'equity_and_salary'
        ? formState.equity
        : null,
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
              onChange={(v) => updateField('stage', v as ProfileStartupStageValue)}
              options={STAGE_OPTIONS}
              value={formState.stage}
            />
          </AppCard>

          <AppCard
            className="mt-4 gap-5"
            style={{ backgroundColor: palette.field, borderColor: palette.border }}>
            <View className="gap-1">
              <AppText variant="subtitle">Vision</AppText>
              <AppText className="text-[13px]" tone="muted">
                Explain the problem, your solution, and who you are building for.
              </AppText>
            </View>
            <StartupInput
              className="min-h-[100px] px-4 py-4 text-[15px]"
              label="Problem You&apos;re Solving"
              multiline
              onChangeText={(v) => updateField('problem', v)}
              placeholder="Who hurts, and why?"
              style={{ paddingHorizontal: 16, paddingVertical: 16 }}
              textAlignVertical="top"
              value={formState.problem}
            />
            <StartupInput
              className="min-h-[100px] px-4 py-4 text-[15px]"
              label="Your Solution"
              multiline
              onChangeText={(v) => updateField('solution', v)}
              placeholder="How does your product solve it?"
              style={{ paddingHorizontal: 16, paddingVertical: 16 }}
              textAlignVertical="top"
              value={formState.solution}
            />
            <StartupInput
              className="min-h-[100px] px-4 py-4 text-[15px]"
              label="Target Users"
              multiline
              onChangeText={(v) => updateField('target_users', v)}
              placeholder="Describe the people you are building for"
              style={{ paddingHorizontal: 16, paddingVertical: 16 }}
              textAlignVertical="top"
              value={formState.target_users}
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
            <TractionFields
              onChange={updateTractionField}
              stage={formState.stage}
              traction={formState.traction}
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
              label="LinkedIn"
              onChangeText={(v) => updateField('linkedin', normalizeLinkedInSlug(v, 'company'))}
              placeholder="company-slug"
              prefix={getLinkedInInputPrefix('company')}
              value={formState.linkedin}
            />
            <StartupInput
              autoCapitalize="none"
              label="Twitter / X"
              onChangeText={(v) => updateField('twitter', v)}
              placeholder="@yourhandle"
              value={formState.twitter}
            />
            <StartupInput
              autoCapitalize="none"
              label="Instagram"
              onChangeText={(v) => updateField('instagram', v)}
              placeholder="@yourstartup"
              value={formState.instagram}
            />
            <StartupInput
              autoCapitalize="none"
              keyboardType="url"
              label="Pitch Deck"
              onChangeText={(v) => updateField('pitch_deck', v)}
              placeholder="https://pitch.com/..."
              value={formState.pitch_deck}
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
