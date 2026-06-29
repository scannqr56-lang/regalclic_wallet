import { fetchMenuUploads } from '@/lib/ai-assistant';
import { fetchRestaurantProfile, validateEssentialRestaurantProfilePayload } from '@/lib/ai-restaurant-profile';
import { fetchSuggestions } from '@/lib/ai-suggestions';
import { fetchCampaigns } from '@/lib/campaigns';

/** Checklist visible sur le dashboard (6 étapes). */
export const DASHBOARD_CHECKLIST_STEPS = [
  {
    id: 'restaurant_configured',
    title: 'Restaurant configuré',
    description: 'Nom, logo et coordonnées de votre établissement.',
    href: '/dashboard/business',
  },
  {
    id: 'menu_added',
    title: 'Menu ajouté',
    description: 'Votre carte importée et vérifiée.',
    href: '/dashboard/menu',
  },
  {
    id: 'ideas_received',
    title: 'Idées reçues',
    description: 'Offres, récompenses et messages proposés.',
    href: '/dashboard/ideas',
  },
  {
    id: 'offer_activated',
    title: 'Offre activée',
    description: 'Au moins une promo visible sur les cartes Wallet.',
    href: '/dashboard/offers',
  },
  {
    id: 'program_configured',
    title: 'Programme configuré',
    description: 'Points ou tampons et récompense définis.',
    href: '/dashboard/program',
  },
  {
    id: 'qr_displayed',
    title: 'QR en boutique',
    description: 'Vos premiers clients peuvent s’inscrire.',
    href: '/dashboard/qr',
  },
];

export function isRestaurantConfigured(business) {
  if (!business?.name?.trim() || !business?.slug?.trim()) return false;
  return Boolean(
    business.logo_url
    || business.address?.trim()
    || business.phone?.trim(),
  );
}

export function isProgramConfigured(loyaltyProgram) {
  if (!loyaltyProgram?.id) return false;
  const hasReward = Boolean(loyaltyProgram.reward_label?.trim());
  const hasThreshold = loyaltyProgram.type === 'stamps'
    ? Number(loyaltyProgram.stamps_required) > 0
    : Number(loyaltyProgram.reward_threshold) > 0;
  return hasReward && hasThreshold;
}

function buildProfilePayload(profile) {
  if (!profile) return null;
  return {
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
  };
}

export function computeOnboardingStatuses({
  business,
  loyaltyProgram,
  stats,
  menus,
  profile,
  suggestions,
  campaigns,
}) {
  const profilePayload = buildProfilePayload(profile);
  const profileComplete = profilePayload
    ? !validateEssentialRestaurantProfilePayload(profilePayload)
    : false;

  const hasExtractedMenu = menus.some((row) => row.status === 'extracted');
  const hasIdeas = suggestions.length > 0;
  const hasChosenIdea = suggestions.some((row) =>
    ['accepted', 'modified', 'applied'].includes(row.status),
  );
  const hasAppliedOffer = suggestions.some(
    (row) => row.suggestion_type === 'offer' && row.status === 'applied',
  );
  const hasActiveCampaign = campaigns.some((row) => row.status === 'active');
  const customersCount = stats?.customers_count ?? 0;

  return {
    restaurant_configured: isRestaurantConfigured(business),
    menu_added: hasExtractedMenu,
    restaurant_preferences_completed: profileComplete,
    loyalty_program_exists: Boolean(loyaltyProgram?.id),
    ideas_received: hasIdeas,
    ideas_chosen: hasChosenIdea,
    offer_activated: hasAppliedOffer || hasActiveCampaign,
    program_configured: isProgramConfigured(loyaltyProgram),
    qr_displayed: customersCount > 0,
    first_customer_added: customersCount > 0,
    pendingSuggestions: suggestions.filter((row) => row.status === 'pending').length,
    readyForIdeasGeneration: hasExtractedMenu && profileComplete,
  };
}

export function getChecklistStepState(statuses) {
  return DASHBOARD_CHECKLIST_STEPS.map((step) => ({
    ...step,
    done: Boolean(statuses[step.id]),
  }));
}

export function getCurrentStepIndex(checklistSteps) {
  const index = checklistSteps.findIndex((step) => !step.done);
  return index === -1 ? checklistSteps.length : index;
}

/**
 * Prochaine action recommandée (inclut les étapes intermédiaires hors checklist).
 */
export function getNextAction(statuses) {
  const totalSteps = DASHBOARD_CHECKLIST_STEPS.length;

  if (!statuses.restaurant_configured) {
    return {
      stepIndex: 1,
      totalSteps,
      title: 'Configurez votre restaurant',
      description: 'Ajoutez le nom, le logo et vos coordonnées pour personnaliser votre carte Wallet.',
      label: 'Configurer mon restaurant',
      href: '/dashboard/business',
    };
  }

  if (!statuses.menu_added) {
    return {
      stepIndex: 2,
      totalSteps,
      title: 'Ajoutez votre menu',
      description: 'Importez un PDF ou une photo de votre carte pour recevoir des idées adaptées à vos plats.',
      label: 'Ajouter mon menu',
      href: '/dashboard/menu',
    };
  }

  if (!statuses.restaurant_preferences_completed) {
    return {
      stepIndex: 2,
      totalSteps,
      title: 'Parlez-nous de votre restaurant',
      description: 'Quelques questions pour personnaliser vos idées d’offres et de récompenses.',
      label: 'Continuer',
      href: '/dashboard/restaurant',
    };
  }

  if (statuses.pendingSuggestions > 0) {
    return {
      stepIndex: 3,
      totalSteps,
      title: 'Des idées attendent votre choix',
      description: `${statuses.pendingSuggestions} proposition${statuses.pendingSuggestions > 1 ? 's' : ''} à examiner avant activation.`,
      label: 'Choisir mes idées',
      href: '/dashboard/ideas?tab=offers',
    };
  }

  if (!statuses.ideas_received) {
    return {
      stepIndex: 3,
      totalSteps,
      title: 'Obtenez vos premières idées',
      description: 'Offres, récompenses et messages prêts à activer sur la carte Wallet.',
      label: 'Obtenir mes idées',
      href: '/dashboard/ideas',
    };
  }

  if (!statuses.ideas_chosen) {
    return {
      stepIndex: 3,
      totalSteps,
      title: 'Choisissez vos idées',
      description: 'Sélectionnez les offres et récompenses à activer — rien n’est publié sans vous.',
      label: 'Choisir mes idées',
      href: '/dashboard/ideas?tab=offers',
    };
  }

  if (!statuses.offer_activated) {
    return {
      stepIndex: 4,
      totalSteps,
      title: 'Activez une offre promo',
      description: 'Publiez une promotion sur les cartes Wallet de vos clients.',
      label: 'Voir mes offres',
      href: '/dashboard/offers',
    };
  }

  if (!statuses.program_configured) {
    return {
      stepIndex: 5,
      totalSteps,
      title: 'Finalisez votre programme',
      description: 'Vérifiez le seuil de points et la récompense proposée à vos clients.',
      label: 'Mon programme fidélité',
      href: '/dashboard/program',
    };
  }

  if (!statuses.qr_displayed) {
    return {
      stepIndex: 6,
      totalSteps,
      title: 'Affichez votre QR en boutique',
      description: 'Vos clients scanneront ce code pour ajouter leur carte Wallet.',
      label: 'Télécharger mon QR',
      href: '/dashboard/qr',
    };
  }

  return {
    stepIndex: totalSteps,
    totalSteps,
    title: 'Votre fidélité est en place',
    description: 'Consultez vos clients, scannez en caisse ou demandez de nouvelles idées.',
    label: 'Voir mes idées',
    href: '/dashboard/ideas',
    mature: true,
  };
}

export function getProgramStatus(loyaltyProgram, statuses) {
  if (!loyaltyProgram?.id) {
    return {
      label: 'En préparation',
      detail: 'Configurez votre programme pour activer la carte Wallet.',
      active: false,
    };
  }

  if (!statuses.program_configured) {
    return {
      label: 'À finaliser',
      detail: loyaltyProgram.reward_label || 'Complétez la récompense et le seuil.',
      active: false,
    };
  }

  const typeLabel = loyaltyProgram.type === 'stamps' ? 'Tampons' : 'Points';
  return {
    label: `Actif — ${typeLabel}`,
    detail: loyaltyProgram.reward_label || 'Programme fidélité',
    active: true,
  };
}

export function isOnboardingComplete(statuses) {
  return DASHBOARD_CHECKLIST_STEPS.every((step) => statuses[step.id]);
}

export async function fetchOnboardingProgress({ businessId, business, loyaltyProgram, stats }) {
  const [menus, profile, suggestions, campaigns] = await Promise.all([
    fetchMenuUploads(businessId),
    fetchRestaurantProfile(businessId).catch(() => null),
    fetchSuggestions(businessId),
    fetchCampaigns(businessId).catch(() => []),
  ]);

  const statuses = computeOnboardingStatuses({
    business,
    loyaltyProgram,
    stats,
    menus,
    profile,
    suggestions,
    campaigns,
  });

  const checklistSteps = getChecklistStepState(statuses);
  const currentStepIndex = getCurrentStepIndex(checklistSteps);
  const completedCount = checklistSteps.filter((step) => step.done).length;

  return {
    statuses,
    checklistSteps,
    currentStepIndex,
    completedCount,
    totalSteps: DASHBOARD_CHECKLIST_STEPS.length,
    nextAction: getNextAction(statuses),
    programStatus: getProgramStatus(loyaltyProgram, statuses),
    onboardingComplete: isOnboardingComplete(statuses),
    extractedMenuId: menus.find((row) => row.status === 'extracted')?.id ?? null,
  };
}
