export type ProfileType = 'founder' | 'builder' | 'investor' | 'operator' | 'student';

export type ProfileLocation = {
  city: string;
  country: string;
  display: string;
};

export type ProfileStats = {
  connections: number;
  teamsJoined: number;
  matches: number;
};

export type ProfileBadge = {
  id: string;
  label: string;
};

export type ProfileNamedItem = {
  id: string;
  name: string;
};

export type ProfileTextSection = {
  title: string;
  value: string;
};

export type ProfileAboutKind = 'startupIdea' | 'personalDescription';

export type ProfileAboutSection = ProfileTextSection & {
  kind: ProfileAboutKind;
};

export type ProfileListSection = {
  title: string;
  items: ProfileNamedItem[];
};

export type ProfileHighlightsSection = {
  items: string[];
};

export type MyProfileSections = {
  about?: ProfileAboutSection;
  personalityAndHobbies?: ProfileListSection;
  skills?: ProfileListSection;
  interests?: ProfileListSection;
  highlights?: ProfileHighlightsSection;
};

export type MyProfileData = {
  id: string;
  teamId: string;
  profileType: ProfileType;
  name: string;
  headline: string;
  photoUrl: string | null;
  location: ProfileLocation;
  stats: ProfileStats;
  badges: ProfileBadge[];
  sections: MyProfileSections;
  createdAt: string;
  updatedAt: string;
};

export type MyProfileResponse = {
  success: boolean;
  message: string;
  data: MyProfileData;
};

export type UpdateMyProfileRequest = {
  name: string;
  headline: string;
  location: string;
  about: string;
  personalityAndHobbyIds: string[];
};

export type UpdateMyProfileResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    headline: string;
    photoUrl: string | null;
    location: ProfileLocation;
    sections: {
      about: ProfileAboutSection;
      personalityAndHobbies: ProfileListSection;
    };
    updatedAt: string;
  };
};

export type ProfileOptionsResponse = {
  success: boolean;
  data: {
    personalityAndHobbies: ProfileNamedItem[];
  };
};
