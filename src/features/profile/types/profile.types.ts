export type ProfileLocation = {
  city: string;
  country: string;
  displayName: string;
};

export type ProfileStats = {
  connections: number;
  teamsJoined: number;
  matches: number;
};

export type ProfileBadge = {
  id: string;
  label: string;
  icon: string | null;
};

export type ProfileTrait = {
  id: string;
  label: string;
  emoji: string | null;
};

export type ProfileHighlight = {
  id: string;
  icon: string | null;
  text: string;
};

export type ProfileDetail = {
  id: string;
  photoUrl: string | null;
  fullName: string;
  headline: string;
  location: ProfileLocation;
  stats: ProfileStats;
  badges: ProfileBadge[];
  startupIdea: string | null;
  personalityAndHobbies: ProfileTrait[];
  skills: string[];
  interests: string[];
  highlights: ProfileHighlight[];
};

export type GetProfileParams = {
  profileId: string;
};

export type GetProfileResponse = {
  data: {
    profile: ProfileDetail;
  };
  message: string;
  status: 'success';
};
