import type {
  DiscoveryCard,
  DiscoveryCardsResponse,
  DiscoveryMode,
} from '../types/discovery.types';

type MockDiscoveryProfileCardBlueprint = {
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

type MockDiscoveryStartupCardBlueprint = {
  id: string;
  startupId: string;
  name: string;
  logoUrl?: string | null;
  badgeLabel: string;
  founderName: string;
  founderTitle: string;
  score: number;
  matchLabel: string;
  industryPrimary: string;
  industrySecondary?: string;
  memberCount: number;
  summary: string;
  openRoles: string[];
  lookingFor: string[];
  journeyCurrentStage: string;
  journeyStages: {
    id: string;
    label: string;
    state: 'completed' | 'current' | 'upcoming';
  }[];
};

const profileCardBlueprints: MockDiscoveryProfileCardBlueprint[] = [
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

const startupCardBlueprints: MockDiscoveryStartupCardBlueprint[] = [
  {
    id: 'startup_card_payflow_ai',
    startupId: 'startup_payflow_ai',
    name: 'PayFlow AI',
    badgeLabel: 'MVP',
    founderName: 'Sarah Chen',
    founderTitle: 'Founder',
    score: 94,
    matchLabel: 'Perfect Match',
    industryPrimary: 'Fintech',
    industrySecondary: 'AI',
    memberCount: 2,
    summary: 'Building an AI-powered payment infrastructure for Southeast Asian SMEs.',
    openRoles: ['Technical Co-Founder', 'Backend Engineer'],
    lookingFor: ['Co-Founder', 'Team members'],
    journeyCurrentStage: 'mvp',
    journeyStages: [
      { id: 'idea', label: 'Idea', state: 'completed' },
      { id: 'mvp', label: 'MVP', state: 'current' },
      { id: 'pre_seed', label: 'Pre-Seed', state: 'upcoming' },
      { id: 'seed', label: 'Seed', state: 'upcoming' },
    ],
  },
  {
    id: 'startup_card_solidarity_health',
    startupId: 'startup_solidarity_health',
    name: 'Solidarity Health',
    badgeLabel: 'Pre-Seed',
    founderName: 'Nadia Rahman',
    founderTitle: 'Founder',
    score: 91,
    matchLabel: 'Strong Match',
    industryPrimary: 'Healthtech',
    industrySecondary: 'Ops',
    memberCount: 4,
    summary: 'Creating AI-assisted clinic workflows for underserved primary care operators.',
    openRoles: ['Founding Product Designer', 'Clinical Ops Lead'],
    lookingFor: ['Design partner', 'Operator'],
    journeyCurrentStage: 'pre_seed',
    journeyStages: [
      { id: 'idea', label: 'Idea', state: 'completed' },
      { id: 'mvp', label: 'MVP', state: 'completed' },
      { id: 'pre_seed', label: 'Pre-Seed', state: 'current' },
      { id: 'seed', label: 'Seed', state: 'upcoming' },
    ],
  },
  {
    id: 'startup_card_cargo_os',
    startupId: 'startup_cargo_os',
    name: 'Cargo OS',
    badgeLabel: 'Seed',
    founderName: 'Miguel Santos',
    founderTitle: 'Founder',
    score: 89,
    matchLabel: 'High Potential',
    industryPrimary: 'Logistics',
    industrySecondary: 'SaaS',
    memberCount: 7,
    summary: 'Building workflow software for fragmented freight operators across APAC.',
    openRoles: ['Founding Engineer', 'Growth Lead'],
    lookingFor: ['Early operator', 'Full-time builder'],
    journeyCurrentStage: 'seed',
    journeyStages: [
      { id: 'idea', label: 'Idea', state: 'completed' },
      { id: 'mvp', label: 'MVP', state: 'completed' },
      { id: 'pre_seed', label: 'Pre-Seed', state: 'completed' },
      { id: 'seed', label: 'Seed', state: 'current' },
    ],
  },
  {
    id: 'startup_card_aurora_stack',
    startupId: 'startup_aurora_stack',
    name: 'Aurora Stack',
    badgeLabel: 'MVP',
    founderName: 'Jules Bennett',
    founderTitle: 'Founder',
    score: 93,
    matchLabel: 'Perfect Match',
    industryPrimary: 'Climate',
    industrySecondary: 'DevTools',
    memberCount: 3,
    summary: 'Shipping internal data tools that help climate startups operate with smaller teams.',
    openRoles: ['Technical Co-Founder', 'Platform Engineer'],
    lookingFor: ['Co-Founder', 'Infra builder'],
    journeyCurrentStage: 'mvp',
    journeyStages: [
      { id: 'idea', label: 'Idea', state: 'completed' },
      { id: 'mvp', label: 'MVP', state: 'current' },
      { id: 'pre_seed', label: 'Pre-Seed', state: 'upcoming' },
      { id: 'seed', label: 'Seed', state: 'upcoming' },
    ],
  },
  {
    id: 'startup_card_people_os',
    startupId: 'startup_people_os',
    name: 'People OS',
    badgeLabel: 'MVP',
    founderName: 'Chloe Bennett',
    founderTitle: 'Founder',
    score: 90,
    matchLabel: 'Strong Fit',
    industryPrimary: 'HR Tech',
    industrySecondary: 'AI',
    memberCount: 5,
    summary: 'Designing an operating system for distributed startup teams and people leaders.',
    openRoles: ['Founding Recruiter', 'People Ops Partner'],
    lookingFor: ['Team members', 'People operator'],
    journeyCurrentStage: 'mvp',
    journeyStages: [
      { id: 'idea', label: 'Idea', state: 'completed' },
      { id: 'mvp', label: 'MVP', state: 'current' },
      { id: 'pre_seed', label: 'Pre-Seed', state: 'upcoming' },
      { id: 'seed', label: 'Seed', state: 'upcoming' },
    ],
  },
];

function createProfileCards(): DiscoveryCard[] {
  return profileCardBlueprints.map((card) => ({
    entityType: 'profile',
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
  }));
}

function createStartupCards(): DiscoveryCard[] {
  return startupCardBlueprints.map((card) => ({
    entityType: 'startup',
    id: card.id,
    startupId: card.startupId,
    name: card.name,
    logoUrl: card.logoUrl ?? null,
    badge: {
      label: card.badgeLabel,
    },
    founder: {
      name: card.founderName,
      title: card.founderTitle,
    },
    match: {
      score: card.score,
      label: card.matchLabel,
    },
    industry: {
      primary: card.industryPrimary,
      secondary: card.industrySecondary,
      display: [card.industryPrimary, card.industrySecondary].filter(Boolean).join(' / '),
    },
    team: {
      memberCount: card.memberCount,
      display: `${card.memberCount} members`,
    },
    summary: card.summary,
    openRoles: card.openRoles.map((title) => ({
      id: `${card.startupId}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      title,
    })),
    lookingFor: [...card.lookingFor],
    teamStage: {
      teamSize: card.memberCount,
      stage: card.badgeLabel,
      industry: [card.industryPrimary, card.industrySecondary].filter(Boolean).join(' / '),
      hiringCount: card.openRoles.length,
    },
    journey: {
      currentStage: card.journeyCurrentStage,
      stages: [...card.journeyStages],
    },
  }));
}

function createCardsResponse(items: DiscoveryCard[]): DiscoveryCardsResponse {
  return {
    success: true,
    message: 'Discovery cards fetched successfully',
    data: {
      items,
      nextCursor: null,
      hasMore: false,
    },
  };
}

export const mockDiscoveryCardsResponsesByMode: Record<DiscoveryMode, DiscoveryCardsResponse> = {
  finding_cofounder: createCardsResponse(createProfileCards()),
  building_team: createCardsResponse(createProfileCards()),
  explore_startups: createCardsResponse(createStartupCards()),
  joining_startups: createCardsResponse(createStartupCards()),
};

export const mockDiscoveryCardsResponse = mockDiscoveryCardsResponsesByMode.joining_startups;
