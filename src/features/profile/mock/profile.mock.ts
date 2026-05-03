import type { MyProfileResponse, ProfileOptionsResponse } from '../types/profile.types';

export const mockStartupProfileResponse: MyProfileResponse = {
  success: true,
  message: 'Profile fetched successfully',
  data: {
    id: 'usr_123456',
    teamId: 'team_connectx_001',
    profileType: 'founder',
    name: 'John Carter',
    headline: 'Startup Founder',
    photoUrl: 'https://cdn.connectx.app/profiles/usr_123456/photo.jpg',
    location: {
      city: 'Jakarta',
      country: 'Indonesia',
      display: 'Jakarta, Indonesia',
    },
    stats: {
      connections: 47,
      teamsJoined: 2,
      matches: 156,
    },
    badges: [
      {
        id: 'startup-founder',
        label: 'Startup Founder',
      },
      {
        id: 'top-builder',
        label: 'Top Builder',
      },
      {
        id: 'open-source',
        label: 'Open Source',
      },
    ],
    startup: {
      name: 'SupplyPilot AI',
      tagline: 'AI logistics planning for growing Southeast Asian SMEs.',
      stage: {
        value: 'mvp',
        label: 'MVP',
        details: [
          {
            id: 'q_user_count',
            label: 'Users',
            value: 42,
          },
          {
            id: 'q_mau',
            label: 'Monthly active users',
            value: 28,
          },
          {
            id: 'q_mvp_revenue',
            label: 'Revenue',
            value: 'Pre-revenue pilots',
          },
          {
            id: 'q_growth_rate',
            label: 'Growth rate',
            value: '15% MoM pilot usage growth',
          },
        ],
      },
      industries: [
        {
          id: 'logistics',
          name: 'Logistics',
        },
        {
          id: 'supply_chain_tech',
          name: 'Supply Chain Tech',
        },
        {
          id: 'ai',
          name: 'AI',
        },
      ],
      links: [
        {
          label: 'Website',
          url: 'https://supplypilot.ai',
        },
        {
          label: 'LinkedIn',
          url: 'https://linkedin.com/company/supplypilot-ai',
        },
        {
          label: 'Pitch deck',
          url: 'https://pitch.com/supplypilot-ai',
        },
      ],
    },
    sections: {
      about: {
        kind: 'personalDescription',
        title: 'About',
        value:
          'AI-powered supply chain platform that optimizes logistics for SMEs across Southeast Asia.',
      },
      personalityAndHobbies: {
        title: 'Personality & Hobbies',
        items: [
          {
            id: 'ph_1',
            name: 'Goal-Oriented',
          },
          {
            id: 'ph_2',
            name: 'Problem Solver',
          },
          {
            id: 'ph_3',
            name: 'Coffee Enthusiast',
          },
          {
            id: 'ph_4',
            name: 'Avid Reader',
          },
          {
            id: 'ph_5',
            name: 'Marathon Runner',
          },
          {
            id: 'ph_6',
            name: 'Guitar Player',
          },
        ],
      },
      skills: {
        title: 'Skills',
        items: [
          {
            id: 'sk_1',
            name: 'Strategy',
          },
          {
            id: 'sk_2',
            name: 'BD',
          },
          {
            id: 'sk_3',
            name: 'Fundraising',
          },
          {
            id: 'sk_4',
            name: 'Product',
          },
          {
            id: 'sk_5',
            name: 'GTM',
          },
        ],
      },
      interests: {
        title: 'Interests',
        items: [
          {
            id: 'in_1',
            name: 'Fintech',
          },
          {
            id: 'in_2',
            name: 'AI/ML',
          },
          {
            id: 'in_3',
            name: 'SaaS',
          },
          {
            id: 'in_4',
            name: 'B2B',
          },
        ],
      },
      highlights: {
        items: [
          '5+ years startup experience',
          'MBA, London Business School',
          'English, Bahasa Indonesia',
        ],
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
    teamId: 'team_connectx_002',
    profileType: 'builder',
    name: 'Maya Santoso',
    headline: 'Product-minded growth operator',
    photoUrl: null,
    location: {
      city: 'Bandung',
      country: 'Indonesia',
      display: 'Bandung, Indonesia',
    },
    stats: {
      connections: 32,
      teamsJoined: 1,
      matches: 84,
    },
    badges: [
      {
        id: 'top-builder',
        label: 'Top Builder',
      },
      {
        id: 'open-source',
        label: 'Open Source',
      },
    ],
    sections: {
      about: {
        kind: 'personalDescription',
        title: 'About',
        value:
          'Product-minded operator looking to join an early-stage team and help scale go-to-market systems.',
      },
      personalityAndHobbies: {
        title: 'Personality & Hobbies',
        items: [
          {
            id: 'ph_2',
            name: 'Problem Solver',
          },
          {
            id: 'ph_10',
            name: 'Creative',
          },
          {
            id: 'ph_12',
            name: 'Data-Driven',
          },
          {
            id: 'ph_13',
            name: 'Connector',
          },
        ],
      },
      skills: {
        title: 'Skills',
        items: [
          {
            id: 'sk_growth',
            name: 'Growth',
          },
          {
            id: 'sk_ops',
            name: 'Operations',
          },
          {
            id: 'sk_research',
            name: 'User Research',
          },
          {
            id: 'sk_gtm',
            name: 'GTM',
          },
        ],
      },
      interests: {
        title: 'Interests',
        items: [
          {
            id: 'in_saas',
            name: 'SaaS',
          },
          {
            id: 'in_marketplaces',
            name: 'Marketplaces',
          },
          {
            id: 'in_future_of_work',
            name: 'Future of Work',
          },
        ],
      },
      highlights: {
        items: [
          '4+ years building growth systems',
          'Led ops for a 12-person startup team',
          'English, Bahasa Indonesia',
        ],
      },
    },
    createdAt: '2026-04-14T09:30:00.000Z',
    updatedAt: '2026-04-14T09:30:00.000Z',
  },
};

export const mockMyProfileResponse = mockStartupProfileResponse;

export const mockProfileOptionsResponse: ProfileOptionsResponse = {
  success: true,
  data: {
    personalityAndHobbies: [
      { id: 'ph_1', name: 'Goal-Oriented' },
      { id: 'ph_2', name: 'Problem Solver' },
      { id: 'ph_3', name: 'Coffee Enthusiast' },
      { id: 'ph_4', name: 'Avid Reader' },
      { id: 'ph_5', name: 'Marathon Runner' },
      { id: 'ph_6', name: 'Guitar Player' },
      { id: 'ph_7', name: 'High-Energy' },
      { id: 'ph_8', name: 'Competitive' },
      { id: 'ph_9', name: 'Metrics-Obsessed' },
      { id: 'ph_10', name: 'Creative' },
      { id: 'ph_11', name: 'Hustler' },
      { id: 'ph_12', name: 'Data-Driven' },
      { id: 'ph_13', name: 'Connector' },
      { id: 'ph_14', name: 'Mindful' },
      { id: 'ph_15', name: 'Visionary' },
      { id: 'ph_16', name: 'Systems Thinker' },
    ],
  },
};
