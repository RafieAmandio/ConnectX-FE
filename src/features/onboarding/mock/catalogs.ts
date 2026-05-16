import type {
  LocalizedOnboardingOption,
  LocalizedText,
} from '../types/onboarding.types';

type OptionConfig = {
  group?: LocalizedText | null;
  icon?: string | null;
  subLabel?: LocalizedText | null;
};

export function copy(en: string, id?: string): LocalizedText {
  return {
    en,
    id: id ?? en,
  };
}

export function option(
  id: string,
  value: string,
  label: LocalizedText,
  config: OptionConfig = {}
): LocalizedOnboardingOption {
  return {
    group: config.group ?? null,
    icon: config.icon ?? null,
    id,
    label,
    sub_label: config.subLabel ?? null,
    value,
  };
}

export const yesNoOptions = [
  option('opt_yes', 'yes', copy('Yes', 'Ya'), { icon: 'yes' }),
  option('opt_no', 'no', copy('No', 'Tidak'), { icon: 'no' }),
] satisfies LocalizedOnboardingOption[];

export const genderOptions = [
  option('opt_gender_female', 'female', copy('Female', 'Perempuan'), {
    icon: 'female',
  }),
  option('opt_gender_male', 'male', copy('Male', 'Laki-laki'), {
    icon: 'male',
  }),
] satisfies LocalizedOnboardingOption[];

export const useConnectxOptions = [
  option('opt_builder', 'builder', copy("I'm a Builder", 'Saya seorang Builder'), {
    icon: 'team',
    subLabel: copy(
      'Founder, co-founder, or team member',
      'Founder, co-founder, atau anggota tim'
    ),
  }),
  option('opt_startup', 'startup', copy('I represent a Startup', 'Saya mewakili Startup'), {
    icon: 'rocket',
    subLabel: copy(
      'Building a team or hiring co-founders',
      'Sedang membangun tim atau mencari co-founder'
    ),
  }),
] satisfies LocalizedOnboardingOption[];

export const builderTypeOptions = [
  option('opt_builder_founder', 'founder', copy('Founder', 'Founder'), {
    icon: 'founder_rocket',
    subLabel: copy(
      "I'm building something and looking for people",
      'Saya sedang membangun sesuatu dan mencari orang'
    ),
  }),
  option('opt_builder_cofounder', 'cofounder', copy('Co-Founder', 'Co-Founder'), {
    icon: 'cofounder_handshake',
    subLabel: copy(
      'I want to join a startup as a co-founder',
      'Saya ingin bergabung sebagai co-founder'
    ),
  }),
  option('opt_builder_team_member', 'team_member', copy('Team Member', 'Anggota Tim'), {
    icon: 'team_member_group',
    subLabel: copy('I want to join a startup team', 'Saya ingin bergabung di tim startup'),
  }),
] satisfies LocalizedOnboardingOption[];

export const founderGoalOptions = [
  option('opt_goal_cofounder', 'cofounder', copy('Co-Founder', 'Co-Founder'), {
    icon: 'goal_cofounder',
    subLabel: copy(
      'Find someone to build with from day one',
      'Temukan partner untuk membangun bersama sejak awal'
    ),
  }),
  option('opt_goal_team_members', 'team_members', copy('Team Members', 'Anggota Tim'), {
    icon: 'goal_team_members',
    subLabel: copy(
      'Recruit early members for your startup',
      'Rekrut anggota awal untuk startupmu'
    ),
  }),
  option('opt_goal_both', 'both', copy('Both', 'Keduanya'), {
    icon: 'goal_both',
    subLabel: copy(
      "I'm open to co-founders and team members",
      'Saya terbuka untuk co-founder dan anggota tim'
    ),
  }),
] satisfies LocalizedOnboardingOption[];

export const startupStageOptions = [
  option('opt_stage_idea', 'idea', copy('Idea', 'Ide')),
  option('opt_stage_mvp', 'mvp', copy('MVP', 'MVP')),
  option('opt_stage_live', 'live', copy('Live', 'Sudah Launching')),
  option(
    'opt_stage_scale',
    'scale',
    copy('Scale (Seed / Series A)', 'Scale (Seed / Series A)')
  ),
] satisfies LocalizedOnboardingOption[];

export const cityOptions = [
  option('opt_city_jakarta', 'jakarta', copy('Jakarta, Indonesia', 'Jakarta, Indonesia'), {
    group: copy('Indonesia', 'Indonesia'),
  }),
  option('opt_city_bandung', 'bandung', copy('Bandung, Indonesia', 'Bandung, Indonesia'), {
    group: copy('Indonesia', 'Indonesia'),
  }),
  option('opt_city_yogyakarta', 'yogyakarta', copy('Yogyakarta, Indonesia', 'Yogyakarta, Indonesia'), {
    group: copy('Indonesia', 'Indonesia'),
  }),
  option('opt_city_singapore', 'singapore', copy('Singapore, Singapore', 'Singapura, Singapura'), {
    group: copy('Singapore', 'Singapura'),
  }),
  option('opt_city_bangalore', 'bangalore', copy('Bangalore, India', 'Bangalore, India'), {
    group: copy('India', 'India'),
  }),
  option('opt_city_hcmc', 'hcmc', copy('Ho Chi Minh City, Vietnam', 'Ho Chi Minh City, Vietnam'), {
    group: copy('Vietnam', 'Vietnam'),
  }),
  option('opt_city_dubai', 'dubai', copy('Dubai, United Arab Emirates', 'Dubai, Uni Emirat Arab'), {
    group: copy('United Arab Emirates', 'Uni Emirat Arab'),
  }),
] satisfies LocalizedOnboardingOption[];

export const locationBasedOptions = [
  option('opt_location_remote', 'remote', copy('Remote', 'Remote'), {
    group: copy('Flexible', 'Fleksibel'),
  }),
  option('opt_location_anywhere', 'anywhere', copy('Anywhere', 'Di Mana Saja'), {
    group: copy('Flexible', 'Fleksibel'),
  }),
  option('opt_location_jakarta', 'jakarta', copy('Jakarta', 'Jakarta'), {
    group: copy('City Hubs', 'Kota Utama'),
  }),
  option('opt_location_singapore', 'singapore', copy('Singapore', 'Singapura'), {
    group: copy('City Hubs', 'Kota Utama'),
  }),
  option('opt_location_bangalore', 'bangalore', copy('Bangalore', 'Bangalore'), {
    group: copy('City Hubs', 'Kota Utama'),
  }),
  option('opt_location_hcmc', 'hcmc', copy('Ho Chi Minh City', 'Ho Chi Minh City'), {
    group: copy('City Hubs', 'Kota Utama'),
  }),
  option('opt_location_dubai', 'dubai', copy('Dubai', 'Dubai'), {
    group: copy('City Hubs', 'Kota Utama'),
  }),
] satisfies LocalizedOnboardingOption[];

export const remotePreferenceOptions = [
  option('opt_remote_hybrid', 'hybrid', copy('Hybrid', 'Hybrid')),
  option('opt_remote_onsite', 'onsite', copy('Onsite', 'Onsite')),
  option('opt_remote_preferred', 'remote_preferred', copy('Remote preferred', 'Lebih suka remote')),
  option('opt_remote_only', 'remote_only', copy('Remote only', 'Hanya remote')),
] satisfies LocalizedOnboardingOption[];

export const relocateOptions = [
  option('opt_relocate_yes', 'yes', copy('Yes, if the fit is right', 'Ya, jika cocok')),
  option('opt_relocate_maybe', 'maybe', copy('Maybe for the right role', 'Mungkin untuk peran yang tepat')),
  option('opt_relocate_no', 'no', copy('No, I want to stay put', 'Tidak, saya ingin tetap di lokasi sekarang')),
] satisfies LocalizedOnboardingOption[];

export const startupExperienceOptions = [
  option('opt_exp_founded', 'founded', copy('Founded a startup', 'Pernah mendirikan startup'), {
    icon: 'exp_founded',
    subLabel: copy(
      'I started a company from scratch',
      'Saya memulai perusahaan dari nol'
    ),
  }),
  option('opt_exp_built', 'built', copy('Built products at a startup', 'Pernah membangun produk di startup'), {
    icon: 'exp_built',
    subLabel: copy(
      'I shipped real products inside a startup',
      'Saya pernah merilis produk nyata di dalam startup'
    ),
  }),
  option('opt_exp_worked', 'worked', copy('Worked in a startup team', 'Pernah bekerja di tim startup'), {
    icon: 'exp_worked',
    subLabel: copy(
      'I contributed to a startup team before',
      'Saya pernah berkontribusi di tim startup'
    ),
  }),
  option('opt_exp_none', 'none', copy('New to startups', 'Baru di dunia startup'), {
    icon: 'exp_none',
    subLabel: copy(
      'No direct startup experience yet',
      'Belum punya pengalaman startup langsung'
    ),
  }),
] satisfies LocalizedOnboardingOption[];

function buildIndustries(
  groupEn: string,
  groupId: string,
  items: { value: string; label: string }[]
): LocalizedOnboardingOption[] {
  return items.map((item) =>
    option(`opt_industry_${item.value}`, item.value, copy(item.label, item.label), {
      group: copy(groupEn, groupId),
    })
  );
}

export const industryOptions = [
  ...buildIndustries('Core Technology', 'Teknologi Inti', [
    { label: 'AI', value: 'ai' },
    { label: 'Generative Tech/AI', value: 'generative_tech_ai' },
    { label: 'DeepTech', value: 'deeptech' },
    { label: 'AR/VR', value: 'ar_vr' },
    { label: 'IoT', value: 'iot' },
    { label: 'Robotics', value: 'robotics' },
    { label: 'Semiconductors', value: 'semiconductors' },
    { label: 'Cloud Infrastructure', value: 'cloud_infrastructure' },
    { label: 'Developer Tools', value: 'developer_tools' },
    { label: 'Security', value: 'security' },
    { label: 'Data Services', value: 'data_services' },
    { label: 'Analytics', value: 'analytics' },
  ]),
  ...buildIndustries('Software & Digital Products', 'Software & Produk Digital', [
    { label: 'SaaS', value: 'saas' },
    { label: 'SMB Software', value: 'smb_software' },
    { label: 'Productivity Tools', value: 'productivity_tools' },
    { label: 'Sales & CRM', value: 'sales_crm' },
    { label: 'Enterprise', value: 'enterprise' },
    { label: 'Messaging', value: 'messaging' },
    { label: 'Social Networks', value: 'social_networks' },
  ]),
  ...buildIndustries('Consumer & Marketplace', 'Konsumen & Marketplace', [
    { label: 'E-commerce', value: 'ecommerce' },
    { label: 'Marketplaces', value: 'marketplaces' },
    { label: 'Direct-to-Consumer (DTC)', value: 'dtc' },
    { label: 'Retail', value: 'retail' },
    { label: 'Fashion', value: 'fashion' },
    { label: 'Cosmetics', value: 'cosmetics' },
    { label: 'Food and Beverage', value: 'food_and_beverage' },
    { label: 'Creator/Passion Economy', value: 'creator_passion_economy' },
  ]),
  ...buildIndustries('Finance & Business Infrastructure', 'Keuangan & Infrastruktur Bisnis', [
    { label: 'FinTech', value: 'fintech' },
    { label: 'Payments', value: 'payments' },
    { label: 'Insurance', value: 'insurance' },
    { label: 'LegalTech', value: 'legaltech' },
    { label: 'Human Capital/HRTech', value: 'hrtech' },
  ]),
  ...buildIndustries('Industry-Specific Solutions', 'Solusi Spesifik Industri', [
    { label: 'Healthcare', value: 'healthcare' },
    { label: 'Medical Devices', value: 'medical_devices' },
    { label: 'Pharmaceuticals', value: 'pharmaceuticals' },
    { label: 'Education', value: 'education' },
    { label: 'EnergyTech', value: 'energytech' },
    { label: 'ClimateTech/CleanTech', value: 'climatetech' },
    { label: 'AgTech', value: 'agtech' },
    { label: 'ConstructionTech', value: 'constructiontech' },
    { label: 'Manufacturing', value: 'manufacturing' },
    { label: 'Logistics', value: 'logistics' },
    { label: 'Supply Chain Tech', value: 'supply_chain_tech' },
    { label: 'TransportationTech', value: 'transportationtech' },
    { label: 'Real Estate/PropTech', value: 'proptech' },
    { label: 'GovTech', value: 'govtech' },
  ]),
  ...buildIndustries('Media, Lifestyle & Experience', 'Media, Gaya Hidup & Pengalaman', [
    { label: 'Gaming', value: 'gaming' },
    { label: 'Entertainment & Sports', value: 'entertainment_sports' },
    { label: 'Media/Content', value: 'media_content' },
    { label: 'Travel', value: 'travel' },
    { label: 'Lodging/Hospitality', value: 'lodging_hospitality' },
    { label: 'Wellness & Fitness', value: 'wellness_fitness' },
    { label: 'Mental Health', value: 'mental_health' },
    { label: 'Parenting/Families', value: 'parenting_families' },
  ]),
  ...buildIndustries('Emerging & Future', 'Emerging & Masa Depan', [
    { label: 'Web3/Blockchain', value: 'web3_blockchain' },
    { label: 'Space', value: 'space' },
    { label: 'Smart Cities/UrbanTech', value: 'smart_cities' },
    { label: 'Future of Work', value: 'future_of_work' },
    { label: 'Gig Economy', value: 'gig_economy' },
    { label: 'Social Impact', value: 'social_impact' },
    { label: 'Hardware', value: 'hardware' },
    { label: 'Material Science', value: 'material_science' },
  ]),
] satisfies LocalizedOnboardingOption[];

export const availabilityOptions = [
  option('opt_availability_full_time', 'full_time', copy('Full-time', 'Full-time'), {
    icon: 'availability_full_time',
    subLabel: copy(
      'Candidates must be fully committed',
      'Kandidat harus berkomitmen penuh'
    ),
  }),
  option('opt_availability_part_time', 'part_time', copy('Part-time', 'Part-time'), {
    icon: 'availability_part_time',
    subLabel: copy(
      'Open to candidates with other commitments',
      'Terbuka untuk kandidat dengan komitmen lain'
    ),
  }),
  option('opt_availability_flexible', 'flexible', copy('Flexible / Hybrid', 'Fleksibel / Hybrid'), {
    icon: 'availability_flexible',
    subLabel: copy(
      'Open to discuss arrangement',
      'Terbuka untuk diskusi pengaturan'
    ),
  }),
] satisfies LocalizedOnboardingOption[];

function buildRoles(
  groupEn: string,
  groupId: string,
  roles: { value: string; en: string; id?: string }[]
): LocalizedOnboardingOption[] {
  return roles.map((role) =>
    option(`opt_role_${role.value}`, role.value, copy(role.en, role.id ?? role.en), {
      group: copy(groupEn, groupId),
    })
  );
}

export const primaryRoleOptions = [
  ...buildRoles('Engineering, IT & Technical', 'Engineering, IT & Teknis', [
    { en: 'Frontend Engineer', value: 'frontend_engineer' },
    { en: 'Backend Engineer', value: 'backend_engineer' },
    { en: 'Full Stack Engineer', value: 'fullstack_engineer' },
    { en: 'Mobile Developer', value: 'mobile_developer' },
    { en: 'DevOps Engineer', value: 'devops_engineer' },
    { en: 'Site Reliability Engineer (SRE)', value: 'sre' },
    { en: 'Cloud Engineer', value: 'cloud_engineer' },
    { en: 'Solution Architect', value: 'solution_architect' },
    { en: 'Software Architect', value: 'software_architect' },
    { en: 'QA / Test Engineer', value: 'qa_engineer' },
    { en: 'Security Engineer', value: 'security_engineer' },
    { en: 'Embedded Systems Engineer', value: 'embedded_engineer' },
    { en: 'Game Developer', value: 'game_developer' },
    { en: 'Blockchain / Web3 Developer', value: 'blockchain_developer' },
  ]),
  ...buildRoles(
    'Construction, Property & Engineering',
    'Konstruksi, Properti & Engineering',
    [
      { en: 'Civil Engineer', value: 'civil_engineer' },
      { en: 'Structural Engineer', value: 'structural_engineer' },
      { en: 'Architect', value: 'architect' },
      { en: 'Landscape Designer', value: 'landscape_designer' },
      { en: 'Quantity Surveyor', value: 'quantity_surveyor' },
      {
        en: 'Project Construction Manager',
        value: 'construction_project_manager',
      },
      { en: 'Real Estate Developer', value: 'real_estate_developer' },
      { en: 'Property Manager', value: 'property_manager' },
    ]
  ),
  ...buildRoles('F&B (Food & Beverage)', 'F&B (Food & Beverage)', [
    { en: 'Chef', value: 'chef' },
    { en: 'Head Chef', value: 'head_chef' },
    { en: 'F&B Manager', value: 'fnb_manager' },
    { en: 'Restaurant Manager', value: 'restaurant_manager' },
    { en: 'Bar Manager', value: 'bar_manager' },
    { en: 'Product Development (Food)', value: 'food_product_development' },
    { en: 'Kitchen Operations Manager', value: 'kitchen_operations_manager' },
    { en: 'Franchise Manager', value: 'franchise_manager' },
  ]),
  ...buildRoles('Design & Creative', 'Desain & Kreatif', [
    { en: 'UI/UX Designer', value: 'uiux_designer' },
    { en: 'Graphic Designer', value: 'graphic_designer' },
    { en: 'Brand Designer', value: 'brand_designer' },
    { en: 'Interior Designer', value: 'interior_designer' },
    { en: 'Motion Designer', value: 'motion_designer' },
    { en: '3D Designer', value: 'three_d_designer' },
    { en: 'Creative Director', value: 'creative_director' },
    { en: 'Fashion Designer', value: 'fashion_designer' },
  ]),
  ...buildRoles('Marketing & Growth', 'Marketing & Growth', [
    { en: 'Growth Marketer', value: 'growth_marketer' },
    { en: 'Digital Marketer', value: 'digital_marketer' },
    { en: 'Performance Marketer', value: 'performance_marketer' },
    { en: 'SEO Specialist', value: 'seo_specialist' },
    { en: 'Social Media Manager', value: 'social_media_manager' },
    { en: 'Content Strategist', value: 'content_strategist' },
    { en: 'Brand Manager', value: 'brand_manager' },
    { en: 'PR & Communications', value: 'pr_communications' },
  ]),
  ...buildRoles(
    'Sales, Business Dev & Partnerships',
    'Sales, BD & Partnership',
    [
      { en: 'Sales Executive', value: 'sales_executive' },
      { en: 'Business Development Manager', value: 'bizdev_manager' },
      { en: 'Partnerships Manager', value: 'partnerships_manager' },
      { en: 'Account Manager', value: 'account_manager' },
      { en: 'Customer Success Manager', value: 'customer_success_manager' },
      { en: 'Real Estate Agent', value: 'real_estate_agent' },
      {
        en: 'Franchise Development Manager',
        value: 'franchise_development_manager',
      },
    ]
  ),
  ...buildRoles('Operations & Supply Chain', 'Operasional & Supply Chain', [
    { en: 'Operations Manager', value: 'operations_manager' },
    { en: 'Project Manager', value: 'project_manager' },
    { en: 'Logistics Manager', value: 'logistics_manager' },
    { en: 'Supply Chain Manager', value: 'supply_chain_manager' },
    { en: 'Procurement Specialist', value: 'procurement_specialist' },
    { en: 'Warehouse Manager', value: 'warehouse_manager' },
  ]),
  ...buildRoles('Finance, Investment & Legal', 'Finance, Investasi & Legal', [
    { en: 'Finance Manager', value: 'finance_manager' },
    { en: 'Financial Analyst', value: 'financial_analyst' },
    { en: 'Investment Analyst', value: 'investment_analyst' },
    { en: 'Venture Capital Associate', value: 'vc_associate' },
    { en: 'Accountant', value: 'accountant' },
    { en: 'Auditor', value: 'auditor' },
    { en: 'Legal Counsel', value: 'legal_counsel' },
    { en: 'Compliance Officer', value: 'compliance_officer' },
  ]),
  ...buildRoles('Data, AI & Analytics', 'Data, AI & Analitik', [
    { en: 'Data Analyst', value: 'data_analyst' },
    { en: 'Data Scientist', value: 'data_scientist' },
    { en: 'Machine Learning Engineer', value: 'ml_engineer' },
    { en: 'AI Engineer', value: 'ai_engineer' },
    { en: 'BI Analyst', value: 'bi_analyst' },
  ]),
  ...buildRoles('Media, Content & Entertainment', 'Media, Konten & Hiburan', [
    { en: 'Content Creator', value: 'content_creator' },
    { en: 'Video Editor', value: 'video_editor' },
    { en: 'Producer', value: 'producer' },
    { en: 'Photographer', value: 'photographer' },
    { en: 'Scriptwriter', value: 'scriptwriter' },
    { en: 'Creative Strategist', value: 'creative_strategist' },
  ]),
  ...buildRoles('HR, Talent & People', 'HR, Talent & People', [
    { en: 'HR Manager', value: 'hr_manager' },
    { en: 'Recruiter', value: 'recruiter' },
    { en: 'Talent Acquisition', value: 'talent_acquisition' },
    { en: 'People Operations', value: 'people_operations' },
  ]),
  ...buildRoles('Emerging & Specialized', 'Emerging & Spesialisasi', [
    { en: 'Web3 Developer', value: 'web3_developer' },
    { en: 'Tokenomics Specialist', value: 'tokenomics_specialist' },
    { en: 'No-Code Builder', value: 'no_code_builder' },
    { en: 'Automation Specialist', value: 'automation_specialist' },
  ]),
] satisfies LocalizedOnboardingOption[];

function buildSkills(
  groupEn: string,
  groupId: string,
  skills: { value: string; en: string; id?: string }[]
): LocalizedOnboardingOption[] {
  return skills.map((skill) =>
    option(
      `opt_talent_skill_${skill.value}`,
      skill.value,
      copy(skill.en, skill.id ?? skill.en),
      {
        group: copy(groupEn, groupId),
      }
    )
  );
}

export const skillOptions = [
  ...buildSkills('Engineering, IT & Technical', 'Engineering, IT & Teknis', [
    { en: 'React / Angular / Vue', value: 'react_angular_vue' },
    { en: 'Node.js / Java / Python / Go', value: 'backend_languages' },
    { en: 'API Design & Integration', value: 'api_design' },
    { en: 'System Architecture', value: 'system_architecture' },
    { en: 'Microservices', value: 'microservices' },
    { en: 'AWS / GCP / Azure', value: 'cloud_platforms' },
    { en: 'CI/CD & DevOps pipelines', value: 'cicd_devops' },
    { en: 'Kubernetes / Docker', value: 'kubernetes_docker' },
    { en: 'Database Design (SQL/NoSQL)', value: 'database_design' },
    { en: 'Cybersecurity', value: 'cybersecurity' },
    { en: 'Smart Contracts (Solidity)', value: 'smart_contracts_solidity' },
  ]),
  ...buildSkills(
    'Construction, Property & Engineering',
    'Konstruksi, Properti & Engineering',
    [
      { en: 'AutoCAD / SketchUp / Revit', value: 'cad_tools' },
      { en: 'Building Design & Planning', value: 'building_design' },
      {
        en: 'Interior Styling & Space Planning',
        value: 'interior_space_planning',
      },
      { en: 'Construction Management', value: 'construction_management' },
      { en: 'Cost Estimation & Budgeting', value: 'cost_estimation' },
      { en: 'Site Supervision', value: 'site_supervision' },
      {
        en: 'Property Development Strategy',
        value: 'property_development_strategy',
      },
    ]
  ),
  ...buildSkills('F&B (Food & Beverage)', 'F&B (Food & Beverage)', [
    { en: 'Menu Development', value: 'menu_development' },
    { en: 'Food Costing', value: 'food_costing' },
    { en: 'Kitchen Operations', value: 'kitchen_operations' },
    { en: 'Food Safety & Hygiene', value: 'food_safety' },
    {
      en: 'Supply Chain (ingredients sourcing)',
      value: 'fnb_supply_chain',
    },
    { en: 'Restaurant Branding', value: 'restaurant_branding' },
    { en: 'Customer Experience', value: 'customer_experience' },
  ]),
  ...buildSkills('Design & Creative', 'Desain & Kreatif', [
    { en: 'Figma / Adobe Suite', value: 'figma_adobe' },
    { en: 'Branding & Identity', value: 'branding_identity' },
    { en: 'Prototyping', value: 'prototyping' },
    { en: 'Visual Design', value: 'visual_design' },
    { en: 'Motion Graphics', value: 'motion_graphics' },
    { en: '3D Rendering', value: 'three_d_rendering' },
    { en: 'Fashion Design & Production', value: 'fashion_design_production' },
  ]),
  ...buildSkills('Marketing & Growth', 'Marketing & Growth', [
    { en: 'Paid Ads (Meta, Google, TikTok)', value: 'paid_ads' },
    { en: 'SEO / SEM', value: 'seo_sem' },
    { en: 'Copywriting', value: 'copywriting' },
    { en: 'Social Media Growth', value: 'social_media_growth' },
    { en: 'Influencer Marketing', value: 'influencer_marketing' },
    { en: 'Email Marketing', value: 'email_marketing' },
    { en: 'Analytics (GA, Mixpanel)', value: 'marketing_analytics' },
    { en: 'Campaign Strategy', value: 'campaign_strategy' },
  ]),
  ...buildSkills(
    'Sales, Business Dev & Partnerships',
    'Sales, BD & Partnership',
    [
      { en: 'Lead Generation', value: 'lead_generation' },
      { en: 'Sales Closing', value: 'sales_closing' },
      { en: 'Negotiation', value: 'negotiation' },
      { en: 'CRM Tools', value: 'crm_tools' },
      { en: 'B2B / B2C Sales', value: 'b2b_b2c_sales' },
      { en: 'Deal Structuring', value: 'deal_structuring' },
      {
        en: 'Client Relationship Management',
        value: 'client_relationship_management',
      },
    ]
  ),
  ...buildSkills('Operations & Supply Chain', 'Operasional & Supply Chain', [
    { en: 'Process Optimization', value: 'process_optimization' },
    { en: 'SOP Creation', value: 'sop_creation' },
    { en: 'Inventory Management', value: 'inventory_management' },
    { en: 'Logistics & Distribution', value: 'logistics_distribution' },
    { en: 'Vendor Management', value: 'vendor_management' },
    { en: 'Operational Scaling', value: 'operational_scaling' },
  ]),
  ...buildSkills('Finance, Investment & Legal', 'Finance, Investasi & Legal', [
    { en: 'Financial Modeling', value: 'financial_modeling' },
    { en: 'Fundraising', value: 'fundraising' },
    { en: 'Investor Relations', value: 'investor_relations' },
    { en: 'Budgeting', value: 'budgeting' },
    { en: 'Accounting', value: 'accounting' },
    { en: 'Legal Structuring', value: 'legal_structuring' },
    { en: 'Contracts & Compliance', value: 'contracts_compliance' },
  ]),
  ...buildSkills('Data, AI & Analytics', 'Data, AI & Analitik', [
    { en: 'Data Analysis', value: 'data_analysis' },
    { en: 'Python / R', value: 'python_r' },
    { en: 'Machine Learning', value: 'machine_learning' },
    { en: 'Data Visualization', value: 'data_visualization' },
    { en: 'Predictive Analytics', value: 'predictive_analytics' },
    { en: 'AI Model Development', value: 'ai_model_development' },
  ]),
  ...buildSkills('Media, Content & Entertainment', 'Media, Konten & Hiburan', [
    { en: 'Video Production', value: 'video_production' },
    { en: 'Editing (Premiere, CapCut)', value: 'video_editing' },
    { en: 'Storytelling', value: 'storytelling' },
    { en: 'Content Strategy', value: 'content_strategy' },
    { en: 'Social Media Content', value: 'social_media_content' },
  ]),
  ...buildSkills('HR, Talent & People', 'HR, Talent & People', [
    { en: 'Hiring & Recruitment', value: 'hiring_recruitment' },
    { en: 'Talent Management', value: 'talent_management' },
    { en: 'Employer Branding', value: 'employer_branding' },
    { en: 'HR Strategy', value: 'hr_strategy' },
    { en: 'Performance Management', value: 'performance_management' },
  ]),
  ...buildSkills('Emerging & Specialized', 'Emerging & Spesialisasi', [
    { en: 'Smart Contracts', value: 'smart_contracts' },
    { en: 'Automation Tools (Zapier, Make)', value: 'automation_tools' },
    { en: 'No-Code Platforms', value: 'no_code_platforms' },
    { en: 'Crypto / DeFi Systems', value: 'crypto_defi' },
  ]),
] satisfies LocalizedOnboardingOption[];

export const cofounderTypeOptions = [
  option('opt_cofounder_technical', 'technical', copy('Technical Co-Founder', 'Co-Founder Teknis'), {
    icon: 'cofounder_technical',
    subLabel: copy('Engineering & architecture', 'Engineering & arsitektur'),
  }),
  option('opt_cofounder_business', 'business', copy('Business Co-Founder', 'Co-Founder Bisnis'), {
    icon: 'cofounder_business',
    subLabel: copy('Strategy & operations', 'Strategi & operasional'),
  }),
  option('opt_cofounder_product', 'product', copy('Product Co-Founder', 'Co-Founder Produk'), {
    icon: 'cofounder_product',
    subLabel: copy('Product vision & design', 'Visi produk & desain'),
  }),
  option('opt_cofounder_growth', 'growth', copy('Growth Co-Founder', 'Co-Founder Growth'), {
    icon: 'cofounder_growth',
    subLabel: copy('Marketing & distribution', 'Marketing & distribusi'),
  }),
  option('opt_cofounder_ai', 'ai', copy('AI / Data Co-Founder', 'Co-Founder AI / Data'), {
    icon: 'cofounder_ai',
    subLabel: copy('AI systems & data intelligence', 'Sistem AI & data intelligence'),
  }),
  option('opt_cofounder_operations', 'operations', copy('Operations Co-Founder', 'Co-Founder Operasional'), {
    icon: 'cofounder_operations',
    subLabel: copy('Execution & scaling operations', 'Eksekusi & scaling operasional'),
  }),
  option('opt_cofounder_finance', 'finance', copy('Finance Co-Founder', 'Co-Founder Keuangan'), {
    icon: 'cofounder_finance',
    subLabel: copy('Fundraising & financial strategy', 'Fundraising & strategi keuangan'),
  }),
  option('opt_cofounder_partnerships', 'partnerships', copy('Partnerships Co-Founder', 'Co-Founder Partnership'), {
    icon: 'cofounder_partnerships',
    subLabel: copy('Strategic partnerships & business growth', 'Partnership strategis & pertumbuhan bisnis'),
  }),
] satisfies LocalizedOnboardingOption[];

export const ownCofounderTypeOptions = [
  option('opt_own_cofounder_technical', 'technical', copy('Technical Co-Founder', 'Co-Founder Teknis'), {
    icon: 'cofounder_technical',
    subLabel: copy('I build the product & tech', 'Saya membangun produk & teknologi'),
  }),
  option('opt_own_cofounder_product', 'product', copy('Product Co-Founder', 'Co-Founder Produk'), {
    icon: 'cofounder_product',
    subLabel: copy('I lead product & design', 'Saya memimpin produk & desain'),
  }),
  option('opt_own_cofounder_business', 'business', copy('Business Co-Founder', 'Co-Founder Bisnis'), {
    icon: 'cofounder_business',
    subLabel: copy('I handle strategy & ops', 'Saya menangani strategi & operasional'),
  }),
  option('opt_own_cofounder_growth', 'growth', copy('Growth Co-Founder', 'Co-Founder Growth'), {
    icon: 'cofounder_growth',
    subLabel: copy('I drive marketing & growth', 'Saya menggerakkan marketing & growth'),
  }),
  option('opt_own_cofounder_ai', 'ai', copy('AI / Data Co-Founder', 'Co-Founder AI / Data'), {
    icon: 'cofounder_ai',
    subLabel: copy('I build AI, data & intelligence', 'Saya membangun AI, data & intelligence'),
  }),
  option('opt_own_cofounder_operations', 'operations', copy('Operations Co-Founder', 'Co-Founder Operasional'), {
    icon: 'cofounder_operations',
    subLabel: copy('I execute & scale operations', 'Saya mengeksekusi & menskalakan operasional'),
  }),
  option('opt_own_cofounder_finance', 'finance', copy('Finance Co-Founder', 'Co-Founder Keuangan'), {
    icon: 'cofounder_finance',
    subLabel: copy('I manage fundraising & finance', 'Saya mengelola fundraising & keuangan'),
  }),
  option('opt_own_cofounder_partnerships', 'partnerships', copy('Partnerships Co-Founder', 'Co-Founder Partnership'), {
    icon: 'cofounder_partnerships',
    subLabel: copy('I build deals & partnerships', 'Saya membangun deal & partnership'),
  }),
] satisfies LocalizedOnboardingOption[];

export const teamRoleOptions = [
  option('opt_team_cto', 'cto', copy('CTO / Technical Lead', 'CTO / Technical Lead')),
  option('opt_team_fullstack', 'fullstack_engineer', copy('Full-Stack Engineer', 'Full-Stack Engineer')),
  option('opt_team_frontend', 'frontend_engineer', copy('Frontend Engineer', 'Frontend Engineer')),
  option('opt_team_product_designer', 'product_designer', copy('Product Designer', 'Product Designer')),
  option('opt_team_growth_marketer', 'growth_marketer', copy('Growth Marketer', 'Growth Marketer')),
  option('opt_team_ops', 'operations_lead', copy('Operations Lead', 'Operations Lead')),
  option('opt_team_revenue', 'bizdev', copy('Business Development', 'Business Development')),
] satisfies LocalizedOnboardingOption[];

export const skillsetOptions = [
  option('opt_skill_product', 'product', copy('Product & Strategy', 'Product & Strategy')),
  option('opt_skill_design', 'design', copy('Design', 'Design')),
  option('opt_skill_fullstack', 'fullstack', copy('Full-Stack Engineering', 'Full-Stack Engineering')),
  option('opt_skill_backend', 'backend', copy('Backend Engineering', 'Backend Engineering')),
  option('opt_skill_mobile', 'mobile', copy('Mobile Engineering', 'Mobile Engineering')),
  option('opt_skill_growth', 'growth', copy('Growth & Marketing', 'Growth & Marketing')),
  option('opt_skill_sales', 'sales', copy('Sales & Partnerships', 'Sales & Partnerships')),
  option('opt_skill_ops', 'ops', copy('Operations', 'Operations')),
] satisfies LocalizedOnboardingOption[];

export const equityExpectationOptions = [
  option('opt_equity_cash', 'cash_only', copy('Cash only', 'Hanya cash')),
  option('opt_equity_balanced', 'balanced', copy('Balanced cash + equity', 'Cash + equity seimbang')),
  option('opt_equity_equity_heavy', 'equity_heavy', copy('Equity-heavy', 'Lebih berat di equity')),
] satisfies LocalizedOnboardingOption[];

export const salaryPreferenceOptions = [
  option('opt_salary_strict', 'strict', copy('Strict minimum', 'Minimum yang tegas')),
  option('opt_salary_flexible', 'flexible', copy('Flexible for the right fit', 'Fleksibel untuk peluang yang tepat')),
  option('opt_salary_none', 'no_minimum', copy('No minimum for now', 'Belum ada minimum')),
] satisfies LocalizedOnboardingOption[];

export const cashEquityExpectationOptions = [
  option(
    'opt_cash_equity_equity_important',
    'equity_important',
    copy('Equity is very important', 'Equity sangat penting')
  ),
  option(
    'opt_cash_equity_some_equity',
    'some_equity',
    copy('Interested in some equity', 'Tertarik dengan sebagian equity')
  ),
  option(
    'opt_cash_equity_cash_heavy',
    'cash_heavy',
    copy('Cash-heavy compensation', 'Kompensasi berat di cash')
  ),
] satisfies LocalizedOnboardingOption[];

export const salaryMinimumOptions = [
  option(
    'opt_salary_min_strict',
    'yes_strict',
    copy('Yes, I do have a strict one', 'Ya, saya punya minimum yang tegas')
  ),
  option(
    'opt_salary_min_flexible',
    'yes_flexible',
    copy(
      'Yes, though I may go lower depending on the opportunity',
      'Ya, tapi saya bisa turun tergantung peluang'
    )
  ),
  option(
    'opt_salary_min_none',
    'no_flexible',
    copy("No, I'm flexible on my salary", 'Tidak, saya fleksibel soal gaji')
  ),
] satisfies LocalizedOnboardingOption[];

export const salaryPeriodOptions = [
  option('opt_salary_period_annual', 'annual', copy('Annual', 'Tahunan'), {
    icon: 'calendar',
  }),
  option('opt_salary_period_hourly', 'hourly', copy('Hourly', 'Per jam'), {
    icon: 'clock',
  }),
] satisfies LocalizedOnboardingOption[];

export const currencyOptions = [
  option('opt_currency_idr', 'IDR', copy('IDR', 'IDR')),
  option('opt_currency_usd', 'USD', copy('USD', 'USD')),
  option('opt_currency_sgd', 'SGD', copy('SGD', 'SGD')),
] satisfies LocalizedOnboardingOption[];

export const startupLookingForOptions = [
  option('opt_startup_hire_cofounder', 'hire_cofounder', copy('A co-founder', 'Seorang co-founder')),
  option('opt_startup_hire_team', 'hire_team', copy('Core team members', 'Anggota tim inti')),
  option('opt_startup_hire_advisors', 'hire_advisors', copy('Advisors or specialists', 'Advisor atau spesialis')),
] satisfies LocalizedOnboardingOption[];

function buildBusinessModels(
  groupEn: string,
  groupId: string,
  items: { value: string; en: string; id?: string }[]
): LocalizedOnboardingOption[] {
  return items.map((item) =>
    option(
      `opt_business_model_${item.value}`,
      item.value,
      copy(item.en, item.id ?? item.en),
      {
        group: copy(groupEn, groupId),
      }
    )
  );
}

export const businessModelOptions = [
  ...buildBusinessModels('Digital & Software', 'Digital & Software', [
    { en: 'SaaS (Subscription software)', value: 'saas' },
    { en: 'Marketplace (2-sided platform)', value: 'marketplace' },
    { en: 'E-commerce (Online store)', value: 'ecommerce' },
    { en: 'Direct-to-Consumer (DTC brand)', value: 'dtc' },
    { en: 'Mobile App (freemium / paid)', value: 'mobile_app' },
    { en: 'API / Infrastructure (B2B tech)', value: 'api_infra' },
  ]),
  ...buildBusinessModels(
    'Financial & Transactional',
    'Finansial & Transaksional',
    [
      { en: 'FinTech (payments, lending, etc.)', value: 'fintech' },
      {
        en: 'Transaction Fees (per use / commission)',
        value: 'transaction_fees',
      },
      { en: 'Brokerage / Commission-based', value: 'brokerage' },
      {
        en: 'Subscription + Transaction Hybrid',
        value: 'subscription_transaction_hybrid',
      },
    ]
  ),
  ...buildBusinessModels('Media & Attention', 'Media & Atensi', [
    { en: 'Advertising-based', value: 'advertising' },
    { en: 'Content / Media Platform', value: 'content_media' },
    {
      en: 'Creator Economy (subscriptions, tips, content)',
      value: 'creator_economy',
    },
  ]),
  ...buildBusinessModels('Services & Offline', 'Layanan & Offline', [
    { en: 'Service-based (agency, consulting)', value: 'service_based' },
    { en: 'F&B (restaurant, cafe, cloud kitchen)', value: 'fnb' },
    { en: 'Retail (offline / omnichannel)', value: 'retail' },
    { en: 'Hospitality (hotel, lodging)', value: 'hospitality' },
    { en: 'Events / Experiences', value: 'events_experiences' },
  ]),
  ...buildBusinessModels('Asset-Heavy / Industry', 'Aset Berat / Industri', [
    { en: 'Real Estate / Property', value: 'real_estate' },
    { en: 'Construction / Infrastructure', value: 'construction' },
    { en: 'Manufacturing', value: 'manufacturing' },
    { en: 'Logistics / Supply Chain', value: 'logistics_supply_chain' },
    { en: 'Energy / Climate', value: 'energy_climate' },
  ]),
  ...buildBusinessModels('Emerging / Tech-Forward', 'Emerging / Tech-Forward', [
    { en: 'Web3 / Blockchain', value: 'web3_blockchain' },
    { en: 'Token-based / Crypto economy', value: 'token_crypto' },
    { en: 'AI-first product', value: 'ai_first' },
    { en: 'DeepTech / R&D', value: 'deeptech_rd' },
  ]),
  ...buildBusinessModels('Hybrid / Other', 'Hybrid / Lainnya', [
    { en: 'Franchise Model', value: 'franchise' },
    { en: 'Licensing', value: 'licensing' },
    { en: 'Aggregator', value: 'aggregator' },
    { en: 'Platform + Service hybrid', value: 'platform_service_hybrid' },
    { en: 'Other', value: 'other' },
  ]),
] satisfies LocalizedOnboardingOption[];

export const founderCountOptions = [
  option('opt_founder_solo', 'solo', copy('Solo Founder', 'Solo Founder'), {
    icon: 'founder_solo',
    subLabel: copy("It's just me for now", 'Baru saya sendiri'),
  }),
  option('opt_founder_two', 'two', copy('2 Founders', '2 Founder'), {
    icon: 'founder_two',
    subLabel: copy('Me and one co-founder', 'Saya dan satu co-founder'),
  }),
  option(
    'opt_founder_three_plus',
    'three_plus',
    copy('3+ Founders', '3+ Founder'),
    {
      icon: 'founder_three_plus',
      subLabel: copy('Three or more co-founders', 'Tiga atau lebih co-founder'),
    }
  ),
] satisfies LocalizedOnboardingOption[];

export const coveredRolesOptions = [
  option('opt_covered_technical', 'technical', copy('Technical', 'Teknis')),
  option('opt_covered_product', 'product', copy('Product', 'Produk')),
  option('opt_covered_business', 'business', copy('Business', 'Bisnis')),
  option('opt_covered_growth', 'growth', copy('Growth', 'Growth')),
  option('opt_covered_operations', 'operations', copy('Operations', 'Operasional')),
  option('opt_covered_finance', 'finance', copy('Finance', 'Keuangan')),
  option('opt_covered_design', 'design', copy('Design', 'Desain')),
  option('opt_covered_other', 'other', copy('Other', 'Lainnya')),
] satisfies LocalizedOnboardingOption[];

export const teamSizeOptions = [
  option('opt_team_size_small', 'small', copy('1 to 3', '1 sampai 3'), {
    icon: 'team_size_small',
    subLabel: copy('Tight early team', 'Tim awal yang ramping'),
  }),
  option('opt_team_size_medium', 'medium', copy('4 to 10', '4 sampai 10'), {
    icon: 'team_size_medium',
    subLabel: copy('Small but growing', 'Kecil tapi berkembang'),
  }),
  option('opt_team_size_large', 'large', copy('10+', '10+'), {
    icon: 'team_size_large',
    subLabel: copy('Already a real team', 'Sudah tim yang solid'),
  }),
] satisfies LocalizedOnboardingOption[];

export const startupTeamRoleOptions = [
  option(
    'opt_startup_team_engineering',
    'engineering',
    copy('Engineering', 'Engineering')
  ),
  option(
    'opt_startup_team_marketing',
    'marketing',
    copy('Marketing', 'Marketing')
  ),
  option('opt_startup_team_sales', 'sales', copy('Sales', 'Sales')),
  option(
    'opt_startup_team_operations',
    'operations',
    copy('Operations', 'Operasional')
  ),
  option('opt_startup_team_design', 'design', copy('Design', 'Desain')),
  option(
    'opt_startup_team_finance',
    'finance',
    copy('Finance', 'Keuangan')
  ),
  option('opt_startup_team_other', 'other', copy('Other', 'Lainnya')),
] satisfies LocalizedOnboardingOption[];

export const skillCategoryOptions = [
  option(
    'opt_skill_cat_engineering',
    'engineering',
    copy('Engineering', 'Engineering')
  ),
  option('opt_skill_cat_product', 'product', copy('Product', 'Produk')),
  option('opt_skill_cat_design', 'design', copy('Design', 'Desain')),
  option(
    'opt_skill_cat_marketing',
    'marketing',
    copy('Marketing', 'Marketing')
  ),
  option(
    'opt_skill_cat_sales',
    'sales',
    copy('Sales & BD', 'Sales & BD')
  ),
  option(
    'opt_skill_cat_operations',
    'operations',
    copy('Operations', 'Operasional')
  ),
  option('opt_skill_cat_finance', 'finance', copy('Finance', 'Keuangan')),
  option('opt_skill_cat_data', 'data', copy('Data & AI', 'Data & AI')),
  option('opt_skill_cat_hr', 'hr', copy('HR & People', 'HR & People')),
  option('opt_skill_cat_legal', 'legal', copy('Legal', 'Legal')),
  option(
    'opt_skill_cat_content',
    'content',
    copy('Content & Media', 'Konten & Media')
  ),
  option('opt_skill_cat_other', 'other', copy('Other', 'Lainnya')),
] satisfies LocalizedOnboardingOption[];

