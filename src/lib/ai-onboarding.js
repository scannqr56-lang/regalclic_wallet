import { fetchMenuUploads } from '@/lib/ai-assistant';
import { fetchRestaurantProfile, validateRestaurantProfilePayload } from '@/lib/ai-restaurant-profile';
import { fetchSuggestions } from '@/lib/ai-suggestions';

export const ONBOARDING_STEPS = [
  {
    id: 'menu',
    title: 'Menu importé',
    description: 'Uploadez et extrayez votre carte (PDF ou photo).',
    href: '/dashboard/ai-assistant/upload',
  },
  {
    id: 'profile',
    title: 'Profil commerce',
    description: 'Répondez aux 8 questions pour personnaliser l’IA.',
    href: '/dashboard/ai-assistant/profile',
  },
  {
    id: 'program',
    title: 'Programme fidélité',
    description: 'Activez un programme points ou tampons.',
    href: '/dashboard/program',
  },
  {
    id: 'generate',
    title: 'Plan généré',
    description: 'Lancez la génération complète en 1 clic.',
    href: '/dashboard/ai-assistant',
  },
  {
    id: 'validate',
    title: 'Suggestions validées',
    description: 'Utilisez, modifiez ou ignorez les propositions IA.',
    href: '/dashboard/ai-assistant/suggestions',
  },
];

export async function fetchAiOnboardingStatus({ businessId, loyaltyProgram }) {
  const [menus, profile, suggestions] = await Promise.all([
    fetchMenuUploads(businessId),
    fetchRestaurantProfile(businessId).catch(() => null),
    fetchSuggestions(businessId),
  ]);

  const extractedMenu = menus.find((row) => row.status === 'extracted');
  const profileComplete = profile
    ? !validateRestaurantProfilePayload({
      business_type: profile.business_type || '',
      main_objective: profile.main_objective || '',
      quiet_days: profile.quiet_days || [],
      quiet_hours: profile.quiet_hours || '',
      products_to_push_text: (profile.products_to_push || []).join('\n'),
      preferred_rewards: profile.preferred_rewards || [],
      average_ticket: profile.average_ticket ?? '',
      generosity_level: profile.generosity_level || '',
      tone_of_voice: profile.tone_of_voice || '',
      offers_to_avoid: profile.offers_to_avoid || '',
      margin_sensitivity: profile.margin_sensitivity || '',
      notes: profile.notes || '',
    })
    : false;

  const hasProgram = Boolean(loyaltyProgram?.id);
  const hasGenerated = suggestions.length > 0;
  const hasValidated = suggestions.some((row) =>
    ['accepted', 'modified', 'applied'].includes(row.status),
  );

  const steps = {
    menu: Boolean(extractedMenu),
    profile: profileComplete,
    program: hasProgram,
    generate: hasGenerated,
    validate: hasValidated,
  };

  const completedCount = Object.values(steps).filter(Boolean).length;
  const readyForFullPlan = steps.menu && steps.profile && steps.program;

  return {
    steps,
    completedCount,
    totalSteps: ONBOARDING_STEPS.length,
    readyForFullPlan,
    extractedMenuId: extractedMenu?.id ?? null,
    pendingSuggestions: suggestions.filter((row) => row.status === 'pending').length,
  };
}
