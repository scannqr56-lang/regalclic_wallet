import { fetchMenuUploads } from '@/lib/ai-assistant';
import { fetchRestaurantProfile, validateEssentialRestaurantProfilePayload } from '@/lib/ai-restaurant-profile';
import { fetchSuggestions } from '@/lib/ai-suggestions';

export const ONBOARDING_STEPS = [
  {
    id: 'menu',
    title: 'Menu ajouté',
    description: 'Importez votre carte (PDF ou photo) et vérifiez les plats.',
    href: '/dashboard/menu',
  },
  {
    id: 'profile',
    title: 'Mon restaurant',
    description: 'Quelques questions pour des idées adaptées à votre établissement.',
    href: '/dashboard/restaurant',
  },
  {
    id: 'generate',
    title: 'Idées reçues',
    description: 'Obtenez des propositions d’offres, récompenses et messages.',
    href: '/dashboard/ideas',
  },
  {
    id: 'validate',
    title: 'Idées choisies',
    description: 'Sélectionnez ce que vous souhaitez activer pour vos clients.',
    href: '/dashboard/ideas?tab=offers',
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
    ? !validateEssentialRestaurantProfilePayload({
      business_type: profile.business_type || '',
      main_objective: profile.main_objective || '',
      quiet_days: profile.quiet_days || [],
      quiet_hours: profile.quiet_hours || '',
      products_to_push: profile.products_to_push || [],
      preferred_rewards: profile.preferred_rewards || ['produit_offert'],
      average_ticket: profile.average_ticket ?? null,
      generosity_level: profile.generosity_level || '',
      tone_of_voice: profile.tone_of_voice || 'chaleureux',
      offers_to_avoid: profile.offers_to_avoid || '',
      margin_sensitivity: profile.margin_sensitivity || '',
      notes: profile.notes || '',
    })
    : false;

  const hasGenerated = suggestions.length > 0;
  const hasValidated = suggestions.some((row) =>
    ['accepted', 'modified', 'applied'].includes(row.status),
  );

  const steps = {
    menu: Boolean(extractedMenu),
    profile: profileComplete,
    generate: hasGenerated,
    validate: hasValidated,
  };

  const completedCount = Object.values(steps).filter(Boolean).length;
  const readyForFullPlan = steps.menu && steps.profile;

  return {
    steps,
    completedCount,
    totalSteps: ONBOARDING_STEPS.length,
    readyForFullPlan,
    extractedMenuId: extractedMenu?.id ?? null,
    pendingSuggestions: suggestions.filter((row) => row.status === 'pending').length,
  };
}
