export type ProfileType = string;

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

export type ProfileCertificationItem = {
  id?: string;
  name: string;
  issuer: string;
  date?: string | null;
  link?: string | null;
  logoUrl?: string | null;
};

export type ProfileExperienceSection = {
  title: string;
  items: ProfileExperienceItem[];
};

export type ProfileEducationSection = {
  title: string;
  items: ProfileEducationItem[];
};

export type ProfileCertificationSection = {
  title: string;
  items: ProfileCertificationItem[];
};

export type ProfileStartupStageValue = 'idea' | 'mvp' | 'live' | 'scale';

export type ProfileStartupStageDetailValue = string | number | null;

export type ProfileStartupStageDetail = {
  id: string;
  label: string;
  value: ProfileStartupStageDetailValue;
};

export type ProfileStartupLinkKind =
  | 'website'
  | 'linkedin'
  | 'twitter'
  | 'instagram'
  | 'pitch_deck';

export type ProfileStartupOpenRole = {
  id: string;
  title: string;
};

export type ProfileStartupHiringPreferences = {
  commitment: 'full_time' | 'part_time' | null;
  equity: 'equity_only' | 'equity_and_salary' | null;
  paid: boolean | null;
};

export type ProfileStartupData = {
  description: string | null;
  hiringPreferences: ProfileStartupHiringPreferences;
  logoUrl: string | null;
  name: string;
  openRoles: ProfileStartupOpenRole[];
  tagline: string;
  teamSize: number | null;
  vision: {
    problem: string | null;
    solution: string | null;
    targetUsers: string | null;
  };
  stage: {
    value: ProfileStartupStageValue;
    label: string;
    details: ProfileStartupStageDetail[];
  };
  industries: ProfileNamedItem[];
  links: {
    kind: ProfileStartupLinkKind;
    label: string;
    url: string;
  }[];
  sections: ProfileStartupSections;
};

export type ProfileTalentSections = {
  about?: ProfileAboutSection;
  certifications?: ProfileCertificationSection;
  personalityAndHobbies?: ProfileListSection;
  skills?: ProfileListSection;
  interests?: ProfileListSection;
  experience?: ProfileExperienceSection;
  education?: ProfileEducationSection;
  highlights?: ProfileHighlightsSection;
};

export type ProfileStartupSections = {
  about?: ProfileAboutSection;
  skills?: ProfileListSection;
  interests?: ProfileListSection;
  highlights?: ProfileHighlightsSection;
};

export type ProfileTalentData = {
  profileType: ProfileType;
  name: string;
  headline: string;
  photoUrl: string | null;
  location: ProfileLocation;
  badges: ProfileBadge[];
  sections: ProfileTalentSections;
};

export type MyProfileData = {
  id: string;
  teamId: string | null;
  stats: ProfileStats;
  talent: ProfileTalentData;
  startup: ProfileStartupData | null;
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
  certifications: ProfileCertificationItem[];
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

export type SyncLinkedInProfileRequest = {
  linkedin_url: string;
  fcm_token: string;
  device_id: string;
};

export type SyncLinkedInProfileResponse = {
  success: boolean;
  message: string;
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

export type UpdateMyProfileResponse = MyProfileResponse;

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
  commitment: ProfileStartupHiringPreferences['commitment'];
  description: string | null;
  equity: ProfileStartupHiringPreferences['equity'];
  industry: string | null;
  instagram: string | null;
  linkedin: string | null;
  logo_url: string | null;
  name: string;
  open_roles: string[];
  paid: boolean | null;
  pitch_deck: string | null;
  problem: string | null;
  secondary_industry: string | null;
  solution: string | null;
  stage: ProfileStartupStageValue;
  tagline: string | null;
  target_users: string | null;
  team_size: number | null;
  traction: Record<string, string | number | null>;
  twitter: string | null;
  website: string | null;
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
