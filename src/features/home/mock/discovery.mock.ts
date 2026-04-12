import type {
  DiscoveryCardsResponse,
  DiscoveryFilterOptionsResponse,
  DiscoveryGoalId,
  DiscoveryMode,
} from '../types/discovery.types';

type MockDiscoveryCardBlueprint = {
  id: string;
  profileId: string;
  photoUrl: string;
  name: string;
  age: number;
  headline: string;
  city: string;
  country: string;
  distanceKm: number;
  score: number;
  matchLabel: string;
  badge: {
    id: string;
    label: string;
    icon: string;
  };
  bio: string;
  startupIdea: string;
  interests: {
    id: string;
    name: string;
    type?: string;
  }[];
  skills: {
    id: string;
    name: string;
  }[];
  experience?: {
    id: string;
    title: string;
    organization: string;
    period: string;
  }[];
  education?: {
    id: string;
    degree: string;
    school: string;
  }[];
  languages?: string[];
};

const cardBlueprints: MockDiscoveryCardBlueprint[] = [
  {
    id: 'card_001',
    profileId: 'usr_ardi_001',
    photoUrl: 'https://i.pravatar.cc/1200?img=12',
    name: 'Ardi Wijaya',
    age: 28,
    headline: 'Full-Stack Engineer',
    city: 'Jakarta',
    country: 'Indonesia',
    distanceKm: 3,
    score: 99,
    matchLabel: 'Top Match',
    badge: { id: 'badge_mvp', label: 'MVP', icon: 'rocket' },
    bio:
      'Building a payments infrastructure for underbanked communities in Southeast Asia. Looking for a business-minded co-founder.',
    startupIdea: 'Neo-bank for micro-merchants',
    interests: [
      { id: 'in_1', name: 'FinTech' },
      { id: 'in_2', name: 'AI/ML' },
      { id: 'in_3', name: 'SaaS' },
      { id: 'avail_1', name: 'Full-time', type: 'availability' },
    ],
    skills: [
      { id: 'sk_10', name: 'React' },
      { id: 'sk_11', name: 'Node.js' },
      { id: 'sk_12', name: 'PostgreSQL' },
    ],
    experience: [
      {
        id: 'exp_1',
        title: 'Senior Full-Stack Engineer',
        organization: 'Gojek',
        period: '2021 – 2024',
      },
      {
        id: 'exp_2',
        title: 'Co-Founder & CTO',
        organization: 'PayKecil (acquired)',
        period: '2019 – 2021',
      },
    ],
    education: [
      {
        id: 'edu_1',
        degree: 'B.S. Computer Science',
        school: 'Universitas Indonesia',
      },
    ],
    languages: ['English', 'Bahasa Indonesia'],
  },
  {
    id: 'card_002',
    profileId: 'usr_maya_002',
    photoUrl: 'https://i.pravatar.cc/1200?img=32',
    name: 'Maya Chen',
    age: 30,
    headline: 'Product Strategist',
    city: 'Singapore',
    country: 'Singapore',
    distanceKm: 5,
    score: 96,
    matchLabel: 'Top Match',
    badge: { id: 'badge_builder', label: 'Builder', icon: 'sparkles' },
    bio:
      'Obsessed with founder-product fit, early retention loops, and crisp execution. Excited about products that reduce operational chaos for growing teams.',
    startupIdea: 'Ops command center for cross-border commerce teams',
    interests: [
      { id: 'in_4', name: 'B2B SaaS' },
      { id: 'in_5', name: 'Marketplaces' },
      { id: 'avail_2', name: 'Part-time', type: 'availability' },
    ],
    skills: [
      { id: 'sk_20', name: 'Product' },
      { id: 'sk_21', name: 'Research' },
      { id: 'sk_22', name: 'Growth' },
    ],
    experience: [
      {
        id: 'exp_3',
        title: 'Lead Product Strategist',
        organization: 'Carousell',
        period: '2020 – 2024',
      },
    ],
    education: [
      {
        id: 'edu_2',
        degree: 'B.A. Economics',
        school: 'National University of Singapore',
      },
    ],
    languages: ['English', 'Mandarin'],
  },
  {
    id: 'card_003',
    profileId: 'usr_rafi_003',
    photoUrl: 'https://i.pravatar.cc/1200?img=15',
    name: 'Rafi Nandha',
    age: 31,
    headline: 'Operations Partner',
    city: 'Bandung',
    country: 'Indonesia',
    distanceKm: 22,
    score: 94,
    matchLabel: 'Strong Fit',
    badge: { id: 'badge_operator', label: 'Operator', icon: 'briefcase' },
    bio:
      'I build systems that keep messy early-stage execution moving. Strong on finance ops, supply chain workflows, and team operating rhythms.',
    startupIdea: 'Fulfillment backbone for emerging D2C brands',
    interests: [
      { id: 'in_6', name: 'Logistics' },
      { id: 'in_7', name: 'SMB Tools' },
      { id: 'avail_1', name: 'Full-time', type: 'availability' },
    ],
    skills: [
      { id: 'sk_23', name: 'Operations' },
      { id: 'sk_24', name: 'Finance' },
      { id: 'sk_25', name: 'Supply Chain' },
    ],
    experience: [
      {
        id: 'exp_4',
        title: 'Regional Operations Lead',
        organization: 'J&T Express',
        period: '2021 – 2024',
      },
    ],
    education: [
      {
        id: 'edu_3',
        degree: 'B.B.A.',
        school: 'Institut Teknologi Bandung',
      },
    ],
    languages: ['English', 'Bahasa Indonesia'],
  },
  {
    id: 'card_004',
    profileId: 'usr_jess_004',
    photoUrl: 'https://i.pravatar.cc/1200?img=47',
    name: 'Jess Alvarez',
    age: 27,
    headline: 'Community Builder',
    city: 'Manila',
    country: 'Philippines',
    distanceKm: 12,
    score: 93,
    matchLabel: 'Warm Intro',
    badge: { id: 'badge_people', label: 'People Magnet', icon: 'people' },
    bio:
      'I turn interest into belonging fast. Experienced in founder communities, ambassador programs, and building tight feedback loops from members.',
    startupIdea: 'Private founder circles for niche operator communities',
    interests: [
      { id: 'in_8', name: 'Community' },
      { id: 'in_9', name: 'Creator Economy' },
      { id: 'avail_3', name: 'Advisory', type: 'availability' },
    ],
    skills: [
      { id: 'sk_26', name: 'Community Ops' },
      { id: 'sk_27', name: 'Partnerships' },
      { id: 'sk_28', name: 'Events' },
    ],
    languages: ['English', 'Tagalog'],
  },
  {
    id: 'card_005',
    profileId: 'usr_nina_005',
    photoUrl: 'https://i.pravatar.cc/1200?img=5',
    name: 'Nina Patel',
    age: 29,
    headline: 'Growth Operator',
    city: 'Bangalore',
    country: 'India',
    distanceKm: 8,
    score: 92,
    matchLabel: 'Top Match',
    badge: { id: 'badge_growth', label: 'Growth', icon: 'trending-up' },
    bio:
      'I connect acquisition experiments to real retention outcomes. Comfortable moving between analytics, messaging, and funnel diagnosis.',
    startupIdea: 'Growth CRM for early-stage product teams',
    interests: [
      { id: 'in_10', name: 'Growth' },
      { id: 'in_11', name: 'Analytics' },
      { id: 'avail_1', name: 'Full-time', type: 'availability' },
    ],
    skills: [
      { id: 'sk_29', name: 'Lifecycle' },
      { id: 'sk_30', name: 'SQL' },
      { id: 'sk_31', name: 'Experimentation' },
    ],
    experience: [
      {
        id: 'exp_5',
        title: 'Growth PM',
        organization: 'Razorpay',
        period: '2022 – 2024',
      },
    ],
    languages: ['English', 'Hindi'],
  },
  {
    id: 'card_006',
    profileId: 'usr_owen_006',
    photoUrl: 'https://i.pravatar.cc/1200?img=64',
    name: 'Owen Brooks',
    age: 33,
    headline: 'Technical Founder',
    city: 'Sydney',
    country: 'Australia',
    distanceKm: 18,
    score: 91,
    matchLabel: 'High Signal',
    badge: { id: 'badge_shipper', label: 'Shipper', icon: 'construct' },
    bio:
      'I like practical products, small teams, and fast shipping cycles. Most energized by infrastructure, automation, and customer pain that is easy to verify.',
    startupIdea: 'Internal tooling platform for climate startups',
    interests: [
      { id: 'in_12', name: 'Climate' },
      { id: 'in_13', name: 'DevTools' },
      { id: 'avail_2', name: 'Part-time', type: 'availability' },
    ],
    skills: [
      { id: 'sk_32', name: 'TypeScript' },
      { id: 'sk_33', name: 'Platform' },
      { id: 'sk_34', name: 'AWS' },
    ],
    education: [
      {
        id: 'edu_4',
        degree: 'M.Eng. Software Systems',
        school: 'UNSW Sydney',
      },
    ],
    languages: ['English'],
  },
  {
    id: 'card_007',
    profileId: 'usr_lina_007',
    photoUrl: 'https://i.pravatar.cc/1200?img=44',
    name: 'Lina Gomez',
    age: 32,
    headline: 'Partnership Lead',
    city: 'Mexico City',
    country: 'Mexico',
    distanceKm: 11,
    score: 90,
    matchLabel: 'Warm Lead',
    badge: { id: 'badge_network', label: 'Networker', icon: 'git-network' },
    bio:
      'I move complex, multi-party partnerships without losing momentum. Strong across ecosystem building, channel strategy, and trust-heavy selling.',
    startupIdea: 'Partnership OS for fintech distribution teams',
    interests: [
      { id: 'in_14', name: 'Partnerships' },
      { id: 'in_15', name: 'FinTech' },
      { id: 'avail_3', name: 'Advisory', type: 'availability' },
    ],
    skills: [
      { id: 'sk_35', name: 'Business Development' },
      { id: 'sk_36', name: 'Partnerships' },
      { id: 'sk_37', name: 'Sales' },
    ],
    languages: ['English', 'Spanish'],
  },
  {
    id: 'card_008',
    profileId: 'usr_haruto_008',
    photoUrl: 'https://i.pravatar.cc/1200?img=68',
    name: 'Haruto Sato',
    age: 26,
    headline: 'Marketplace Analyst',
    city: 'Tokyo',
    country: 'Japan',
    distanceKm: 14,
    score: 89,
    matchLabel: 'Strong Fit',
    badge: { id: 'badge_insight', label: 'Insight', icon: 'analytics' },
    bio:
      'I’m strongest when the problem needs sharp sizing, pricing, and demand-side pattern recognition. Interested in marketplaces with fragmented supply.',
    startupIdea: 'AI sourcing assistant for cross-border wholesale',
    interests: [
      { id: 'in_16', name: 'Marketplaces' },
      { id: 'in_17', name: 'AI/ML' },
      { id: 'avail_2', name: 'Part-time', type: 'availability' },
    ],
    skills: [
      { id: 'sk_38', name: 'Analytics' },
      { id: 'sk_39', name: 'Research' },
      { id: 'sk_40', name: 'Pricing' },
    ],
    languages: ['English', 'Japanese'],
  },
  {
    id: 'card_009',
    profileId: 'usr_chloe_009',
    photoUrl: 'https://i.pravatar.cc/1200?img=41',
    name: 'Chloe Bennett',
    age: 30,
    headline: 'People Operator',
    city: 'London',
    country: 'United Kingdom',
    distanceKm: 6,
    score: 95,
    matchLabel: 'Top Match',
    badge: { id: 'badge_trust', label: 'Trusted', icon: 'shield-checkmark' },
    bio:
      'I care about founder stamina, team clarity, and operating systems that help good people do their best work under pressure.',
    startupIdea: 'People OS for distributed startup teams',
    interests: [
      { id: 'in_18', name: 'Future of Work' },
      { id: 'in_19', name: 'HR Tech' },
      { id: 'avail_1', name: 'Full-time', type: 'availability' },
    ],
    skills: [
      { id: 'sk_41', name: 'Talent' },
      { id: 'sk_42', name: 'Org Design' },
      { id: 'sk_43', name: 'Facilitation' },
    ],
    experience: [
      {
        id: 'exp_6',
        title: 'People Operations Lead',
        organization: 'Monzo',
        period: '2020 – 2024',
      },
    ],
    languages: ['English'],
  },
  {
    id: 'card_010',
    profileId: 'usr_amara_010',
    photoUrl: 'https://i.pravatar.cc/1200?img=38',
    name: 'Amara Okafor',
    age: 27,
    headline: 'Founder Associate',
    city: 'Lagos',
    country: 'Nigeria',
    distanceKm: 9,
    score: 97,
    matchLabel: 'Top Match',
    badge: { id: 'badge_generalist', label: 'Generalist', icon: 'sparkles' },
    bio:
      'High-trust generalist with a bias for shipping. I enjoy turning ambiguous founder priorities into operating plans, launches, and follow-through.',
    startupIdea: 'SME backoffice agent for African commerce startups',
    interests: [
      { id: 'in_20', name: 'SMB' },
      { id: 'in_21', name: 'Commerce' },
      { id: 'avail_1', name: 'Full-time', type: 'availability' },
    ],
    skills: [
      { id: 'sk_44', name: 'Operations' },
      { id: 'sk_45', name: 'Launches' },
      { id: 'sk_46', name: 'Founder Ops' },
    ],
    education: [
      {
        id: 'edu_5',
        degree: 'B.Sc. Business Administration',
        school: 'University of Lagos',
      },
    ],
    languages: ['English'],
  },
];

export const mockDiscoveryCardsResponse: DiscoveryCardsResponse = {
  success: true,
  message: 'Discovery cards fetched successfully',
  data: {
    items: cardBlueprints.map((card) => ({
      id: card.id,
      profileId: card.profileId,
      photoUrl: card.photoUrl,
      name: card.name,
      age: card.age,
      headline: card.headline,
      location: {
        city: card.city,
        country: card.country,
        display: `${card.city}, ${card.country}`,
        distanceKm: card.distanceKm,
      },
      match: {
        score: card.score,
        label: card.matchLabel,
      },
      badges: [card.badge],
      bio: card.bio,
      startupIdea: card.startupIdea,
      interests: [...card.interests],
      skills: [...card.skills],
      experience: card.experience ? [...card.experience] : undefined,
      education: card.education ? [...card.education] : undefined,
      languages: card.languages ? [...card.languages] : undefined,
    })),
    nextCursor: null,
    hasMore: false,
  },
};

function createGoalSection(defaultGoal: DiscoveryGoalId) {
  return {
    id: 'goal',
    title: 'Goal',
    type: 'single_select' as const,
    ui: {
      component: 'radio_cards',
      collapsible: false,
    },
    options: [
      {
        id: 'goal_finding_cofounder' as const,
        label: 'Finding Co-Founder',
        description: 'Search for your ideal co-founder',
      },
      {
        id: 'goal_building_team' as const,
        label: 'Building Team',
        description: 'Hire early team members',
      },
      {
        id: 'goal_explore_startups' as const,
        label: 'Explore Startups',
        description: 'Find a startup to join',
      },
      {
        id: 'goal_joining_startups' as const,
        label: 'Joining Startups',
        description: 'Co-found a venture',
      },
    ],
    defaultValue: defaultGoal,
  };
}

function createLocationAvailabilitySection() {
  return {
    id: 'locationAvailability',
    title: 'Location & Availability',
    type: 'group' as const,
    ui: {
      component: 'group',
      collapsible: false,
    },
    fields: [
      {
        id: 'workArrangementIds',
        title: 'Work Arrangement',
        type: 'multi_select' as const,
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
        type: 'boolean' as const,
        ui: {
          component: 'switch',
        },
        defaultValue: true,
      },
      {
        id: 'distanceKm',
        title: 'Distance',
        type: 'range' as const,
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

const commonIndustrySection = {
  id: 'industryIds',
  title: 'Industry',
  type: 'multi_select' as const,
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

const commonStageSection = {
  id: 'startupStageIds',
  title: 'Startup Stage',
  type: 'multi_select' as const,
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

function createFilterOptionsResponse(
  mode: DiscoveryMode,
  sections: DiscoveryFilterOptionsResponse['data']['sections']
): DiscoveryFilterOptionsResponse {
  return {
    success: true,
    message: 'Discovery filter options fetched successfully',
    data: {
      context: {
        mode,
        isPremium: true,
      },
      sections,
    },
  };
}

export const mockDiscoveryFilterOptionsByMode: Record<DiscoveryMode, DiscoveryFilterOptionsResponse> = {
  finding_cofounder: createFilterOptionsResponse('finding_cofounder', [
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
      title: 'AI Match Precision',
      type: 'group',
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'minimumMatchScore',
          title: 'Minimum Match Score',
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
          title: 'Show AI Explain Why Match',
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
          ],
        },
      ],
    },
    {
      id: 'globalCompatibility',
      title: 'Global Compatibility',
      type: 'group',
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
          ],
        },
      ],
    },
  ]),
  building_team: createFilterOptionsResponse('building_team', [
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
        { id: 'role_ai_ml', label: 'AI / ML' },
        { id: 'role_designer', label: 'Designer' },
        { id: 'role_marketing', label: 'Marketing' },
        { id: 'role_operations', label: 'Operations' },
      ],
    },
    {
      id: 'skillIds',
      title: 'Core Skill Stack',
      type: 'multi_select',
      ui: { component: 'chips', searchable: true, collapsible: false },
      options: [
        { id: 'skill_react', label: 'React' },
        { id: 'skill_python', label: 'Python' },
        { id: 'skill_growth', label: 'Growth' },
        { id: 'skill_sales', label: 'Sales' },
        { id: 'skill_product', label: 'Product' },
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
      ],
    },
    {
      id: 'aiTalentPrecision',
      title: 'AI Talent Precision',
      type: 'group',
      ui: { component: 'group', collapsible: true, defaultCollapsed: false },
      fields: [
        {
          id: 'minimumMatchScore',
          title: 'Minimum Match Score',
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
          title: 'Show AI Explain Why Match',
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
          ],
        },
      ],
    },
    {
      id: 'hiringReadiness',
      title: 'Hiring Readiness',
      type: 'group',
      ui: { component: 'group', collapsible: true, defaultCollapsed: true },
      fields: [
        {
          id: 'availabilityIds',
          title: 'Availability',
          type: 'multi_select',
          ui: { component: 'checkbox_list' },
          options: [
            { id: 'hr_remote_ready', label: 'Remote Ready' },
            { id: 'hr_30_days', label: 'Ready in 30 Days' },
            { id: 'hr_immediate', label: 'Immediate Start' },
          ],
        },
      ],
    },
  ]),
  explore_startups: createFilterOptionsResponse('explore_startups', [
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
        { id: 'role_marketing', label: 'Marketing' },
        { id: 'role_operations', label: 'Operations' },
        { id: 'role_product', label: 'Product' },
      ],
    },
    {
      id: 'startupQuality',
      title: 'Startup Quality',
      type: 'group',
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
          title: 'Show AI Explain Why Match',
          type: 'boolean',
          ui: { component: 'switch' },
          defaultValue: false,
        },
      ],
    },
  ]),
  joining_startups: createFilterOptionsResponse('joining_startups', [
    createGoalSection('goal_joining_startups'),
    commonStageSection,
    commonIndustrySection,
    {
      id: 'founderTypeIds',
      title: 'Founder Type',
      type: 'multi_select',
      ui: { component: 'chips', collapsible: false },
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
  ]),
};

export const mockDiscoveryFilterOptionsResponse =
  mockDiscoveryFilterOptionsByMode.finding_cofounder;
