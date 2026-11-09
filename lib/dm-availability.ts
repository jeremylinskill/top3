// Direct Messaging is enabled automatically for the Development Supabase project
// against the established Top 3 Development project. Production requires
// BOTH an explicit rollout flag and an exact-match target project reference.
// These EXPO_PUBLIC_* values are not secrets. Database RPCs/RLS continue to
// enforce eligibility and participant access independently of this UI gate.
const DEVELOPMENT_PROJECT_REF = 'kkltzygebomopysklaqq';
const developmentProjectUrl = `https://${DEVELOPMENT_PROJECT_REF}.supabase.co`;
const configuredSupabaseUrl =
  (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const releaseProjectRef =
  (process.env.EXPO_PUBLIC_DM_RELEASE_PROJECT_REF ?? '').trim();

const localDevelopmentEnabled =
  configuredSupabaseUrl === developmentProjectUrl;

const productionOptInEnabled =
  process.env.EXPO_PUBLIC_DM_ENABLED === 'true' &&
  /^[a-z0-9]{20}$/.test(releaseProjectRef) &&
  releaseProjectRef !== DEVELOPMENT_PROJECT_REF &&
  configuredSupabaseUrl === `https://${releaseProjectRef}.supabase.co`;

export const DM_NAV_ENABLED =
  localDevelopmentEnabled || productionOptInEnabled;

// Group DMs are still in Development. Never expose group tables/RPCs to a
// Production-backed app simply because one-to-one DM has been enabled.
export const GROUP_DM_ENABLED = localDevelopmentEnabled;
