import {
  availabilityOptions,
  builderTypeOptions,
  businessModelOptions,
  cashEquityExpectationOptions,
  cityOptions,
  cofounderTypeOptions,
  copy,
  coveredRolesOptions,
  currencyOptions,
  founderCountOptions,
  founderGoalOptions,
  genderOptions,
  industryOptions,
  ownCofounderTypeOptions,
  primaryRoleOptions,
  salaryMinimumOptions,
  salaryPeriodOptions,
  salaryPreferenceOptions,
  skillOptions,
  startupExperienceOptions,
  startupStageOptions,
  startupTeamRoleOptions,
  teamSizeOptions,
  useConnectxOptions,
  yesNoOptions,
} from './catalogs';
import type {
  LocalizedOnboardingQuestion,
  LocalizedOnboardingStepTemplate,
} from '../types/onboarding.types';

const continueCta = {
  enabled_when: 'valid',
  label: copy('Continue', 'Lanjut'),
} as const;

function question<TQuestion extends LocalizedOnboardingQuestion>(value: TQuestion) {
  return value;
}

export const welcomeStep = {
  can_go_back: false,
  cta: {
    enabled_when: 'always',
    label: copy('Get Started', 'Mulai'),
  },
  id: 'step_welcome',
  overall_progress: { current: 1, total: 9 },
  questions: [],
  section: copy("Let's get started", 'Mari mulai'),
  section_progress: '1/1',
  subtitle: copy(
    'ConnectX matches you with co-founders, teammates, and startups based on skills, goals, and compatibility.',
    'ConnectX mencocokkanmu dengan co-founder, rekan tim, dan startup berdasarkan skill, tujuan, dan kecocokan.'
  ),
  title: copy(
    'Find the right people to build with',
    'Temukan orang yang tepat untuk membangun bersama'
  ),
} satisfies LocalizedOnboardingStepTemplate;

export const dataDiriStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_data_diri',
  overall_progress: { current: 2, total: 9 },
  questions: [
    question({
      id: 'q_first_name',
      label: copy('First name', 'Nama depan'),
      placeholder: copy('Your first name', 'Nama depan kamu'),
      required: true,
      type: 'text',
      validation: { max_length: 50, min_length: 1 },
    }),
    question({
      helper_text: copy(
        'Optional, only shared after a connection.',
        'Opsional, hanya dibagikan setelah terkoneksi.'
      ),
      id: 'q_last_name',
      label: copy('Last name', 'Nama belakang'),
      placeholder: copy('Your last name', 'Nama belakang kamu'),
      required: false,
      type: 'text',
      validation: { max_length: 50 },
    }),
    question({
      id: 'q_date_of_birth',
      label: copy('Date of birth', 'Tanggal lahir'),
      placeholder: copy('YYYY-MM-DD', 'YYYY-MM-DD'),
      required: true,
      type: 'date',
      validation: { min_length: 10 },
    }),
    question({
      id: 'q_city',
      label: copy('Where are you based?', 'Kamu berbasis di mana?'),
      meta: { searchable: true },
      options: cityOptions,
      placeholder: copy('Search a city', 'Cari kota'),
      required: true,
      type: 'searchable_dropdown',
      validation: { min_length: 1 },
    }),
    question({
      id: 'q_gender',
      label: copy('Gender', 'Gender'),
      options: genderOptions,
      required: true,
      type: 'single_select_chip',
      validation: { min_length: 1 },
    }),
  ],
  section: copy("Let's build your general profile", 'Mari bangun profil umum kamu'),
  section_progress: '1/3',
  subtitle: copy(
    'The basics we need to personalize your matches.',
    'Data dasar yang kami butuhkan untuk mempersonalisasi match kamu.'
  ),
  title: copy('Tell us about yourself', 'Ceritakan tentang dirimu'),
} satisfies LocalizedOnboardingStepTemplate;

export const useConnectxStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_use_connectx',
  overall_progress: { current: 3, total: 9 },
  questions: [
    question({
      id: 'q_use_connectx',
      label: copy('', ''),
      meta: {
        auto_advance: true,
        layout: 'list',
      },
      options: useConnectxOptions,
      required: true,
      type: 'single_select_card',
      validation: { min_length: 1 },
    }),
  ],
  section: copy("Let's build your general profile", 'Mari bangun profil umum kamu'),
  section_progress: '2/3',
  subtitle: copy(
    'This shapes your entire experience',
    'Ini akan membentuk seluruh pengalamanmu'
  ),
  title: copy('How do you want to use ConnectX?', 'Bagaimana kamu ingin menggunakan ConnectX?'),
} satisfies LocalizedOnboardingStepTemplate;

export const builderIdentityDetailsStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_identity_details',
  overall_progress: { current: 4, total: 9 },
  questions: [
    question({
      id: 'q_builder_type',
      label: copy('', ''),
      meta: {
        auto_advance: true,
        layout: 'list',
      },
      options: builderTypeOptions,
      required: true,
      type: 'single_select_card',
      validation: { min_length: 1 },
    }),
  ],
  section: copy("Let's build your general profile", 'Mari bangun profil umum kamu'),
  section_progress: '3/3',
  subtitle: copy(
    "This determines what you'll see in your feed",
    'Ini menentukan apa yang akan muncul di feed-mu'
  ),
  title: copy('What best describes you?', 'Apa yang paling menggambarkanmu?'),
} satisfies LocalizedOnboardingStepTemplate;

export const founderGoalStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_founder_goal',
  overall_progress: { current: 5, total: 10 },
  questions: [
    question({
      id: 'q_founder_goal',
      label: copy('', ''),
      meta: {
        auto_advance: true,
        layout: 'list',
      },
      options: founderGoalOptions,
      required: true,
      type: 'single_select_card',
      validation: { min_length: 1 },
    }),
  ],
  section: copy("Let's build your general profile", 'Mari bangun profil umum kamu'),
  section_progress: '4/4',
  subtitle: copy(
    'Pick the most urgent hiring need for your startup',
    'Pilih kebutuhan rekrutmen yang paling mendesak untuk startupmu'
  ),
  title: copy('What are you looking for?', 'Apa yang sedang kamu cari?'),
} satisfies LocalizedOnboardingStepTemplate;

export const cofounderTypeStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_cofounder_type',
  overall_progress: { current: 6, total: 11 },
  questions: [
    question({
      id: 'q_cofounder_type',
      label: copy('', ''),
      options: cofounderTypeOptions,
      required: true,
      type: 'multi_select_card',
      validation: { min_selections: 1 },
    }),
  ],
  section: copy("Let's build your general profile", 'Mari bangun profil umum kamu'),
  section_progress: '5/5',
  subtitle: copy('Select all that apply', 'Pilih semua yang sesuai'),
  title: copy(
    'What kind of co-founder do you need?',
    'Co-founder seperti apa yang kamu butuhkan?'
  ),
} satisfies LocalizedOnboardingStepTemplate;

export const ownCofounderTypeStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_own_cofounder_type',
  overall_progress: { current: 9, total: 13 },
  questions: [
    question({
      id: 'q_own_cofounder_type',
      label: copy('', ''),
      meta: { auto_advance: true, layout: 'list' },
      options: ownCofounderTypeOptions,
      required: true,
      type: 'single_select_card',
      validation: { min_length: 1 },
    }),
  ],
  section: copy('Your co-founder specialty', 'Spesialisasi co-founder kamu'),
  section_progress: '1/1',
  subtitle: copy(
    'Pick the area you can own from day one.',
    'Pilih area yang bisa kamu pegang dari hari pertama.'
  ),
  title: copy(
    'What type of co-founder are you?',
    'Kamu co-founder tipe apa?'
  ),
} satisfies LocalizedOnboardingStepTemplate;

export const rolesNeededStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_roles_needed',
  overall_progress: { current: 9, total: 13 },
  questions: [
    question({
      id: 'q_roles_needed',
      label: copy('', ''),
      meta: { searchable: true },
      options: primaryRoleOptions,
      placeholder: copy('Search roles', 'Cari peran'),
      required: true,
      type: 'searchable_multi_select',
      validation: { min_selections: 1 },
    }),
  ],
  section: copy('Who you are hiring', 'Siapa yang kamu cari'),
  section_progress: '1/1',
  subtitle: copy(
    'Pick the roles you want to add to your team.',
    'Pilih peran yang ingin kamu tambahkan ke tim.'
  ),
  title: copy('What roles do you need?', 'Peran apa yang kamu butuhkan?'),
} satisfies LocalizedOnboardingStepTemplate;

export const startupIdentityDetailsStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_identity_details',
  overall_progress: { current: 4, total: 12 },
  questions: [
    question({
      id: 'q_startup_name',
      label: copy("What's your startup called?", 'Apa nama startupmu?'),
      placeholder: copy('Startup name', 'Nama startup'),
      required: true,
      type: 'text',
      validation: { max_length: 80, min_length: 2 },
    }),
    question({
      id: 'q_startup_tagline',
      label: copy('Tagline', 'Tagline'),
      placeholder: copy(
        'e.g. The fastest way to find co-founders',
        'mis. Cara tercepat mencari co-founder'
      ),
      required: true,
      type: 'text',
      validation: { max_length: 120, min_length: 2 },
    }),
    question({
      id: 'q_startup_stage',
      label: copy('Stage', 'Tahap'),
      options: startupStageOptions,
      required: true,
      type: 'single_select_chip',
      validation: { min_length: 1 },
    }),
  ],
  section: copy('Startup basics', 'Data dasar startup'),
  section_progress: '1/1',
  subtitle: copy(
    'Give us a quick introduction to your company.',
    'Kenalkan kami dengan startupmu secara singkat.'
  ),
  title: copy('Tell us about your startup', 'Ceritakan tentang startupmu'),
} satisfies LocalizedOnboardingStepTemplate;

export const problemSolutionStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_problem_solution',
  overall_progress: { current: 5, total: 12 },
  questions: [
    question({
      id: 'q_problem',
      label: copy("Problem you're solving", 'Masalah yang kamu selesaikan'),
      placeholder: copy(
        'Who hurts, and why?',
        'Siapa yang kesulitan, dan kenapa?'
      ),
      required: true,
      type: 'textarea',
      validation: { max_length: 400, min_length: 2 },
    }),
    question({
      id: 'q_solution',
      label: copy('Your solution', 'Solusimu'),
      placeholder: copy(
        'How does your product solve it?',
        'Bagaimana produkmu menyelesaikannya?'
      ),
      required: true,
      type: 'textarea',
      validation: { max_length: 400, min_length: 2 },
    }),
    question({
      id: 'q_target_users',
      label: copy('Target users', 'Target pengguna'),
      placeholder: copy(
        'Describe the people you are building for',
        'Siapa target penggunamu?'
      ),
      required: true,
      type: 'textarea',
      validation: { max_length: 300, min_length: 2 },
    }),
  ],
  section: copy('Your vision', 'Visi kamu'),
  section_progress: '1/1',
  subtitle: copy(
    'Help us understand the problem and solution.',
    'Bantu kami memahami masalah dan solusimu.'
  ),
  title: copy('What are you building?', 'Apa yang sedang kamu bangun?'),
} satisfies LocalizedOnboardingStepTemplate;

export const startupIndustriesStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_startup_industries',
  overall_progress: { current: 6, total: 13 },
  questions: [
    question({
      id: 'q_industries_interest',
      label: copy('', ''),
      meta: { searchable: true },
      options: industryOptions,
      placeholder: copy('Search industries', 'Cari industri'),
      required: true,
      type: 'searchable_multi_select',
      validation: { max_selections: 5, min_selections: 1 },
    }),
  ],
  section: copy('Your industry', 'Industri kamu'),
  section_progress: '1/2',
  subtitle: copy(
    'Pick up to 5 industries that describe your startup.',
    'Pilih hingga 5 industri yang menggambarkan startupmu.'
  ),
  title: copy(
    'Which industries are you in?',
    'Industri apa yang kamu geluti?'
  ),
} satisfies LocalizedOnboardingStepTemplate;

export const businessModelStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_business_model',
  overall_progress: { current: 7, total: 13 },
  questions: [
    question({
      id: 'q_business_model',
      label: copy('', ''),
      meta: { searchable: true },
      options: businessModelOptions,
      placeholder: copy('Search a business model', 'Cari model bisnis'),
      required: true,
      type: 'searchable_single_select',
      validation: { min_length: 1 },
    }),
  ],
  section: copy('Business model', 'Model bisnis'),
  section_progress: '2/2',
  subtitle: copy(
    'Pick the model that best describes how you make money.',
    'Pilih model yang paling menggambarkan cara kamu menghasilkan pendapatan.'
  ),
  title: copy(
    "What's your business model?",
    'Apa model bisnismu?'
  ),
} satisfies LocalizedOnboardingStepTemplate;

export const tractionStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_traction',
  overall_progress: { current: 7, total: 12 },
  questions: [
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'idea',
      },
      id: 'q_has_prototype',
      label: copy('Do you have a prototype?', 'Apakah kamu punya prototipe?'),
      options: yesNoOptions,
      required: true,
      type: 'single_select_chip',
      validation: { min_length: 1 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_has_prototype',
        value: 'yes',
      },
      id: 'q_prototype_link',
      label: copy('Prototype link', 'Link prototipe'),
      placeholder: copy(
        'https://figma.com/...',
        'https://figma.com/...'
      ),
      required: true,
      type: 'url',
      validation: { max_length: 200, min_length: 8 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'idea',
      },
      id: 'q_waitlist_size',
      label: copy('Waitlist size', 'Ukuran waitlist'),
      placeholder: copy('0', '0'),
      required: false,
      type: 'number',
      validation: { max: 10000000, min: 0 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'idea',
      },
      id: 'q_validation_methods',
      label: copy(
        'Validation so far',
        'Validasi sejauh ini'
      ),
      placeholder: copy(
        'Interviews, surveys, landing page tests...',
        'Wawancara, survei, landing page...'
      ),
      required: false,
      type: 'textarea',
      validation: { max_length: 300 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'mvp',
      },
      id: 'q_user_count',
      label: copy('Users', 'Pengguna'),
      placeholder: copy('0', '0'),
      required: true,
      type: 'number',
      validation: { max: 10000000, min: 0 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'mvp',
      },
      id: 'q_mau',
      label: copy('Monthly active users', 'Monthly active users'),
      placeholder: copy('0', '0'),
      required: false,
      type: 'number',
      validation: { max: 10000000, min: 0 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'mvp',
      },
      id: 'q_mvp_revenue',
      label: copy('Revenue (if any)', 'Pendapatan (jika ada)'),
      placeholder: copy('e.g. $500 MRR', 'misalnya $500 MRR'),
      required: false,
      type: 'text',
      validation: { max_length: 80 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'mvp',
      },
      id: 'q_growth_rate',
      label: copy('Growth rate', 'Growth rate'),
      placeholder: copy('e.g. 20% MoM', 'misalnya 20% MoM'),
      required: false,
      type: 'text',
      validation: { max_length: 80 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'live',
      },
      id: 'q_mrr',
      label: copy('MRR', 'MRR'),
      placeholder: copy('e.g. $5,000', 'misalnya $5,000'),
      required: true,
      type: 'text',
      validation: { max_length: 80, min_length: 1 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'live',
      },
      id: 'q_live_users',
      label: copy('Users / customers', 'Pengguna / pelanggan'),
      placeholder: copy('0', '0'),
      required: true,
      type: 'number',
      validation: { max: 100000000, min: 0 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'live',
      },
      id: 'q_retention',
      label: copy('Retention', 'Retention'),
      placeholder: copy(
        'e.g. 80% 3-month retention',
        'misalnya retensi 80% di bulan ke-3'
      ),
      required: false,
      type: 'text',
      validation: { max_length: 120 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'live',
      },
      id: 'q_key_metrics',
      label: copy(
        'Key metrics (GMV, etc.)',
        'Metrik utama (GMV, dll.)'
      ),
      placeholder: copy(
        'Anything else worth highlighting?',
        'Hal lain yang penting disorot?'
      ),
      required: false,
      type: 'textarea',
      validation: { max_length: 300 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'scale',
      },
      id: 'q_funding_raised',
      label: copy('Funding raised', 'Pendanaan'),
      placeholder: copy('e.g. $2M seed', 'misalnya $2M seed'),
      required: true,
      type: 'text',
      validation: { max_length: 120, min_length: 1 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'scale',
      },
      id: 'q_investors',
      label: copy('Investors (optional)', 'Investor (opsional)'),
      placeholder: copy(
        'e.g. East Ventures, Alpha JWC',
        'misalnya East Ventures, Alpha JWC'
      ),
      required: false,
      type: 'text',
      validation: { max_length: 200 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'scale',
      },
      id: 'q_scale_team_size',
      label: copy('Team size', 'Ukuran tim'),
      placeholder: copy('0', '0'),
      required: true,
      type: 'number',
      validation: { max: 10000, min: 1 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_startup_stage',
        value: 'scale',
      },
      id: 'q_arr',
      label: copy('Revenue / ARR', 'Pendapatan / ARR'),
      placeholder: copy('e.g. $1.2M ARR', 'misalnya $1.2M ARR'),
      required: true,
      type: 'text',
      validation: { max_length: 120, min_length: 1 },
    }),
  ],
  section: copy('Traction & milestones', 'Traction & milestones'),
  section_progress: '1/1',
  subtitle: copy(
    'Share where you stand today.',
    'Bagikan posisi startupmu saat ini.'
  ),
  title: copy('Your traction so far', 'Traction kamu sejauh ini'),
} satisfies LocalizedOnboardingStepTemplate;

export const onlinePresenceStep = {
  can_go_back: true,
  cta: {
    enabled_when: 'always',
    label: copy('Continue', 'Lanjut'),
  },
  id: 'step_online_presence',
  overall_progress: { current: 8, total: 12 },
  questions: [
    question({
      id: 'q_website',
      label: copy('Website', 'Website'),
      placeholder: copy('https://yourstartup.com', 'https://startupkamu.com'),
      required: false,
      type: 'url',
      validation: { max_length: 200 },
    }),
    question({
      id: 'q_startup_linkedin',
      label: copy('LinkedIn', 'LinkedIn'),
      placeholder: copy(
        'https://linkedin.com/company/...',
        'https://linkedin.com/company/...'
      ),
      required: false,
      type: 'url',
      validation: { max_length: 200 },
    }),
    question({
      id: 'q_twitter',
      label: copy('Twitter / X', 'Twitter / X'),
      placeholder: copy('@yourhandle', '@yourhandle'),
      required: false,
      type: 'text',
      validation: { max_length: 80 },
    }),
    question({
      id: 'q_instagram',
      label: copy('Instagram', 'Instagram'),
      placeholder: copy('@yourhandle', '@yourhandle'),
      required: false,
      type: 'text',
      validation: { max_length: 80 },
    }),
    question({
      helper_text: copy(
        'Optional, but founders love seeing your deck.',
        'Opsional, tapi founder lain suka lihat deck kamu.'
      ),
      id: 'q_pitch_deck',
      label: copy('Pitch deck', 'Pitch deck'),
      placeholder: copy(
        'https://pitch.com/...',
        'https://pitch.com/...'
      ),
      required: false,
      type: 'url',
      validation: { max_length: 200 },
    }),
  ],
  section: copy('Online presence', 'Online presence'),
  section_progress: '1/1',
  subtitle: copy(
    'Drop any links you want to share.',
    'Tempel link yang ingin kamu bagikan.'
  ),
  title: copy(
    'Where can people find you?',
    'Di mana orang bisa menemukanmu?'
  ),
} satisfies LocalizedOnboardingStepTemplate;

export const founderSetupStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_founder_setup',
  overall_progress: { current: 9, total: 13 },
  questions: [
    question({
      id: 'q_founder_count',
      label: copy('', ''),
      options: founderCountOptions,
      required: true,
      type: 'single_select_card',
      validation: { min_length: 1 },
    }),
    question({
      depends_on: {
        operator: 'not_equals',
        question_id: 'q_founder_count',
        value: 'solo',
      },
      id: 'q_covered_roles',
      label: copy(
        'What roles are already covered?',
        'Peran apa yang sudah ada?'
      ),
      options: coveredRolesOptions,
      required: true,
      type: 'multi_select_chip',
      validation: { min_selections: 1 },
    }),
  ],
  section: copy('Founder setup', 'Setup founder'),
  section_progress: '1/2',
  subtitle: copy(
    'Tell us how your founding team looks today.',
    'Ceritakan bagaimana tim foundermu saat ini.'
  ),
  title: copy(
    'How many founders are you?',
    'Berapa jumlah foundermu?'
  ),
} satisfies LocalizedOnboardingStepTemplate;

export const teamPresenceStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_team_presence',
  overall_progress: { current: 10, total: 13 },
  questions: [
    question({
      id: 'q_has_team',
      label: copy('', ''),
      options: yesNoOptions,
      required: true,
      type: 'single_select_card',
      validation: { min_length: 1 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_has_team',
        value: 'yes',
      },
      id: 'q_team_size',
      label: copy('Team size', 'Ukuran tim'),
      options: teamSizeOptions,
      required: true,
      type: 'single_select_card',
      validation: { min_length: 1 },
    }),
    question({
      depends_on: {
        operator: 'equals',
        question_id: 'q_has_team',
        value: 'yes',
      },
      id: 'q_team_roles',
      label: copy('Team roles', 'Peran tim'),
      options: startupTeamRoleOptions,
      required: true,
      type: 'multi_select_chip',
      validation: { min_selections: 1 },
    }),
  ],
  section: copy('Team presence', 'Status tim'),
  section_progress: '2/2',
  subtitle: copy(
    'Is there anyone beyond the founders?',
    'Apakah ada tim selain founder?'
  ),
  title: copy(
    'Do you have a team beyond founders?',
    'Apakah kamu punya tim di luar founder?'
  ),
} satisfies LocalizedOnboardingStepTemplate;

export const skillsNeededStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_skills_needed',
  overall_progress: { current: 13, total: 13 },
  questions: [
    question({
      id: 'q_skills_needed',
      label: copy('', ''),
      meta: { searchable: true },
      options: skillOptions,
      placeholder: copy('Search skills', 'Cari skill'),
      required: true,
      type: 'searchable_multi_select',
      validation: { max_selections: 10, min_selections: 1 },
    }),
  ],
  section: copy('Skills you need', 'Skill yang kamu butuhkan'),
  section_progress: '1/1',
  subtitle: copy(
    'Pick the skills your team is missing.',
    'Pilih skill yang belum ada di tim kamu.'
  ),
  title: copy(
    'What skills are you missing?',
    'Skill apa yang belum kamu punya?'
  ),
} satisfies LocalizedOnboardingStepTemplate;

const workPreferencesSection = copy(
  'Work preferences',
  'Preferensi kerja'
);

export const openToRemoteStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_open_to_remote',
  overall_progress: { current: 11, total: 13 },
  questions: [
    question({
      id: 'q_open_to_remote',
      label: copy('', ''),
      meta: { auto_advance: true, layout: 'list' },
      options: yesNoOptions,
      required: true,
      type: 'single_select_card',
      validation: { min_length: 1 },
    }),
  ],
  section: workPreferencesSection,
  section_progress: '1/2',
  subtitle: copy(
    'Remote-friendly teams welcome collaborators from anywhere.',
    'Tim yang remote-friendly menerima kolaborator dari mana saja.'
  ),
  title: copy('Are you open to working remotely?', 'Apakah kamu terbuka untuk kerja remote?'),
} satisfies LocalizedOnboardingStepTemplate;

export const willingToRelocateStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_willing_to_relocate',
  overall_progress: { current: 12, total: 13 },
  questions: [
    question({
      id: 'q_willing_to_relocate',
      label: copy('', ''),
      meta: { auto_advance: true, layout: 'list' },
      options: yesNoOptions,
      required: true,
      type: 'single_select_card',
      validation: { min_length: 1 },
    }),
  ],
  section: workPreferencesSection,
  section_progress: '2/2',
  subtitle: copy(
    'Some opportunities require moving. Let us know if you are open to it.',
    'Beberapa peluang butuh pindah lokasi. Beri tahu jika kamu terbuka.'
  ),
  title: copy(
    'Are you willing to relocate?',
    'Apakah kamu bersedia relokasi?'
  ),
} satisfies LocalizedOnboardingStepTemplate;

export const experienceStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_experience',
  overall_progress: { current: 6, total: 13 },
  questions: [
    question({
      id: 'q_startup_experience',
      label: copy('', ''),
      meta: { auto_advance: true, layout: 'list' },
      options: startupExperienceOptions,
      required: true,
      type: 'single_select_card',
      validation: { min_length: 1 },
    }),
  ],
  section: copy("Let's build your talent profile", 'Mari bangun profil talentamu'),
  section_progress: '3/3',
  subtitle: copy(
    'This helps us match you with the right stage of companies.',
    'Ini membantu kami mencocokkanmu dengan perusahaan di tahap yang tepat.'
  ),
  title: copy(
    'How much startup experience do you have?',
    'Seberapa besar pengalaman startupmu?'
  ),
} satisfies LocalizedOnboardingStepTemplate;

export const industriesInterestStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_industries_interest',
  overall_progress: { current: 7, total: 9 },
  questions: [
    question({
      id: 'q_industries_interest',
      label: copy('', ''),
      meta: { searchable: true },
      options: industryOptions,
      placeholder: copy('Search industries', 'Cari industri'),
      required: true,
      type: 'searchable_multi_select',
      validation: { max_selections: 5, min_selections: 1 },
    }),
  ],
  section: copy('How and where you work', 'Bagaimana dan di mana kamu bekerja'),
  section_progress: '3/4',
  subtitle: copy(
    'Pick up to 5 industries to shape your feed.',
    'Pilih hingga 5 industri untuk membentuk feed kamu.'
  ),
  title: copy('What industries interest you?', 'Industri apa yang menarik minatmu?'),
} satisfies LocalizedOnboardingStepTemplate;

export const availabilityStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_availability',
  overall_progress: { current: 10, total: 13 },
  questions: [
    question({
      id: 'q_availability',
      label: copy('', ''),
      meta: { auto_advance: true, layout: 'list' },
      options: availabilityOptions,
      required: true,
      type: 'single_select_card',
      validation: { min_length: 1 },
    }),
  ],
  section: copy('Work preferences', 'Preferensi kerja'),
  section_progress: '1/3',
  subtitle: copy(
    'What commitment level should candidates have?',
    'Level komitmen seperti apa yang diharapkan dari kandidat?'
  ),
  title: copy('What availability do you expect?', 'Availability seperti apa yang kamu harapkan?'),
} satisfies LocalizedOnboardingStepTemplate;

export const primaryRoleStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_primary_role',
  overall_progress: { current: 7, total: 9 },
  questions: [
    question({
      id: 'q_primary_role',
      label: copy('Select your primary role', 'Pilih peran utama kamu'),
      meta: { searchable: true },
      options: primaryRoleOptions,
      placeholder: copy('Search your primary role', 'Cari peran utama kamu'),
      required: true,
      type: 'searchable_dropdown',
      validation: { min_length: 1 },
    }),
    question({
      id: 'q_years_experience',
      label: copy('Years of experience', 'Jumlah tahun pengalaman'),
      placeholder: copy('3', '3'),
      required: true,
      type: 'number',
      validation: { max: 40, min: 0 },
    }),
  ],
  section: copy("Let's build your talent profile", 'Mari bangun profil talentamu'),
  section_progress: '1/2',
  subtitle: copy(
    'Search across engineering, product, design, ops, and more.',
    'Cari di engineering, produk, desain, operasional, dan lainnya.'
  ),
  title: copy(
    'Which role best describes you primarily?',
    'Peran mana yang paling menggambarkanmu saat ini?'
  ),
} satisfies LocalizedOnboardingStepTemplate;

export const skillsStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_skills',
  overall_progress: { current: 9, total: 13 },
  questions: [
    question({
      id: 'q_skills',
      label: copy('', ''),
      meta: { searchable: true },
      options: skillOptions,
      placeholder: copy('Search skills', 'Cari skill'),
      required: true,
      type: 'searchable_multi_select',
      validation: { max_selections: 10, min_selections: 1 },
    }),
  ],
  section: copy('Your skills', 'Skill kamu'),
  section_progress: '1/1',
  subtitle: copy(
    'Pick the skills you bring to the table.',
    'Pilih skill yang kamu bawa ke tim.'
  ),
  title: copy('What skills do you have?', 'Skill apa yang kamu miliki?'),
} satisfies LocalizedOnboardingStepTemplate;

export const cashEquityStep = {
  can_go_back: true,
  cta: continueCta,
  id: 'step_cash_equity',
  overall_progress: { current: 10, total: 14 },
  questions: [
    question({
      id: 'q_cash_equity_expectation',
      label: copy(
        "What's your cash-equity expectation?",
        'Bagaimana ekspektasimu untuk cash dan equity?'
      ),
      options: cashEquityExpectationOptions,
      required: true,
      type: 'single_select_radio',
      validation: { min_length: 1 },
    }),
    question({
      id: 'q_has_salary_minimum',
      label: copy(
        'Do you have an expected minimum salary?',
        'Apakah kamu punya ekspektasi minimum gaji?'
      ),
      options: salaryMinimumOptions,
      required: true,
      type: 'single_select_radio',
      validation: { min_length: 1 },
    }),
    question({
      depends_on: {
        operator: 'in',
        question_id: 'q_has_salary_minimum',
        value: ['yes_strict', 'yes_flexible'],
      },
      id: 'q_salary_period',
      label: copy(
        'What minimum salary are you looking for?',
        'Berapa minimum gaji yang kamu harapkan?'
      ),
      options: salaryPeriodOptions,
      required: true,
      type: 'segmented',
      validation: { min_length: 1 },
    }),
    question({
      depends_on: {
        operator: 'in',
        question_id: 'q_has_salary_minimum',
        value: ['yes_strict', 'yes_flexible'],
      },
      id: 'q_minimum_salary',
      label: copy('', ''),
      meta: {
        amount_label: 'Salary amount',
        amount_placeholder: '5000',
        currency_label: 'Currency',
      },
      options: currencyOptions,
      required: true,
      type: 'currency_amount',
    }),
  ],
  section: copy('Compensation expectations', 'Ekspektasi kompensasi'),
  section_progress: '1/1',
  subtitle: copy(
    'Share what you need so we match you with aligned opportunities.',
    'Bagikan ekspektasimu agar kami mencocokkanmu dengan peluang yang sesuai.'
  ),
  title: copy('Your compensation', 'Ekspektasi kompensasi'),
} satisfies LocalizedOnboardingStepTemplate;

export const credibilityStep = {
  can_go_back: true,
  cta: {
    enabled_when: 'valid',
    label: copy('Finish', 'Selesai'),
  },
  id: 'step_credibility',
  overall_progress: { current: 13, total: 13 },
  questions: [
    question({
      helper_text: copy(
        "We'll automatically fetch your experience, skills, and photo from LinkedIn so you can edit them next.",
        'Kami akan otomatis mengambil pengalaman, skill, dan foto dari LinkedIn. Kamu bisa edit setelahnya.'
      ),
      id: 'q_linkedin_url',
      label: copy('LinkedIn URL', 'URL LinkedIn'),
      placeholder: copy('https://linkedin.com/in/your-name', 'https://linkedin.com/in/namamu'),
      required: true,
      type: 'url',
      validation: { max_length: 200, min_length: 10 },
    }),
  ],
  section: copy('Finish up', 'Penutup'),
  section_progress: '1/1',
  subtitle: copy(
    'Drop your LinkedIn so we can fill in the rest of your profile automatically.',
    'Tempel link LinkedIn agar kami bisa mengisi sisa profil kamu otomatis.'
  ),
  title: copy('Last step. Share your LinkedIn', 'Langkah terakhir. Bagikan LinkedIn-mu'),
} satisfies LocalizedOnboardingStepTemplate;

export const sharedCompensationQuestions = {
  cashEquityExpectation: question({
    id: 'q_cash_equity_expectation',
    label: copy('What is your cash-equity expectation?', 'Bagaimana ekspektasimu untuk cash dan equity?'),
    options: [
      {
        ...currencyOptions[0],
        id: 'opt_comp_cash_first',
        label: copy('Cash first', 'Utamakan cash'),
        value: 'cash_first',
      },
      {
        ...currencyOptions[1],
        id: 'opt_comp_balanced',
        label: copy('Balanced', 'Seimbang'),
        value: 'balanced',
      },
      {
        ...currencyOptions[2],
        id: 'opt_comp_equity_first',
        label: copy('Equity first', 'Utamakan equity'),
        value: 'equity_first',
      },
    ],
    required: true,
    type: 'segmented',
    validation: { min_length: 1 },
  }),
  founderSummary: question({
    id: 'q_founder_summary',
    label: copy('Describe what you are building and who would thrive with you.', 'Jelaskan apa yang sedang kamu bangun dan siapa yang akan cocok bergabung denganmu.'),
    placeholder: copy(
      'We are building an AI workflow product for operations teams...',
      'Kami sedang membangun produk workflow AI untuk tim operasional...'
    ),
    required: true,
    type: 'textarea',
    validation: { max_length: 500, min_length: 30 },
  }),
  minSalary: question({
    depends_on: {
      operator: 'in',
      question_id: 'q_min_salary_preference',
      value: ['strict', 'flexible'],
    },
    id: 'q_min_salary',
    label: copy('Minimum salary expectation', 'Ekspektasi minimum gaji'),
    meta: {
      amount_label: 'Amount',
      amount_placeholder: '5000',
      currency_label: 'Currency',
    },
    options: currencyOptions,
    required: true,
    type: 'currency_amount',
  }),
  minSalaryPreference: question({
    id: 'q_min_salary_preference',
    label: copy('What is your minimum salary preference?', 'Bagaimana preferensi minimum gajimu?'),
    options: salaryPreferenceOptions,
    required: true,
    type: 'single_select_radio',
    validation: { min_length: 1 },
  }),
  startupDescription: question({
    id: 'q_startup_description',
    label: copy('Describe your startup in a few sentences.', 'Jelaskan startupmu dalam beberapa kalimat.'),
    placeholder: copy(
      'What problem do you solve, and what kind of people do you want to attract?',
      'Masalah apa yang kamu selesaikan, dan orang seperti apa yang ingin kamu tarik?'
    ),
    required: true,
    type: 'textarea',
    validation: { max_length: 500, min_length: 30 },
  }),
} as const;
