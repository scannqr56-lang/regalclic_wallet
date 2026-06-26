/**
 * Données d'aperçu carte Wallet (dashboard) — aligné sur wallet-card-model.ts côté Edge.
 */

import { DEFAULT_LABEL_COLOR, DEFAULT_PRIMARY_COLOR, normalizeHexColor } from './wallet-colors';

export const PREVIEW_CUSTOMER_NAME = 'Jean Dupont';
export const PREVIEW_CARD_NUMBER = 'RC-PREVIEW01';
export const PREVIEW_BALANCE_POINTS = 42;
export const PREVIEW_BALANCE_STAMPS = 7;
export const DEFAULT_TAGLINE = 'Votre fidélité récompensée';

function resolveRewardThreshold(program) {
  const raw = program?.reward_threshold;
  if (raw != null && Number(raw) > 0) return Math.floor(Number(raw));
  return 100;
}

function computeUnitsToNextReward(programType, balance, program) {
  const safeBalance = Math.max(0, Math.floor(balance));
  if (programType === 'stamps') {
    const required = Math.max(Math.floor(Number(program?.stamps_required) || 10), 1);
    if (safeBalance >= required) return 0;
    return required - safeBalance;
  }
  const threshold = resolveRewardThreshold(program);
  const remainder = safeBalance % threshold;
  if (remainder === 0 && safeBalance > 0) return 0;
  return threshold - remainder;
}

function formatEarnRuleText(programType, program, rewardLabel) {
  if (programType === 'stamps') {
    const required = Math.max(Math.floor(Number(program?.stamps_required) || 10), 1);
    return `${required} tampons = 1 ${rewardLabel.toLowerCase()}`;
  }
  const perEuro = Number(program?.points_per_euro) || 1;
  const pointWord = perEuro === 1 ? 'point' : 'points';
  if (perEuro === 1) return `1 € = 1 ${pointWord}`;
  const formatted = Number.isInteger(perEuro) ? String(perEuro) : perEuro.toFixed(2).replace(/\.?0+$/, '');
  return `1 € = ${formatted} ${pointWord}`;
}

function formatNextRewardText(programType, unitsToNext, rewardLabel) {
  if (unitsToNext <= 0) {
    return programType === 'stamps'
      ? `Prochain ${rewardLabel.toLowerCase()} bientôt disponible`
      : 'Seuil de récompense atteint';
  }
  const unit = programType === 'stamps' ? 'tampon' : 'point';
  const plural = unitsToNext > 1 ? `${unit}s` : unit;
  return `Encore ${unitsToNext} ${plural}`;
}

function normalizeHttpsUrl(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) return trimmed;
  return `https://${trimmed}`;
}

function buildPreviewLinks(form) {
  const links = [];
  const website = normalizeHttpsUrl(form.website);
  const order = normalizeHttpsUrl(form.order_url);
  const instagram = normalizeHttpsUrl(form.instagram_url);
  if (website) links.push({ id: 'website', label: 'Site web' });
  if (order) links.push({ id: 'order', label: 'Commander' });
  if (instagram) links.push({ id: 'instagram', label: 'Instagram' });
  if ((form.phone || '').trim()) links.push({ id: 'phone', label: 'Téléphone' });
  return links;
}

function resolveFaceTagline(promoMessage) {
  const promo = (promoMessage || '').trim();
  return promo || DEFAULT_TAGLINE;
}

/**
 * @param {object} form — état formulaire BusinessSettingsPage
 * @param {object|null} loyaltyProgram — programme fidélité du commerce
 */
export function buildWalletPreviewModel(form, loyaltyProgram) {
  const programType = loyaltyProgram?.type === 'stamps' ? 'stamps' : 'points';
  const rewardLabel = (loyaltyProgram?.reward_label || '').trim() || 'Récompense';
  const balance = programType === 'stamps' ? PREVIEW_BALANCE_STAMPS : PREVIEW_BALANCE_POINTS;
  const balanceLabel = programType === 'stamps' ? 'Tampons' : 'Points';
  const unitsToNext = computeUnitsToNextReward(programType, balance, loyaltyProgram);

  const promo = (form.wallet_promo_message || '').trim();

  return {
    businessName: (form.name || '').trim() || 'Mon commerce',
    customerDisplayName: PREVIEW_CUSTOMER_NAME,
    cardNumber: PREVIEW_CARD_NUMBER,
    logoUrl: (form.logo_url || '').trim() || null,
    heroUrl: (form.wallet_hero_url || '').trim() || null,
    primaryColor: normalizeHexColor(form.primary_color, DEFAULT_PRIMARY_COLOR),
    labelColor: normalizeHexColor(form.wallet_label_color, DEFAULT_LABEL_COLOR),
    balance,
    balanceLabel,
    rewardLabel,
    nextRewardText: formatNextRewardText(programType, unitsToNext, rewardLabel),
    earnRuleText: formatEarnRuleText(programType, loyaltyProgram, rewardLabel),
    faceTagline: resolveFaceTagline(promo),
    promoMessage: promo || null,
    walletTerms: (form.wallet_terms || '').trim() || null,
    links: buildPreviewLinks(form),
    rewardsAvailableSample: programType === 'stamps' ? 0 : 1,
  };
}
