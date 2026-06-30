/** Labels et options — formulaire prospects commerciaux */

export const PROSPECT_STATUS_OPTIONS = [
  { value: 'new', label: 'Nouveau' },
  { value: 'to_contact', label: 'À contacter' },
  { value: 'contacted', label: 'Contacté' },
  { value: 'interested', label: 'Intéressé' },
  { value: 'demo_requested', label: 'Démo demandée' },
  { value: 'demo_done', label: 'Démo faite' },
  { value: 'proposal_sent', label: 'Proposition envoyée' },
  { value: 'to_follow_up', label: 'À relancer' },
  { value: 'signed', label: 'Signé' },
  { value: 'refused', label: 'Refusé' },
  { value: 'lost', label: 'Perdu' },
];

export const PROSPECT_INTEREST_OPTIONS = [
  { value: 'hot', label: 'Chaud' },
  { value: 'warm', label: 'Tiède' },
  { value: 'cold', label: 'Froid' },
  { value: 'refused', label: 'Refus' },
];

export const CONTACT_CHANNEL_OPTIONS = [
  { value: 'physical_visit', label: 'Visite physique' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Recommandation' },
  { value: 'other', label: 'Autre' },
];

export const BUSINESS_TYPE_OPTIONS = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'snack', label: 'Snack' },
  { value: 'pizzeria', label: 'Pizzeria' },
  { value: 'burger', label: 'Burger' },
  { value: 'tacos', label: 'Tacos' },
  { value: 'food_truck', label: 'Food truck' },
  { value: 'bakery', label: 'Boulangerie' },
  { value: 'butcher', label: 'Boucherie' },
  { value: 'beauty_institute', label: 'Institut de beauté' },
  { value: 'hairdresser', label: 'Coiffeur' },
  { value: 'barber', label: 'Barbier' },
  { value: 'grocery', label: 'Épicerie' },
  { value: 'other', label: 'Autre commerce' },
];

export const CONTACT_ROLE_OPTIONS = [
  { value: 'owner', label: 'Gérant' },
  { value: 'manager', label: 'Responsable' },
  { value: 'employee', label: 'Employé' },
  { value: 'partner', label: 'Associé' },
  { value: 'other', label: 'Autre' },
];

export const PREFERRED_CONTACT_OPTIONS = [
  { value: 'phone', label: 'Téléphone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'visit', label: 'Visite' },
  { value: 'unknown', label: 'Ne sait pas' },
];

export const LOYALTY_SYSTEM_OPTIONS = [
  { value: 'none', label: 'Non' },
  { value: 'paper_card', label: 'Oui, carte papier' },
  { value: 'app', label: 'Oui, application' },
  { value: 'pos_kiosk', label: 'Oui, caisse/borne' },
  { value: 'other', label: 'Oui, autre' },
  { value: 'unknown', label: 'Je ne sais pas' },
];

export const YES_NO_UNKNOWN_OPTIONS = [
  { value: 'no', label: 'Non' },
  { value: 'yes', label: 'Oui' },
  { value: 'unknown', label: 'Je ne sais pas' },
];

export const LOYALTY_INTEREST_OPTIONS = [
  { value: 'very_interested', label: 'Très intéressé' },
  { value: 'interested', label: 'Intéressé' },
  { value: 'curious', label: 'Curieux' },
  { value: 'low_interest', label: 'Peu intéressé' },
  { value: 'not_interested', label: 'Pas intéressé' },
  { value: 'to_recontact', label: 'À recontacter' },
];

export const MAIN_PROBLEM_OPTIONS = [
  { value: 'repeat_visits', label: 'Faire revenir les clients' },
  { value: 'revenue', label: 'Augmenter le chiffre d\'affaires' },
  { value: 'loyal_regulars', label: 'Fidéliser les clients réguliers' },
  { value: 'replace_paper', label: 'Remplacer une carte papier' },
  { value: 'send_offers', label: 'Envoyer des offres' },
  { value: 'modernize', label: 'Moderniser l\'image du commerce' },
  { value: 'no_time', label: 'Manque de temps / marketing' },
  { value: 'none_expressed', label: 'Aucun besoin exprimé' },
  { value: 'other', label: 'Autre' },
];

export const OBJECTION_OPTIONS = [
  { value: 'too_expensive', label: 'Trop cher' },
  { value: 'no_time', label: 'Pas le temps' },
  { value: 'no_need', label: 'Pas besoin' },
  { value: 'already_equipped', label: 'Déjà équipé' },
  { value: 'not_digital', label: 'Pas à l\'aise avec le digital' },
  { value: 'need_think', label: 'Doit réfléchir' },
  { value: 'need_partner', label: 'Doit voir avec associé' },
  { value: 'other', label: 'Autre' },
];

export const WANTS_DEMO_OPTIONS = [
  { value: 'yes', label: 'Oui' },
  { value: 'no', label: 'Non' },
  { value: 'maybe', label: 'Peut-être' },
];

export const NEXT_ACTION_OPTIONS = [
  { value: 'send_demo', label: 'Envoyer une démo' },
  { value: 'call_back', label: 'Rappeler' },
  { value: 'visit', label: 'Passer sur place' },
  { value: 'send_website', label: 'Envoyer le lien du site' },
  { value: 'send_offer', label: 'Envoyer l\'offre' },
  { value: 'wait', label: 'Attendre retour' },
  { value: 'do_not_follow', label: 'Ne pas relancer' },
];

export const OFFER_PRESENTED_OPTIONS = [
  { value: 'wallet', label: 'RegalClic Wallet' },
  { value: 'white_label_app', label: 'Application mobile marque blanche' },
  { value: 'both', label: 'Les deux' },
  { value: 'unspecified', label: 'Non précisé' },
];

export function getProspectStatusLabel(value) {
  return PROSPECT_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getProspectInterestLabel(value) {
  return PROSPECT_INTEREST_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getBusinessTypeLabel(value) {
  return BUSINESS_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function createEmptyProspectForm() {
  return {
    commercial_code: '',
    business_name: '',
    business_type: '',
    city: '',
    postal_code: '',
    address: '',
    contact_name: '',
    contact_role: '',
    phone_mobile: '',
    email: '',
    preferred_contact_method: '',
    has_loyalty_system: '',
    has_pos_or_kiosk: '',
    loyalty_interest: '',
    main_problem: '',
    objections: [],
    interest_level: '',
    wants_demo: '',
    demo_done: false,
    follow_up_date: '',
    next_action: '',
    status: 'new',
  };
}

export function validateProspectFormClient(form) {
  const errors = [];
  if (!form.commercial_code?.trim()) {
    errors.push('Le code commercial est requis.');
  }
  if (!form.business_name?.trim()) errors.push('Le nom du commerce est requis.');
  if (!form.business_type) errors.push('Le type de commerce est requis.');
  if (!form.city?.trim()) errors.push('La ville est requise.');
  if (!form.interest_level) errors.push('Le niveau d\'intérêt est requis.');
  if (!form.status) errors.push('Le statut est requis.');
  return errors;
}
