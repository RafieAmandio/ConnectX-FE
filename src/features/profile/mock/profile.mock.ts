import type { MyProfileResponse, ProfileOptionsResponse } from '../types/profile.types';

export const mockMyProfileResponse: MyProfileResponse = {
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
    sections: {
      about: {
        kind: 'startupIdea',
        title: 'Startup Idea',
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
