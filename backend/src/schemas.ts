/** Field definitions for the two survey forms. Mirrors forms/frontend/src/lib/specs.ts (separate deploys). */
export type FieldType = 'text' | 'phone' | 'email' | 'pincode' | 'select' | 'multi' | 'textarea' | 'checkbox';

export interface Field {
  key: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  max?: number;
}

const common: Field[] = [
  { key: 'name', type: 'text', required: true, max: 120 },
  { key: 'phone', type: 'phone', required: true },
  { key: 'email', type: 'email', required: true, max: 200 },
  { key: 'city', type: 'text', required: true, max: 80 },
  { key: 'area', type: 'text', max: 120 },
  { key: 'pincode', type: 'pincode' },
];

export const SCHEMAS = {
  customer: [
    ...common,
    { key: 'householdSize', type: 'select', required: true, options: ['1-2', '3-4', '5-6', '7+'] },
    { key: 'monthlySpend', type: 'select', required: true, options: ['Under ₹1,000', '₹1,000 - ₹2,500', '₹2,500 - ₹5,000', 'Above ₹5,000'] },
    { key: 'orderFrequency', type: 'select', required: true, options: ['Daily', '2-3 times a week', 'Weekly', 'Occasionally'] },
    { key: 'currentSource', type: 'multi', options: ['Local sabzi wala', 'Sabzi mandi', 'Supermarket', 'Quick-commerce app', 'Weekly haat / market', 'Other'] },
    { key: 'topConcerns', type: 'multi', options: ['Freshness', 'Fair price', 'Weighing / quantity', 'Quality consistency', 'Delivery time', 'Hygiene & packaging'] },
    { key: 'interestedFeatures', type: 'multi', options: ['Mandi-rate pricing', 'Quality-checked produce', 'Doorstep delivery', 'Subscription / weekly basket', 'Easy refunds', 'WhatsApp ordering'] },
    { key: 'willingToPay', type: 'select', options: ['Only the cheapest', 'Slightly more for better quality', 'Premium for the best quality'] },
    { key: 'wouldTry', type: 'select', required: true, options: ['Yes, definitely', 'Maybe', 'Not right now'] },
    { key: 'feedback', type: 'textarea', max: 2000 },
    { key: 'whatsappConsent', type: 'checkbox' },
  ],
  partner: [
    { key: 'partnerType', type: 'select', required: true, options: ['Farmer', 'Mandi trader / wholesaler', 'Sabzi vendor / retailer', 'Delivery partner', 'Other'] },
    ...common,
    { key: 'businessName', type: 'text', max: 150 },
    { key: 'experience', type: 'select', options: ['Less than 1 year', '1-3 years', '3-7 years', 'More than 7 years'] },
    { key: 'products', type: 'multi', options: ['Leafy vegetables', 'Root vegetables', 'Seasonal vegetables', 'Fruits', 'Exotic vegetables', 'Herbs & spices'] },
    { key: 'monthlyVolume', type: 'select', options: ['Under 500 kg', '500 - 2,000 kg', '2,000 - 10,000 kg', 'Above 10,000 kg'] },
    { key: 'currentChannels', type: 'multi', options: ['Mandi', 'Local retailers', 'Direct to households', 'Online platforms', 'Hotels / restaurants', 'Not selling yet'] },
    { key: 'challenges', type: 'multi', options: ['Unfair prices', 'Delayed payments', 'Wastage / spoilage', 'Finding buyers', 'Transport & logistics', 'No quality recognition'] },
    { key: 'interestedIn', type: 'multi', options: ['Selling on Sahi-Sahi', 'Fair mandi-linked rates', 'Quick payments', 'Delivery work', 'Quality-check partnership'] },
    { key: 'hasSmartphone', type: 'select', options: ['Yes', 'No'] },
    { key: 'canDeliver', type: 'select', options: ['Yes, with my own vehicle', 'Need help with delivery', 'Not applicable'] },
    { key: 'feedback', type: 'textarea', max: 2000 },
    { key: 'whatsappConsent', type: 'checkbox' },
  ],
} satisfies Record<string, Field[]>;

export type FormKind = keyof typeof SCHEMAS;
export const FORM_KINDS = Object.keys(SCHEMAS) as FormKind[];
