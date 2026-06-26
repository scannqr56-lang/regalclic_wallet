/**
 * Modèle métier unique pour les cartes Wallet Apple et Google.
 * Phase 1 — spec + ViewModel partagé (consommé en Phase 3/4).
 */

import {
  REGALCLIC_WALLET_ISSUER_NAME,
  REGALCLIC_WALLET_LOYALTY_LABEL,
  REGALCLIC_WALLET_PRIMARY_HEX,
  resolveLabelHex,
  resolvePrimaryHex,
} from "./wallet-branding.ts";

// ---------------------------------------------------------------------------
// Décisions produit Phase 1
// ---------------------------------------------------------------------------

/** Style Apple cible pour les nouvelles cartes (Phase 3). `generic` reste supporté via env. */
export type WalletApplePassStyle = "generic" | "storeCard";

/**
 * Décision Phase 1 : `storeCard` — rendu fidélité retail avec strip optionnel.
 * Override possible : env `APPLE_PASS_STYLE=generic` pour transition / compatibilité.
 */
export const WALLET_APPLE_PASS_STYLE_DEFAULT: WalletApplePassStyle = "storeCard";

/**
 * Décision Phase 1 : `organizationName` Apple = RegalClic (émetteur technique du pass).
 * Le nom du restaurant apparaît dans headerFields / programName, pas dans organizationName.
 */
export const WALLET_APPLE_ORGANIZATION_NAME = REGALCLIC_WALLET_ISSUER_NAME;

export type WalletProgramType = "points" | "stamps";

// ---------------------------------------------------------------------------
// Textes FR par défaut
// ---------------------------------------------------------------------------

export const WALLET_DEFAULT_TEXTS = {
  loyaltyLabel: REGALCLIC_WALLET_LOYALTY_LABEL,
  scanHint: "Scannez cette carte à chaque passage pour cumuler votre fidélité.",
  loyaltyRewarded: "Votre fidélité récompensée",
  customerFallback: "Client",
  businessFallback: "Commerce",
  rewardFallback: "Récompense",
  poweredBy: "Carte propulsée par RegalClic",
  backInfoDefault: "Présentez le QR code en caisse pour cumuler votre fidélité.",
  pointsChangeMessage: "Vous avez maintenant %@ points",
  stampsChangeMessage: "Vous avez maintenant %@ tampons",
  rewardAvailableLabel: "Récompense disponible",
  nextRewardLabel: "Prochaine récompense",
  balanceLabelPoints: "Points",
  balanceLabelStamps: "Tampons",
  cardNumberLabel: "N° de carte",
  programLabel: "Programme",
  lastUpdateLabel: "Dernière mise à jour",
  lastTransactionLabel: "Dernière transaction",
  conditionsLabel: "Conditions",
  addressLabel: "Adresse",
  phoneLabel: "Téléphone",
  websiteLabel: "Site web",
  orderLabel: "Commander",
  instagramLabel: "Instagram",
  promoLabel: "Offre en cours",
  googleSyncHeader: "Solde mis à jour",
} as const;

// ---------------------------------------------------------------------------
// Dimensions assets (référence Phase 2)
// ---------------------------------------------------------------------------

export const WALLET_IMAGE_SPECS = {
  apple: {
    icon1x: { width: 29, height: 29 },
    icon2x: { width: 58, height: 58 },
    logo1x: { maxWidth: 160, maxHeight: 50 },
    logo2x: { maxWidth: 320, maxHeight: 100 },
    strip1x: { width: 375, height: 123 },
    strip2x: { width: 750, height: 246 },
  },
  google: {
    programLogo: { minWidth: 660, minHeight: 660, note: "Carré, fond transparent recommandé" },
    heroImage: { width: 1032, height: 336 },
  },
  formats: ["image/png", "image/jpeg", "image/webp"],
  maxBytes: 2 * 1024 * 1024,
} as const;

// ---------------------------------------------------------------------------
// Types entrée / sortie
// ---------------------------------------------------------------------------

export type WalletCardLink = {
  id: string;
  label: string;
  url: string;
};

export type WalletCardMembershipInput = {
  id: string;
  card_number: string;
  qr_token: string;
  points_balance: number;
  stamps_balance: number;
  rewards_available: number;
  updated_at?: string | null;
};

export type WalletCardCustomerInput = {
  first_name?: string | null;
  last_name?: string | null;
};

export type WalletCardBusinessInput = {
  id: string;
  name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  wallet_label_color?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  website?: string | null;
  order_url?: string | null;
  instagram_url?: string | null;
  wallet_promo_message?: string | null;
  wallet_terms?: string | null;
  wallet_hero_url?: string | null;
};

export type WalletCardProgramInput = {
  type?: string | null;
  points_per_euro?: number | null;
  stamps_required?: number | null;
  reward_label?: string | null;
  reward_threshold?: number | null;
};

export type WalletCardDbInput = {
  membership: WalletCardMembershipInput;
  customer: WalletCardCustomerInput;
  business: WalletCardBusinessInput;
  program: WalletCardProgramInput;
  lastTransactionAt?: string | null;
  /** Campagne promo active (prioritaire sur wallet_promo_message) */
  activeCampaign?: {
    message: string;
    offer_label?: string | null;
  } | null;
  /** Override style Apple (sinon env ou défaut storeCard) */
  applePassStyle?: WalletApplePassStyle;
};

export type WalletCardViewModel = {
  membershipId: string;
  businessId: string;
  cardNumber: string;
  qrToken: string;

  businessName: string;
  logoUrl: string | null;
  heroUrl: string | null;
  primaryColorHex: string;
  labelColorHex: string;

  customerFirstName: string;
  customerLastName: string | null;
  customerDisplayName: string;

  programType: WalletProgramType;
  earnRuleText: string;
  rewardLabel: string;
  rewardThreshold: number | null;

  balance: number;
  balanceLabel: string;
  balanceChangeMessage: string;
  rewardsAvailable: number;
  unitsToNextReward: number;
  nextRewardText: string;
  rewardsAvailableText: string | null;

  promoMessage: string | null;
  promoLabel: string;
  walletTerms: string | null;
  faceTagline: string;

  formattedAddress: string | null;
  phone: string | null;
  websiteUrl: string | null;
  orderUrl: string | null;
  instagramUrl: string | null;
  links: WalletCardLink[];

  lastUpdatedAt: string;
  lastTransactionAt: string | null;
  lastUpdatedDisplay: string;
  lastTransactionDisplay: string | null;

  organizationName: string;
  applePassStyle: WalletApplePassStyle;
  passDescription: string;

  googleSyncMessageBody: string;
};

// ---------------------------------------------------------------------------
// Helpers purs
// ---------------------------------------------------------------------------

export function resolveApplePassStyle(override?: WalletApplePassStyle): WalletApplePassStyle {
  if (override) return override;
  const envStyle = (Deno.env.get("APPLE_PASS_STYLE") || "").trim().toLowerCase();
  if (envStyle === "generic" || envStyle === "storecard") {
    return envStyle === "storecard" ? "storeCard" : "generic";
  }
  return WALLET_APPLE_PASS_STYLE_DEFAULT;
}

export function normalizeProgramType(type?: string | null): WalletProgramType {
  return type === "stamps" ? "stamps" : "points";
}

export function formatCustomerDisplayName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const first = (firstName || "").trim();
  const last = (lastName || "").trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return WALLET_DEFAULT_TEXTS.customerFallback;
}

export function formatBusinessAddress(business: WalletCardBusinessInput): string | null {
  const line1 = (business.address || "").trim();
  const city = (business.city || "").trim();
  const postal = (business.postal_code || "").trim();
  const cityLine = [postal, city].filter(Boolean).join(" ");
  const parts = [line1, cityLine].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function formatEarnRuleText(
  programType: WalletProgramType,
  program: WalletCardProgramInput,
  rewardLabel: string,
): string {
  if (programType === "stamps") {
    const required = Math.max(Math.floor(Number(program.stamps_required) || 10), 1);
    return `${required} tampons = 1 ${rewardLabel.toLowerCase()}`;
  }
  const perEuro = Number(program.points_per_euro) || 1;
  const pointWord = perEuro === 1 ? "point" : "points";
  if (perEuro === 1) return `1 € = 1 ${pointWord}`;
  const formatted = Number.isInteger(perEuro) ? String(perEuro) : perEuro.toFixed(2).replace(/\.?0+$/, "");
  return `1 € = ${formatted} ${pointWord}`;
}

export function resolveRewardThreshold(program: WalletCardProgramInput): number {
  const raw = program.reward_threshold;
  if (raw != null && Number(raw) > 0) return Math.floor(Number(raw));
  return 100;
}

export function computeUnitsToNextReward(
  programType: WalletProgramType,
  balance: number,
  program: WalletCardProgramInput,
): number {
  const safeBalance = Math.max(0, Math.floor(balance));
  if (programType === "stamps") {
    const required = Math.max(Math.floor(Number(program.stamps_required) || 10), 1);
    if (safeBalance >= required) return 0;
    return required - safeBalance;
  }
  const threshold = resolveRewardThreshold(program);
  if (threshold <= 0) return 0;
  const remainder = safeBalance % threshold;
  if (remainder === 0 && safeBalance > 0) return 0;
  return threshold - remainder;
}

export function formatNextRewardText(
  programType: WalletProgramType,
  unitsToNext: number,
  rewardLabel: string,
): string {
  if (unitsToNext <= 0) {
    return programType === "stamps"
      ? `Prochain ${rewardLabel.toLowerCase()} bientôt disponible`
      : "Seuil de récompense atteint";
  }
  const unit = programType === "stamps" ? "tampon" : "point";
  const plural = unitsToNext > 1 ? `${unit}s` : unit;
  return `Encore ${unitsToNext} ${plural}`;
}

export function formatRewardsAvailableText(
  rewardsAvailable: number,
  rewardLabel: string,
): string | null {
  if (rewardsAvailable <= 0) return null;
  if (rewardsAvailable === 1) return `1 ${rewardLabel.toLowerCase()} à utiliser`;
  return `${rewardsAvailable} récompenses à utiliser`;
}

export function formatFrenchDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(date);
}

function normalizeHttpsUrl(url?: string | null): string | null {
  const trimmed = (url || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return null;
  return `https://${trimmed}`;
}

export function buildWalletLinks(business: WalletCardBusinessInput): WalletCardLink[] {
  const links: WalletCardLink[] = [];
  const website = normalizeHttpsUrl(business.website);
  const order = normalizeHttpsUrl(business.order_url);
  const instagram = normalizeHttpsUrl(business.instagram_url);
  const phone = (business.phone || "").trim();

  if (website) links.push({ id: "website", label: WALLET_DEFAULT_TEXTS.websiteLabel, url: website });
  if (order) links.push({ id: "order", label: WALLET_DEFAULT_TEXTS.orderLabel, url: order });
  if (instagram) links.push({ id: "instagram", label: WALLET_DEFAULT_TEXTS.instagramLabel, url: instagram });
  if (phone) {
    const tel = phone.replace(/\s+/g, "");
    links.push({ id: "phone", label: WALLET_DEFAULT_TEXTS.phoneLabel, url: `tel:${tel}` });
  }
  return links;
}

export function resolveFaceTagline(promoMessage?: string | null): string {
  const promo = (promoMessage || "").trim();
  if (promo) return promo;
  return WALLET_DEFAULT_TEXTS.loyaltyRewarded;
}

// ---------------------------------------------------------------------------
// Builder principal
// ---------------------------------------------------------------------------

export function buildWalletCardViewModel(input: WalletCardDbInput): WalletCardViewModel {
  const programType = normalizeProgramType(input.program.type);
  const businessName = (input.business.name || "").trim() || WALLET_DEFAULT_TEXTS.businessFallback;
  const rewardLabel = (input.program.reward_label || "").trim() || WALLET_DEFAULT_TEXTS.rewardFallback;
  const customerFirstName = (input.customer.first_name || "").trim() || WALLET_DEFAULT_TEXTS.customerFallback;
  const customerLastName = (input.customer.last_name || "").trim() || null;

  const balance = programType === "stamps"
    ? Math.max(0, Math.floor(Number(input.membership.stamps_balance) || 0))
    : Math.max(0, Math.floor(Number(input.membership.points_balance) || 0));

  const rewardsAvailable = Math.max(0, Math.floor(Number(input.membership.rewards_available) || 0));
  const rewardThreshold = programType === "points" ? resolveRewardThreshold(input.program) : null;
  const unitsToNextReward = computeUnitsToNextReward(programType, balance, input.program);
  const nextRewardText = formatNextRewardText(programType, unitsToNextReward, rewardLabel);
  const rewardsAvailableText = formatRewardsAvailableText(rewardsAvailable, rewardLabel);

  const balanceLabel = programType === "stamps"
    ? WALLET_DEFAULT_TEXTS.balanceLabelStamps
    : WALLET_DEFAULT_TEXTS.balanceLabelPoints;

  const balanceChangeMessage = programType === "stamps"
    ? WALLET_DEFAULT_TEXTS.stampsChangeMessage
    : WALLET_DEFAULT_TEXTS.pointsChangeMessage;

  const lastUpdatedAt = input.membership.updated_at || new Date().toISOString();
  const lastTransactionAt = input.lastTransactionAt || null;
  const campaignMessage = (input.activeCampaign?.message || "").trim();
  const promoMessage = campaignMessage
    || (input.business.wallet_promo_message || "").trim()
    || null;
  const promoLabel = (input.activeCampaign?.offer_label || "").trim()
    || WALLET_DEFAULT_TEXTS.promoLabel;
  const walletTerms = (input.business.wallet_terms || "").trim() || null;

  const balanceWord = programType === "stamps" ? "tampons" : "points";

  return {
    membershipId: input.membership.id,
    businessId: input.business.id,
    cardNumber: input.membership.card_number,
    qrToken: input.membership.qr_token,

    businessName,
    logoUrl: (input.business.logo_url || "").trim() || null,
    heroUrl: (input.business.wallet_hero_url || "").trim() || null,
    primaryColorHex: resolvePrimaryHex(input.business.primary_color),
    labelColorHex: resolveLabelHex(input.business.wallet_label_color),

    customerFirstName,
    customerLastName,
    customerDisplayName: formatCustomerDisplayName(input.customer.first_name, input.customer.last_name),

    programType,
    earnRuleText: formatEarnRuleText(programType, input.program, rewardLabel),
    rewardLabel,
    rewardThreshold,

    balance,
    balanceLabel,
    balanceChangeMessage,
    rewardsAvailable,
    unitsToNextReward,
    nextRewardText,
    rewardsAvailableText,

    promoMessage,
    promoLabel,
    walletTerms,
    faceTagline: resolveFaceTagline(promoMessage),

    formattedAddress: formatBusinessAddress(input.business),
    phone: (input.business.phone || "").trim() || null,
    websiteUrl: normalizeHttpsUrl(input.business.website),
    orderUrl: normalizeHttpsUrl(input.business.order_url),
    instagramUrl: normalizeHttpsUrl(input.business.instagram_url),
    links: buildWalletLinks(input.business),

    lastUpdatedAt,
    lastTransactionAt,
    lastUpdatedDisplay: formatFrenchDateTime(lastUpdatedAt) || "",
    lastTransactionDisplay: formatFrenchDateTime(lastTransactionAt),

    organizationName: WALLET_APPLE_ORGANIZATION_NAME,
    applePassStyle: resolveApplePassStyle(input.applePassStyle),
    passDescription: `Carte fidélité ${businessName}`,

    googleSyncMessageBody: `Vous avez maintenant ${balance} ${balanceWord}.`,
  };
}

// ---------------------------------------------------------------------------
// Mapping Apple Wallet (Phase 3)
// ---------------------------------------------------------------------------

export type ApplePassField = {
  key: string;
  label: string;
  value: string;
  changeMessage?: string;
};

export type ApplePassFieldSet = {
  headerFields: ApplePassField[];
  primaryFields: ApplePassField[];
  secondaryFields: ApplePassField[];
  auxiliaryFields: ApplePassField[];
  backFields: ApplePassField[];
};

export function mapViewModelToAppleFields(vm: WalletCardViewModel): ApplePassFieldSet {
  const headerFields: ApplePassField[] = [{
    key: "business",
    label: WALLET_DEFAULT_TEXTS.loyaltyLabel,
    value: vm.businessName,
  }];

  const primaryFields: ApplePassField[] = [{
    key: "balance",
    label: vm.balanceLabel,
    value: String(vm.balance),
    changeMessage: vm.balanceChangeMessage,
  }];

  const secondaryFields: ApplePassField[] = [{
    key: "customer",
    label: "Client",
    value: vm.customerDisplayName,
  }];

  const auxiliaryFields: ApplePassField[] = [
    {
      key: "next_reward",
      label: WALLET_DEFAULT_TEXTS.nextRewardLabel,
      value: vm.nextRewardText,
    },
    {
      key: "reward",
      label: "Récompense",
      value: vm.rewardLabel,
    },
  ];

  if (vm.rewardsAvailableText) {
    auxiliaryFields.push({
      key: "available",
      label: WALLET_DEFAULT_TEXTS.rewardAvailableLabel,
      value: vm.rewardsAvailableText,
      changeMessage: "Vous avez %@",
    });
  }

  const backFields: ApplePassField[] = [
    {
      key: "card_number",
      label: WALLET_DEFAULT_TEXTS.cardNumberLabel,
      value: vm.cardNumber,
    },
    {
      key: "program",
      label: WALLET_DEFAULT_TEXTS.programLabel,
      value: `${vm.earnRuleText} — ${vm.rewardLabel}`,
    },
    {
      key: "next_reward_detail",
      label: WALLET_DEFAULT_TEXTS.nextRewardLabel,
      value: vm.nextRewardText,
    },
  ];

  if (vm.rewardsAvailableText) {
    backFields.push({
      key: "reward_available",
      label: WALLET_DEFAULT_TEXTS.rewardAvailableLabel,
      value: vm.rewardsAvailableText,
    });
  }

  if (vm.lastTransactionDisplay) {
    backFields.push({
      key: "last_tx",
      label: WALLET_DEFAULT_TEXTS.lastTransactionLabel,
      value: vm.lastTransactionDisplay,
    });
  }

  backFields.push({
    key: "last_update",
    label: WALLET_DEFAULT_TEXTS.lastUpdateLabel,
    value: vm.lastUpdatedDisplay,
  });

  if (vm.formattedAddress) {
    backFields.push({
      key: "address",
      label: WALLET_DEFAULT_TEXTS.addressLabel,
      value: vm.formattedAddress,
    });
  }

  for (const link of vm.links) {
    if (link.id === "phone") {
      backFields.push({ key: "phone", label: link.label, value: vm.phone || link.url });
    } else if (link.url.startsWith("https://")) {
      backFields.push({ key: link.id, label: link.label, value: link.url });
    }
  }

  if (vm.walletTerms) {
    backFields.push({
      key: "terms",
      label: WALLET_DEFAULT_TEXTS.conditionsLabel,
      value: vm.walletTerms,
    });
  }

  if (vm.promoMessage) {
    backFields.push({
      key: "promo",
      label: vm.promoLabel,
      value: vm.promoMessage,
    });
  }

  backFields.push({
    key: "powered_by",
    label: " ",
    value: WALLET_DEFAULT_TEXTS.poweredBy,
  });

  backFields.push({
    key: "scan_hint",
    label: "Info",
    value: WALLET_DEFAULT_TEXTS.scanHint,
  });

  return { headerFields, primaryFields, secondaryFields, auxiliaryFields, backFields };
}

// ---------------------------------------------------------------------------
// Mapping Google Wallet (Phase 4)
// ---------------------------------------------------------------------------

export type GoogleTextModule = {
  id: string;
  header: string;
  body: string;
};

export type GoogleLinkModule = {
  id: string;
  description: string;
  uri: string;
};

export type GoogleWalletFieldSet = {
  accountName: string;
  loyaltyPointsLabel: string;
  loyaltyPointsBalance: number;
  secondaryLoyaltyPointsLabel: string;
  secondaryLoyaltyPointsBalance: number;
  textModulesData: GoogleTextModule[];
  linksModuleData: GoogleLinkModule[];
  alternateText: string;
  notifyMessage: { header: string; body: string };
};

/** IDs référencés par classTemplateInfo — face de carte Google Wallet */
export const GOOGLE_FACE_MODULE_IDS = {
  client: "face_client",
  reward: "face_reward",
  next: "face_next",
  status: "face_status",
  promo: "face_promo",
} as const;

export function buildGoogleSecondaryLoyaltyPoints(vm: WalletCardViewModel): {
  label: string;
  balance: { int: number };
} {
  if (vm.rewardsAvailable > 0) {
    return {
      label: vm.rewardsAvailable > 1 ? "Récompenses" : "Récompense",
      balance: { int: vm.rewardsAvailable },
    };
  }
  if (vm.unitsToNextReward <= 0) {
    return {
      label: "Statut",
      balance: { int: 0 },
    };
  }
  return {
    label: "Encore",
    balance: { int: vm.unitsToNextReward },
  };
}

/**
 * Layout face carte Google — calqué sur Apple (storeCard) : max 2 colonnes / ligne.
 * @see https://developers.google.com/wallet/retail/loyalty-cards/use-cases/pass-customization
 */
export function buildGoogleClassTemplateInfo(): Record<string, unknown> {
  const { client, reward, next, status, promo } = GOOGLE_FACE_MODULE_IDS;
  return {
    cardTemplateOverride: {
      cardRowTemplateInfos: [
        {
          oneItem: {
            item: {
              firstValue: {
                fields: [
                  { fieldPath: "object.loyaltyPoints.label" },
                  { fieldPath: "object.loyaltyPoints.balance" },
                ],
              },
            },
          },
        },
        {
          twoItems: {
            startItem: {
              firstValue: {
                fields: [{ fieldPath: `object.textModulesData['${client}']` }],
              },
            },
            endItem: {
              firstValue: {
                fields: [{ fieldPath: `object.textModulesData['${next}']` }],
              },
            },
          },
        },
        {
          twoItems: {
            startItem: {
              firstValue: {
                fields: [{ fieldPath: `object.textModulesData['${reward}']` }],
              },
            },
            endItem: {
              firstValue: {
                fields: [{ fieldPath: `object.textModulesData['${status}']` }],
              },
            },
          },
        },
        {
          oneItem: {
            item: {
              firstValue: {
                fields: [{ fieldPath: `object.textModulesData['${promo}']` }],
              },
            },
          },
        },
      ],
    },
  };
}

function buildGoogleFaceStatusModule(vm: WalletCardViewModel): GoogleTextModule {
  if (vm.rewardsAvailableText) {
    return {
      id: GOOGLE_FACE_MODULE_IDS.status,
      header: "Dispo",
      body: vm.rewardsAvailableText,
    };
  }
  const unit = vm.programType === "stamps" ? "tampons" : "points";
  const plural = vm.unitsToNextReward > 1 ? unit : unit.replace(/s$/, "") || unit;
  return {
    id: GOOGLE_FACE_MODULE_IDS.status,
    header: "Encore",
    body: vm.unitsToNextReward > 0 ? `${vm.unitsToNextReward} ${plural}` : "—",
  };
}

export function mapViewModelToGoogleFields(vm: WalletCardViewModel): GoogleWalletFieldSet {
  const secondary = buildGoogleSecondaryLoyaltyPoints(vm);

  const textModules: GoogleTextModule[] = [
    {
      id: GOOGLE_FACE_MODULE_IDS.client,
      header: "Client",
      body: vm.customerDisplayName,
    },
    {
      id: GOOGLE_FACE_MODULE_IDS.next,
      header: "Prochaine",
      body: vm.nextRewardText,
    },
    {
      id: GOOGLE_FACE_MODULE_IDS.reward,
      header: "Récompense",
      body: vm.rewardLabel,
    },
    buildGoogleFaceStatusModule(vm),
    {
      id: GOOGLE_FACE_MODULE_IDS.promo,
      header: vm.promoMessage ? vm.promoLabel : " ",
      body: vm.promoMessage || vm.faceTagline,
    },
    {
      id: "program",
      header: WALLET_DEFAULT_TEXTS.loyaltyLabel,
      body: vm.rewardLabel,
    },
    {
      id: "earn_rule",
      header: WALLET_DEFAULT_TEXTS.programLabel,
      body: vm.earnRuleText,
    },
  ];

  if (vm.rewardsAvailableText) {
    textModules.push({
      id: "reward_available",
      header: WALLET_DEFAULT_TEXTS.rewardAvailableLabel,
      body: vm.rewardsAvailableText,
    });
  }

  if (vm.promoMessage) {
    textModules.push({
      id: "promo",
      header: vm.promoLabel,
      body: vm.promoMessage,
    });
  }

  if (vm.lastUpdatedDisplay) {
    textModules.push({
      id: "last_update",
      header: WALLET_DEFAULT_TEXTS.lastUpdateLabel,
      body: vm.lastUpdatedDisplay,
    });
  }

  if (vm.walletTerms) {
    textModules.push({
      id: "terms",
      header: WALLET_DEFAULT_TEXTS.conditionsLabel,
      body: vm.walletTerms,
    });
  }

  textModules.push({
    id: "powered_by",
    header: " ",
    body: WALLET_DEFAULT_TEXTS.poweredBy,
  });

  const linksModuleData: GoogleLinkModule[] = vm.links
    .filter((l) => l.url.startsWith("https://"))
    .map((l) => ({
      id: l.id,
      description: l.label,
      uri: l.url,
    }));

  return {
    accountName: vm.customerDisplayName,
    loyaltyPointsLabel: vm.balanceLabel,
    loyaltyPointsBalance: vm.balance,
    secondaryLoyaltyPointsLabel: secondary.label,
    secondaryLoyaltyPointsBalance: secondary.balance.int,
    textModulesData: textModules,
    linksModuleData,
    alternateText: vm.cardNumber,
    notifyMessage: {
      header: WALLET_DEFAULT_TEXTS.googleSyncHeader,
      body: vm.googleSyncMessageBody,
    },
  };
}
