import type { GetProfileResponse } from '../types/profile.types';

export const mockProfileResponse: GetProfileResponse = {
  data: {
    profile: {
      id: 'profile-john-carter',
      photoUrl: 'https://i.pravatar.cc/400?img=12',
      fullName: 'John Carter',
      headline: 'Startup Founder',
      location: {
        city: 'Jakarta',
        country: 'Indonesia',
        displayName: 'Jakarta, Indonesia',
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
          icon: 'rocket-outline',
        },
        {
          id: 'top-builder',
          label: 'Top Builder',
          icon: 'star-outline',
        },
        {
          id: 'open-source',
          label: 'Open Source',
          icon: 'shield-outline',
        },
      ],
      startupIdea:
        'AI-powered supply chain platform that optimizes logistics for SMEs across Southeast Asia.',
      personalityAndHobbies: [
        {
          id: 'goal-oriented',
          label: 'Goal-Oriented',
          emoji: '🎯',
        },
        {
          id: 'problem-solver',
          label: 'Problem Solver',
          emoji: '🧠',
        },
        {
          id: 'coffee-enthusiast',
          label: 'Coffee Enthusiast',
          emoji: '☕',
        },
        {
          id: 'avid-reader',
          label: 'Avid Reader',
          emoji: '📚',
        },
        {
          id: 'marathon-runner',
          label: 'Marathon Runner',
          emoji: '🏃',
        },
        {
          id: 'guitar-player',
          label: 'Guitar Player',
          emoji: '🎸',
        },
      ],
      skills: ['Strategy', 'BD', 'Fundraising', 'Product', 'GTM'],
      interests: ['Fintech', 'AI/ML', 'SaaS', 'B2B'],
      highlights: [
        {
          id: 'experience',
          icon: 'briefcase-outline',
          text: '5+ years startup experience',
        },
        {
          id: 'education',
          icon: 'school-outline',
          text: 'MBA, London Business School',
        },
        {
          id: 'languages',
          icon: 'globe-outline',
          text: 'English, Bahasa Indonesia',
        },
        {
          id: 'availability',
          icon: 'time-outline',
          text: 'Full-time commitment',
        },
      ],
    },
  },
  message: 'Mock profile loaded successfully.',
  status: 'success',
};
