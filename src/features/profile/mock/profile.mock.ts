import type { MyProfileResponse, ProfileOptionsResponse } from '../types/profile.types';

const talentSections = {
  about: {
    kind: 'personalDescription' as const,
    title: 'About',
    value: 'Product-minded operator looking to build useful products with an early-stage team.',
  },
  personalityAndHobbies: {
    title: 'Personality & Hobbies',
    items: [
      { id: 'ph_2', name: 'Problem Solver' },
      { id: 'ph_10', name: 'Creative' },
      { id: 'ph_12', name: 'Data-Driven' },
    ],
  },
  skills: {
    title: 'Skills',
    items: [
      { id: 'sk_growth', name: 'Growth' },
      { id: 'sk_ops', name: 'Operations' },
    ],
  },
  interests: {
    title: 'Interests',
    items: [
      { id: 'in_saas', name: 'SaaS' },
      { id: 'in_ai', name: 'AI/ML' },
    ],
  },
  experience: {
    title: 'Experience',
    items: [
      {
        id: 'exp_maya_1',
        title: 'Growth Operations Lead',
        organization: 'KaryaCloud',
        period: '2023 - Present',
        location: 'Bandung, Indonesia',
        isCurrent: true,
        companyLogo: 'https://logo.clearbit.com/notion.so',
      },
    ],
  },
  education: {
    title: 'Education',
    items: [
      {
        id: 'edu_maya_1',
        degree: 'Bachelor of Business Administration',
        school: 'Institut Teknologi Bandung',
        field: 'Business & Management',
        period: '2017 - 2021',
        schoolLogo: 'https://logo.clearbit.com/itb.ac.id',
      },
    ],
  },
  highlights: {
    items: ['4+ years building growth systems', 'English, Bahasa Indonesia'],
  },
};

export const mockStartupProfileResponse: MyProfileResponse = {
  success: true,
  message: 'Profile fetched successfully',
  data: {
    id: 'usr_123456',
    teamId: 'team_connectx_001',
    stats: {
      connections: 47,
      teamsJoined: 2,
      matches: 156,
    },
    talent: {
      profileType: 'founder',
      name: 'John Carter',
      headline: 'Startup Founder',
      photoUrl: 'https://cdn.connectx.app/profiles/usr_123456/photo.jpg',
      location: {
        id: 'jakarta',
        city: 'Jakarta',
        country: 'Indonesia',
        display: 'Jakarta, Indonesia',
      },
      badges: [
        { id: 'startup-founder', label: 'Startup Founder' },
        { id: 'top-builder', label: 'Top Builder' },
      ],
      sections: talentSections,
    },
    startup: {
      description: 'AI-powered supply chain platform for SMEs across Southeast Asia.',
      hiringPreferences: {
        commitment: 'full_time',
        equity: 'equity_and_salary',
        paid: true,
      },
      logoUrl: 'https://cdn.connectx.app/startups/supplypilot-ai/logo.jpg',
      name: 'SupplyPilot AI',
      openRoles: [{ id: 'software_engineer', title: 'Software Engineer' }],
      tagline: 'AI logistics planning for growing Southeast Asian SMEs.',
      teamSize: 3,
      vision: {
        problem: 'Growing SMEs struggle to plan shipments across fragmented logistics providers.',
        solution: 'SupplyPilot AI recommends routes and providers from one planning workspace.',
        targetUsers: 'Operations teams at growing Southeast Asian SMEs.',
      },
      stage: {
        value: 'mvp',
        label: 'MVP',
        details: [
          { id: 'q_user_count', label: 'Users', value: 42 },
          { id: 'q_mau', label: 'Monthly active users', value: 28 },
          { id: 'q_mvp_revenue', label: 'Revenue', value: 'Pre-revenue pilots' },
          { id: 'q_growth_rate', label: 'Growth rate', value: '15% MoM pilot usage growth' },
        ],
      },
      industries: [
        { id: 'logistics', name: 'Logistics' },
        { id: 'supply_chain_tech', name: 'Supply Chain Tech' },
      ],
      links: [
        { kind: 'website', label: 'Website', url: 'https://supplypilot.ai' },
        {
          kind: 'linkedin',
          label: 'LinkedIn',
          url: 'https://linkedin.com/company/supplypilot-ai',
        },
      ],
      sections: {
        about: {
          kind: 'startupIdea',
          title: 'About',
          value: 'AI-powered supply chain platform for SMEs across Southeast Asia.',
        },
        interests: {
          title: 'Industries',
          items: [{ id: 'logistics', name: 'Logistics' }],
        },
        highlights: {
          items: ['MVP stage', 'Built for growing Southeast Asian SMEs'],
        },
      },
    },
    createdAt: '2026-04-12T10:00:00.000Z',
    updatedAt: '2026-04-12T10:00:00.000Z',
  },
};

export const mockIndividualProfileResponse: MyProfileResponse = {
  success: true,
  message: 'Profile fetched successfully',
  data: {
    id: 'usr_789012',
    teamId: null,
    stats: {
      connections: 32,
      teamsJoined: 1,
      matches: 84,
    },
    talent: {
      profileType: 'builder',
      name: 'Maya Santoso',
      headline: 'Product-minded growth operator',
      photoUrl: null,
      location: {
        id: 'bandung',
        city: 'Bandung',
        country: 'Indonesia',
        display: 'Bandung, Indonesia',
      },
      badges: [{ id: 'top-builder', label: 'Top Builder' }],
      sections: talentSections,
    },
    startup: null,
    createdAt: '2026-04-14T09:30:00.000Z',
    updatedAt: '2026-04-14T09:30:00.000Z',
  },
};

export const mockMyProfileResponse = mockStartupProfileResponse;

export const mockProfileOptionsResponse: ProfileOptionsResponse = {
  success: true,
  data: {
    locations: [
      { id: 'opt_city_jakarta', label: 'Jakarta, Indonesia', value: 'jakarta', group: 'Indonesia' },
      { id: 'opt_city_bandung', label: 'Bandung, Indonesia', value: 'bandung', group: 'Indonesia' },
      { id: 'opt_city_singapore', label: 'Singapore, Singapore', value: 'singapore', group: 'Singapore' },
    ],
    personalityAndHobbies: [
      { id: 'ph_1', name: 'Goal-Oriented' },
      { id: 'ph_2', name: 'Problem Solver' },
      { id: 'ph_10', name: 'Creative' },
      { id: 'ph_12', name: 'Data-Driven' },
      { id: 'ph_13', name: 'Connector' },
      { id: 'ph_16', name: 'Systems Thinker' },
    ],
  },
};
