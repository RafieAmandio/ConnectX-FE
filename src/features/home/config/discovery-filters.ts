import type {
  DiscoveryFilterCatalogGroup,
  DiscoveryFilterField,
  DiscoveryFilterOptionsResponse,
  DiscoveryFilterSection,
  DiscoveryGoalId,
  DiscoveryMode,
} from '../types/discovery.types';

function createPremiumSectionAccess(enabled = false) {
  return {
    requiresEntitlement: 'connectx_pro' as const,
    enabled,
    errorCode: 'PREMIUM_REQUIRED' as const,
  };
}

function createGoalSection(defaultGoal: DiscoveryGoalId): DiscoveryFilterSection {
  return {
    id: 'goal',
    title: 'Goal',
    type: 'single_select',
    ui: {
      component: 'radio_cards',
      collapsible: false,
    },
    options: [
      {
        id: 'goal_finding_cofounder',
        label: 'Finding Co-Founder',
        description: 'Search for your ideal co-founder',
      },
      {
        id: 'goal_building_team',
        label: 'Building Team',
        description: 'Hire early team members',
      },
      {
        id: 'goal_explore_startups',
        label: 'Explore Startups',
        description: 'Find a startup to join',
      },
      {
        id: 'goal_joining_startups',
        label: 'Joining Startups',
        description: 'Join an existing startup',
      },
    ],
    defaultValue: defaultGoal,
  };
}

function createLocationAvailabilitySection(): DiscoveryFilterSection {
  return {
    id: 'locationAvailability',
    title: 'Location & Availability',
    type: 'group',
    ui: {
      component: 'group',
      collapsible: false,
    },
    fields: [
      {
        id: 'workArrangementIds',
        title: 'Work Arrangement',
        type: 'multi_select',
        ui: {
          component: 'chips',
        },
        options: [
          { id: 'wa_onsite', label: 'Onsite' },
          { id: 'wa_hybrid', label: 'Hybrid' },
          { id: 'wa_remote', label: 'Remote' },
        ],
      },
      {
        id: 'remoteReady',
        title: 'Available for remote work',
        type: 'boolean',
        ui: {
          component: 'switch',
        },
        defaultValue: true,
      },
      {
        id: 'distanceKm',
        title: 'Distance',
        type: 'range',
        ui: {
          component: 'slider',
          suffix: 'km',
        },
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 50,
      },
    ],
  };
}

const commonIndustrySection: DiscoveryFilterSection = {
  id: 'industryIds',
  title: 'Industry',
  type: 'multi_select',
  ui: {
    component: 'chips',
    searchable: true,
    collapsible: false,
  },
  options: [
    { id: 'ind_ai', label: 'AI' },
    { id: 'ind_fintech', label: 'Fintech' },
    { id: 'ind_healthtech', label: 'Healthtech' },
    { id: 'ind_edtech', label: 'EdTech' },
    { id: 'ind_web3', label: 'Web3' },
    { id: 'ind_saas', label: 'SaaS' },
  ],
};

const commonStageSection: DiscoveryFilterSection = {
  id: 'startupStageIds',
  title: 'Startup Stage',
  type: 'multi_select',
  ui: {
    component: 'chips',
    collapsible: false,
  },
  options: [
    { id: 'stage_idea', label: 'Idea' },
    { id: 'stage_mvp', label: 'MVP' },
    { id: 'stage_pre_seed', label: 'Pre-seed' },
    { id: 'stage_seed', label: 'Seed' },
  ],
};

export const discoveryFilterSectionsByMode: Record<DiscoveryMode, DiscoveryFilterSection[]> = {
  finding_cofounder: [
    createGoalSection('goal_finding_cofounder'),
    {
      id: 'skillStrengthIds',
      title: 'Skill Strength',
      type: 'multi_select',
      ui: { component: 'chips', collapsible: false },
      options: [
        { id: 'ss_technical', label: 'Technical' },
        { id: 'ss_product', label: 'Product' },
        { id: 'ss_business', label: 'Business' },
        { id: 'ss_sales', label: 'Sales' },
        { id: 'ss_marketing', label: 'Marketing' },
        { id: 'ss_design', label: 'Design' },
        { id: 'ss_operations', label: 'Operations' },
        { id: 'ss_finance', label: 'Finance' },
      ],
    },
    commonIndustrySection,
    createLocationAvailabilitySection(),
    {
      id: 'commitmentIds',
      title: 'Commitment',
      type: 'multi_select',
      ui: { component: 'chips', collapsible: true, defaultCollapsed: false },
      options: [
        { id: 'commitment_full_time', label: 'Full-time' },
        { id: 'commitment_part_time', label: 'Part-time' },
        { id: 'commitment_side_project', label: 'Side Project' },
      ],
    },
    {
      id: 'aiMatchPrecision',
      title: 'AI Connection Precision',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'minimumMatchScore',
          title: 'Minimum Connection Score',
          type: 'range',
          ui: { component: 'slider', suffix: '%' },
          min: 50,
          max: 99,
          step: 1,
          defaultValue: 81,
        },
        {
          id: 'priorityPreferenceIds',
          title: 'AI Priorities',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'ai_same_stage', label: 'Same Startup Stage' },
            { id: 'ai_similar_commitment', label: 'Similar Commitment Level' },
            { id: 'ai_leadership_compatibility', label: 'Leadership Compatibility' },
            { id: 'ai_functional_balance', label: 'Functional Balance' },
            { id: 'ai_geographic_fit', label: 'Geographic Fit' },
            { id: 'ai_language_compatibility', label: 'Language Compatibility' },
          ],
        },
        {
          id: 'showAiExplainWhyMatch',
          title: 'Show AI Explain for this Connection',
          type: 'boolean',
          ui: { component: 'switch' },
          defaultValue: false,
        },
      ],
    },
    {
      id: 'founderBuilderQuality',
      title: 'Founder & Builder Quality',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'startupExperienceIds',
          title: 'Startup Experience',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'se_first_time_founder', label: 'First-time Founder' },
            { id: 'se_built_1_startup', label: 'Built 1 Startup' },
            { id: 'se_serial_founder', label: 'Serial Founder' },
            { id: 'se_exit_experience', label: 'Startup Exit Experience' },
            { id: 'se_vc_backed', label: 'VC-backed Founder' },
            { id: 'se_accelerator_alumni', label: 'Accelerator Alumni' },
          ],
        },
        {
          id: 'leadershipBackgroundIds',
          title: 'Leadership Background',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'lb_led_team', label: 'Led Startup Team' },
            { id: 'lb_built_from_zero', label: 'Built Product from Zero' },
            { id: 'lb_owned_revenue', label: 'Owned Revenue Target' },
            { id: 'lb_raised_capital', label: 'Raised Capital' },
            { id: 'lb_advisor_mentor', label: 'Advisor / Mentor' },
          ],
        },
      ],
    },
    {
      id: 'cofounderReadiness',
      title: 'Co-Founder Readiness',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'readinessLevelIds',
          title: 'Readiness Level',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'cr_ready_30_days', label: 'Ready to Start Within 30 Days' },
            { id: 'cr_exploring_ideas', label: 'Exploring Startup Ideas' },
            { id: 'cr_build_from_zero', label: 'Open to Build From Zero' },
            { id: 'cr_existing_founder', label: 'Open to Existing Founder' },
            { id: 'cr_equity_based', label: 'Equity-Based Build' },
            { id: 'cr_long_term', label: 'Long-Term Commitment' },
          ],
        },
      ],
    },
    {
      id: 'globalCompatibility',
      title: 'Global Compatibility',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: true },
      fields: [
        {
          id: 'languageIds',
          title: 'Languages',
          type: 'multi_select',
          ui: { component: 'chips', searchable: true },
          options: [
            { id: 'lang_en', label: 'English' },
            { id: 'lang_id', label: 'Bahasa Indonesia' },
            { id: 'lang_zh', label: 'Mandarin Chinese' },
            { id: 'lang_ja', label: 'Japanese' },
            { id: 'lang_ko', label: 'Korean' },
            { id: 'lang_es', label: 'Spanish' },
          ],
        },
        {
          id: 'educationIds',
          title: 'Education',
          type: 'multi_select',
          ui: { component: 'chips' },
          options: [
            { id: 'edu_bachelor', label: 'Bachelor' },
            { id: 'edu_master', label: 'Master' },
            { id: 'edu_mba', label: 'MBA' },
            { id: 'edu_phd', label: 'PhD' },
            { id: 'edu_research', label: 'Research Background' },
          ],
        },
      ],
    },
  ],
  building_team: [
    createGoalSection('goal_building_team'),
    commonIndustrySection,
    createLocationAvailabilitySection(),
    {
      id: 'roleNeededIds',
      title: 'Role Needed',
      type: 'multi_select',
      ui: { component: 'chips', collapsible: false },
      options: [
        { id: 'role_engineer', label: 'Engineer' },
        { id: 'role_product', label: 'Product' },
        { id: 'role_designer', label: 'Designer' },
        { id: 'role_sales', label: 'Sales' },
        { id: 'role_marketing', label: 'Marketing' },
        { id: 'role_operations', label: 'Operations' },
        { id: 'role_finance', label: 'Finance' },
        { id: 'role_growth', label: 'Growth' },
        { id: 'role_ai_ml', label: 'AI / ML' },
      ],
    },
    {
      id: 'skillIds',
      title: 'Skill Stack',
      type: 'multi_select',
      ui: { component: 'chips', searchable: true, collapsible: false },
      options: [
        { id: 'skill_react', label: 'React' },
        { id: 'skill_python', label: 'Python' },
        { id: 'skill_figma', label: 'Figma' },
        { id: 'skill_growth', label: 'Growth' },
        { id: 'skill_seo', label: 'SEO' },
        { id: 'skill_salesforce', label: 'Salesforce' },
      ],
    },
    {
      id: 'commitmentIds',
      title: 'Commitment',
      type: 'multi_select',
      ui: { component: 'chips', collapsible: false },
      options: [
        { id: 'commitment_full_time', label: 'Full-time' },
        { id: 'commitment_part_time', label: 'Part-time' },
        { id: 'commitment_side_project', label: 'Side Project' },
      ],
    },
    {
      id: 'aiTalentPrecision',
      title: 'AI Talent Precision',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'minimumMatchScore',
          title: 'Minimum Connection Score',
          type: 'range',
          ui: { component: 'slider', suffix: '%' },
          min: 50,
          max: 99,
          step: 1,
          defaultValue: 81,
        },
        {
          id: 'priorityPreferenceIds',
          title: 'AI Priorities',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'ai_skill_depth', label: 'Skill Depth' },
            { id: 'ai_startup_readiness', label: 'Startup Readiness' },
            { id: 'ai_immediate_availability', label: 'Immediate Availability' },
            { id: 'ai_leadership_potential', label: 'Leadership Potential' },
            { id: 'ai_role_complementarity', label: 'Role Complementarity' },
          ],
        },
        {
          id: 'showAiExplainWhyMatch',
          title: 'Show AI Explain for this Connection',
          type: 'boolean',
          ui: { component: 'switch' },
          defaultValue: false,
        },
      ],
    },
    {
      id: 'executionQuality',
      title: 'Execution Quality',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'trackRecordIds',
          title: 'Track Record',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'eq_built_mvp', label: 'Built MVP' },
            { id: 'eq_startup_experience', label: 'Startup Experience' },
            { id: 'eq_product_shipped', label: 'Product Shipped' },
            { id: 'eq_led_growth', label: 'Led Growth' },
            { id: 'eq_built_systems', label: 'Built Systems' },
          ],
        },
      ],
    },
    {
      id: 'globalCompatibility',
      title: 'Global Compatibility',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'languageIds',
          title: 'Languages',
          type: 'multi_select',
          ui: { component: 'chips', searchable: true },
          options: [
            { id: 'lang_en', label: 'English' },
            { id: 'lang_id', label: 'Bahasa Indonesia' },
            { id: 'lang_zh', label: 'Mandarin Chinese' },
            { id: 'lang_ja', label: 'Japanese' },
            { id: 'lang_ko', label: 'Korean' },
            { id: 'lang_es', label: 'Spanish' },
          ],
        },
      ],
    },
    {
      id: 'hiringReadiness',
      title: 'Hiring Readiness',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: true },
      fields: [
        {
          id: 'availabilityIds',
          title: 'Availability',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'hr_immediate_join', label: 'Immediate Join' },
            { id: 'hr_30_days', label: '30 Days' },
            { id: 'hr_part_time_first', label: 'Part-time First' },
            { id: 'hr_equity_open', label: 'Equity Open' },
            { id: 'hr_remote_ready', label: 'Remote Ready' },
          ],
        },
      ],
    },
  ],
  explore_startups: [
    createGoalSection('goal_explore_startups'),
    commonStageSection,
    commonIndustrySection,
    createLocationAvailabilitySection(),
    {
      id: 'roleNeededIds',
      title: 'Role Needed',
      type: 'multi_select',
      ui: { component: 'chips', collapsible: false },
      options: [
        { id: 'role_engineer', label: 'Engineer' },
        { id: 'role_designer', label: 'Designer' },
        { id: 'role_marketing', label: 'Marketing' },
        { id: 'role_sales', label: 'Sales' },
        { id: 'role_operations', label: 'Operations' },
      ],
    },
    {
      id: 'startupQuality',
      title: 'Startup Quality',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'founderBackgroundIds',
          title: 'Founder Background',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'sq_repeat_founder', label: 'Repeat Founder' },
            { id: 'sq_startup_exit', label: 'Startup Exit' },
            { id: 'sq_vc_backed_founder', label: 'VC-backed Founder' },
            { id: 'sq_strong_founder_background', label: 'Strong Founder Background' },
          ],
        },
      ],
    },
    {
      id: 'startupReadiness',
      title: 'Startup Readiness',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'progressIds',
          title: 'Progress',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'sr_mvp_ready', label: 'MVP Ready' },
            { id: 'sr_product_live', label: 'Product Live' },
            { id: 'sr_paying_users', label: 'Paying Users' },
            { id: 'sr_existing_team', label: 'Existing Team' },
          ],
        },
      ],
    },
    {
      id: 'opportunityFit',
      title: 'Opportunity Fit',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: true },
      fields: [
        {
          id: 'conditionIds',
          title: 'Conditions',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'of_equity_offered', label: 'Equity Offered' },
            { id: 'of_remote_team', label: 'Remote Team' },
            { id: 'of_fast_hiring', label: 'Fast Hiring' },
            { id: 'of_early_core_role', label: 'Early Core Role' },
          ],
        },
      ],
    },
    {
      id: 'aiStartupFit',
      title: 'AI Startup Fit',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'minimumFitScore',
          title: 'Minimum Fit Score',
          type: 'range',
          ui: { component: 'slider', suffix: '%' },
          min: 50,
          max: 99,
          step: 1,
          defaultValue: 81,
        },
        {
          id: 'showAiExplainWhyMatch',
          title: 'Show AI Explain for this Connection',
          type: 'boolean',
          ui: { component: 'switch' },
          defaultValue: false,
        },
      ],
    },
  ],
  joining_startups: [
    createGoalSection('goal_joining_startups'),
    commonStageSection,
    commonIndustrySection,
    {
      id: 'founderTypeIds',
      title: 'Founder Type',
      type: 'multi_select',
      ui: { component: 'checkbox_list', searchable: true, collapsible: false },
      options: [
        { id: 'ft_technical_founder', label: 'Technical Founder' },
        { id: 'ft_business_founder', label: 'Business Founder' },
        { id: 'ft_product_founder', label: 'Product Founder' },
        { id: 'ft_operator_founder', label: 'Operator Founder' },
      ],
    },
    createLocationAvailabilitySection(),
    {
      id: 'founderQuality',
      title: 'Founder Quality',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'backgroundIds',
          title: 'Background',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'fq_startup_experience', label: 'Startup Experience' },
            { id: 'fq_exit', label: 'Startup Exit' },
            { id: 'fq_fundraising_exposure', label: 'Fundraising Exposure' },
            { id: 'fq_accelerator_background', label: 'Accelerator Background' },
          ],
        },
      ],
    },
    {
      id: 'leadershipStrength',
      title: 'Leadership Strength',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'leadershipIds',
          title: 'Leadership Signals',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'ls_built_team', label: 'Built Team' },
            { id: 'ls_led_product', label: 'Led Product' },
            { id: 'ls_growth_ownership', label: 'Growth Ownership' },
            { id: 'ls_operations_leadership', label: 'Operations Leadership' },
          ],
        },
      ],
    },
    {
      id: 'startupReadiness',
      title: 'Startup Readiness',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'progressIds',
          title: 'Progress',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'jsr_mvp', label: 'MVP Built' },
            { id: 'jsr_traction', label: 'Early Traction' },
            { id: 'jsr_paying_users', label: 'Paying Users' },
          ],
        },
      ],
    },
    {
      id: 'equityAndCommitment',
      title: 'Equity & Commitment',
      type: 'group',
      access: createPremiumSectionAccess(),
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'termIds',
          title: 'Terms',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'eac_cofounder_equity', label: 'Co-founder Equity' },
            { id: 'eac_full_time_expected', label: 'Full-time Expected' },
            { id: 'eac_pre_revenue_build', label: 'Pre-revenue Build' },
          ],
        },
      ],
    },
  ],
};

const CATALOG_SECTION_IDS = new Set(['industryIds', 'skillIds', 'roleNeededIds', 'founderTypeIds']);
const CATALOG_FIELD_IDS = new Set(['languageIds']);

function cloneSection(section: DiscoveryFilterSection): DiscoveryFilterSection {
  return {
    ...section,
    options: section.options ? [...section.options] : undefined,
    fields: section.fields?.map((field) => ({
      ...field,
      options: field.options ? [...field.options] : undefined,
    })),
  };
}

export function flattenDiscoveryFilterCatalogGroups(groups: DiscoveryFilterCatalogGroup[]) {
  return groups.flatMap((group) => group.options);
}

function hasDiscoveryFilterCatalogOptions(groups: DiscoveryFilterCatalogGroup[] | undefined) {
  return Boolean(groups?.some((group) => group.options.length > 0));
}

function getCatalogOptions(
  sectionOrFieldId: string,
  filterOptionsResponse: DiscoveryFilterOptionsResponse | undefined,
  fallbackOptions: DiscoveryFilterSection['options'] = []
) {
  if (!filterOptionsResponse) {
    return sectionOrFieldId === 'founderTypeIds' ? fallbackOptions : [];
  }

  switch (sectionOrFieldId) {
    case 'industryIds':
      return flattenDiscoveryFilterCatalogGroups(filterOptionsResponse.data.industries);
    case 'skillIds':
      return flattenDiscoveryFilterCatalogGroups(filterOptionsResponse.data.skills);
    case 'roleNeededIds':
      return flattenDiscoveryFilterCatalogGroups(filterOptionsResponse.data.roles);
    case 'languageIds':
      return flattenDiscoveryFilterCatalogGroups(filterOptionsResponse.data.languages);
    case 'founderTypeIds':
      return hasDiscoveryFilterCatalogOptions(filterOptionsResponse.data.founderTypes)
        ? flattenDiscoveryFilterCatalogGroups(filterOptionsResponse.data.founderTypes ?? [])
        : fallbackOptions;
    default:
      return [];
  }
}

function getCityFilterField(filterOptionsResponse?: DiscoveryFilterOptionsResponse): DiscoveryFilterField | null {
  const city = filterOptionsResponse?.data.city;

  if (!city || city.type !== 'searchable_dropdown') {
    return null;
  }

  return {
    id: 'city',
    title: city.label ?? '',
    type: city.type,
    ui: {
      component: 'searchable_dropdown',
      placeholder: city.placeholder,
      searchable: city.meta?.searchable ?? true,
    },
    options: city.options.map((option) => ({
      id: option.id,
      label: option.label,
      group: option.group,
      value: option.value,
    })),
    placeholder: city.placeholder,
    required: city.required,
  };
}

export function getDiscoveryFilterSections(
  mode: DiscoveryMode,
  filterOptionsResponse?: DiscoveryFilterOptionsResponse
) {
  return discoveryFilterSectionsByMode[mode].map((section) => {
    const nextSection = cloneSection(section);

    if (CATALOG_SECTION_IDS.has(nextSection.id)) {
      nextSection.options = getCatalogOptions(nextSection.id, filterOptionsResponse, nextSection.options);
    }

    if (nextSection.fields?.length) {
      const cityFilterField =
        nextSection.id === 'locationAvailability' ? getCityFilterField(filterOptionsResponse) : null;

      if (cityFilterField && !nextSection.fields.some((field) => field.id === cityFilterField.id)) {
        const workArrangementIndex = nextSection.fields.findIndex((field) => field.id === 'workArrangementIds');
        const insertIndex = workArrangementIndex >= 0 ? workArrangementIndex + 1 : 0;

        nextSection.fields = [
          ...nextSection.fields.slice(0, insertIndex),
          cityFilterField,
          ...nextSection.fields.slice(insertIndex),
        ];
      }

      nextSection.fields = nextSection.fields.map((field) => {
        if (!CATALOG_FIELD_IDS.has(field.id)) {
          return field;
        }

        return {
          ...field,
          options: getCatalogOptions(field.id, filterOptionsResponse, field.options),
        };
      });
    }

    return nextSection;
  });
}
