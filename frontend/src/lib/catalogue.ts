import property from '../assets/hero-isometric-building.webp';
import mortgage from '../assets/navbar/mortgage.webp';
import corporate from '../assets/navbar/corporate-advisory.webp';
import banking from '../assets/bank-account-hero.webp';
import city from '../assets/hero-city-bg.webp';
import office from '../assets/hero-building-glass.webp';

export function presentation(slug: string) {
  if (/property|real-estate/i.test(slug)) return { category: 'Real estate', image: property, prompt: 'Which location, property type and budget suit the client?' };
  if (/mortgage/i.test(slug)) return { category: 'Finance', image: mortgage, prompt: 'Describe the financing purpose and purchase timeframe.' };
  if (/bank|account/i.test(slug)) return { category: 'Banking', image: banking, prompt: 'Describe the business and its account requirements.' };
  if (/visa|residen/i.test(slug)) return { category: 'Residency', image: city, prompt: 'Which residency route would the client like to discuss?' };
  if (/formation|licen/i.test(slug)) return { category: 'Business setup', image: office, prompt: 'Which business activity and jurisdiction are under consideration?' };
  return { category: 'Advisory', image: corporate, prompt: 'What outcome would the client like from this service?' };
}

export const demoProperties = [
  { id: 'creek-court', title: 'Creek Court', location: 'Dubai', type: 'Apartment', specs: '2 beds · 2 baths · 112 m²', image: property },
  { id: 'palm-garden', title: 'Palm Garden House', location: 'Abu Dhabi', type: 'Villa', specs: '4 beds · 4 baths · 310 m²', image: office },
  { id: 'marina-terrace', title: 'Marina Terrace', location: 'Dubai', type: 'Townhouse', specs: '3 beds · 3 baths · 205 m²', image: city },
];

export function workflowLabel(lead: import('../types').LeadItem) {
  if (lead.status === 'DRAFT' && lead.agencyReviewStage === 'PENDING_AGENCY_APPROVAL') return 'Pending Agency Review';
  if (lead.status === 'DRAFT' && lead.agencyReviewStage === 'AGENCY_CHANGES_REQUESTED') return 'Agency changes requested';
  if (lead.status === 'SUBMITTED') return 'Prospera review';
  return lead.status.charAt(0) + lead.status.slice(1).toLowerCase().replaceAll('_', ' ');
}
