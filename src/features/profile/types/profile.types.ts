export type ProfileType = 'founder' | 'builder' | 'investor' | 'operator' | 'student';

export type ProfileLocation = {
  id?: string;
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

export type ProfileExperienceItem = {
  id?: string;
  title: string;
  organization: string;
  period?: string | null;
  location?: string | null;
  isCurrent?: boolean;
  companyLogo?: string | null;
  description?: string | null;
};

export type ProfileEducationItem = {
  id?: string;
  degree: string;
  school: string;
  field?: string | null;
  period?: string | null;
  schoolLogo?: string | null;
  description?: string | null;
};

export type ProfileExperienceSection = {
  title: string;
  items: ProfileExperienceItem[];
};

export type ProfileEducationSection = {
  title: string;
  items: ProfileEducationItem[];
};

export type ProfileStartupStageValue = 'idea' | 'mvp' | 'live' | 'scale';

export type ProfileStartupStageDetailValue = string | number | string[] | null;

export type ProfileStartupStageDetail = {
  id: string;
  label: string;
  value: ProfileStartupStageDetailValue;
};

export type ProfileStartupData = {
  name: string;
  tagline: string;
  stage: {
    value: ProfileStartupStageValue;
    label: string;
    details: ProfileStartupStageDetail[];
  };
  industries: ProfileNamedItem[];
  links: {
    label: string;
    url: string;
  }[];
};

export type ProfileStartupRawOpenRole =
  | string
  | {
      id?: string;
      title?: string;
      value?: string;
    };

export type ProfileStartupRawData = {
  description: string | null;
  logoUrl: string | null;
  openRoles: ProfileStartupRawOpenRole[] | null;
  teamSize: number | null;
};

export type MyProfileSections = {
  about?: ProfileAboutSection;
  personalityAndHobbies?: ProfileListSection;
  skills?: ProfileListSection;
  interests?: ProfileListSection;
  experience?: ProfileExperienceSection;
  education?: ProfileEducationSection;
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
  startup?: ProfileStartupData;
  startupRaw?: ProfileStartupRawData;
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
  photoUrl?: string | null;
  locationId: string;
  about: string;
  personalityAndHobbyIds?: string[];
  experience: ProfileExperienceItem[];
  education: ProfileEducationItem[];
};

export type ProfileImageUploadAsset = {
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
};

export type ProfileImageUploadResponse = {
  url: string;
};

export type UpdateMyLinkedInProfileRequest = {
  linkedin_url: string;
};

export type UpdateProfileLocationRequest = {
  latitude: number;
  longitude: number;
};

export type UpdateProfileLocationResponse = {
  success: boolean;
  message: string;
  data: {
    latitude: number;
    longitude: number;
  };
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
      personalityAndHobbies?: ProfileListSection;
      experience?: ProfileExperienceSection;
      education?: ProfileEducationSection;
    };
    updatedAt: string;
  };
};

export type PauseAccountResponse = {
  success: true;
  message: string;
  data: {
    userId: string;
    status: 'paused';
    pausedAt: string;
  };
};

export type ActivateAccountResponse = {
  success: true;
  message: string;
  data: {
    userId: string;
    status: 'active';
    activatedAt: string;
  };
};

export type RequestAccountDeletionResponse = {
  success: true;
  message: string;
  data: {
    deletionRequestId: string;
    userId: string;
    status: 'scheduled';
    requestedAt: string;
    scheduledDeletionAt: string | null;
  };
};

export type UpdateStartupProfileRequest = {
  name?: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  stage?: string;
  industry?: string;
  secondary_industry?: string;
  team_size?: number;
  open_roles?: string[];
  user_count?: string;
  mau?: string;
  revenue?: string;
  website?: string;
  prototype_url?: string;
  linkedin?: string;
  commitment?: string;
  equity?: string;
  paid?: boolean;
};

export type UpdateStartupProfileResponse = {
  success: boolean;
  message: string;
  data: Record<string, unknown>;
};

export type ProfileOptionsResponse = {
  success: boolean;
  data: {
    personalityAndHobbies: ProfileNamedItem[];
    locations: {
      id: string;
      label: string;
      value: string;
      group?: string | null;
    }[];
  };
};
