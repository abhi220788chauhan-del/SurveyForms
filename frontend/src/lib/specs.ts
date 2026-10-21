/** Form definitions rendered by SurveyPage. Mirrors forms/backend/src/schemas.ts (separate deploys). */
export type FieldType = 'text' | 'phone' | 'email' | 'pincode' | 'select' | 'multi' | 'textarea' | 'checkbox';

export interface FieldSpec {
  key: string;
  label: string;
  /** Hindi translation of `label`, shown under it. Display only: stored values stay English. */
  labelHi?: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  placeholder?: string;
  max?: number;
}

export interface Section {
  title: string;
  titleHi?: string;
  fields: FieldSpec[];
}

export interface FormSpec {
  kind: 'customer' | 'partner';
  title: string;
  titleHi?: string;
  intro: string;
  introHi?: string;
  sections: Section[];
}

const contact = (title: string, titleHi?: string): Section => ({
  title,
  titleHi,
  fields: [
    { key: 'name', label: 'Full name', labelHi: 'पूरा नाम', type: 'text', required: true, max: 120, placeholder: 'Your name' },
    { key: 'phone', label: 'Mobile number', labelHi: 'मोबाइल नंबर', type: 'phone', required: true, placeholder: '10-digit mobile number' },
    { key: 'email', label: 'Email', labelHi: 'ईमेल', type: 'email', required: true, max: 200, placeholder: 'you@example.com' },
    { key: 'city', label: 'City', labelHi: 'शहर', type: 'text', required: true, max: 80, placeholder: 'e.g. Lucknow' },
    { key: 'area', label: 'Area / locality', labelHi: 'क्षेत्र / इलाका', type: 'text', max: 120, placeholder: 'e.g. Gomti Nagar' },
    { key: 'pincode', label: 'PIN code', labelHi: 'पिन कोड', type: 'pincode', placeholder: '6-digit PIN code' },
  ],
});

const consent: FieldSpec = {
  key: 'whatsappConsent',
  label: 'You may contact me on WhatsApp about Sahi-Sahi updates.',
  labelHi: 'Sahi-Sahi के अपडेट के बारे में मुझसे WhatsApp पर संपर्क किया जा सकता है।',
  type: 'checkbox',
};

export const CUSTOMER_FORM: FormSpec = {
  kind: 'customer',
  title: 'Customer survey',
  titleHi: 'ग्राहक सर्वे',
  intro: 'Tell us how your family buys vegetables today. It takes about 2 minutes and helps us build Sahi-Sahi around you.',
  introHi: 'अपने परिवार की सब्ज़ी खरीद के बारे में बताएँ। इसमें लगभग 2 मिनट लगते हैं और इससे हमें आपके लिए Sahi-Sahi बनाने में मदद मिलती है।',
  sections: [
    contact('About you', 'आपके बारे में'),
    {
      title: 'Your vegetable shopping',
      titleHi: 'आपकी सब्ज़ी खरीदारी',
      fields: [
        { key: 'householdSize', label: 'People in your household', labelHi: 'आपके घर में कितने लोग हैं', type: 'select', required: true, options: ['1-2', '3-4', '5-6', '7+'] },
        { key: 'monthlySpend', label: 'Monthly vegetable spend', labelHi: 'मासिक सब्ज़ी खर्च', type: 'select', required: true, options: ['Under ₹1,000', '₹1,000 - ₹2,500', '₹2,500 - ₹5,000', 'Above ₹5,000'] },
        { key: 'orderFrequency', label: 'How often do you buy vegetables?', labelHi: 'आप कितनी बार सब्ज़ी खरीदते हैं?', type: 'select', required: true, options: ['Daily', '2-3 times a week', 'Weekly', 'Occasionally'] },
        { key: 'currentSource', label: 'Where do you buy from today?', labelHi: 'आज आप कहाँ से खरीदते हैं?', type: 'multi', options: ['Local sabzi wala', 'Sabzi mandi', 'Supermarket', 'Quick-commerce app', 'Weekly haat / market', 'Other'] },
        { key: 'topConcerns', label: 'What bothers you the most?', labelHi: 'सबसे ज़्यादा क्या परेशान करता है?', type: 'multi', options: ['Freshness', 'Fair price', 'Weighing / quantity', 'Quality consistency', 'Delivery time', 'Hygiene & packaging'] },
      ],
    },
    {
      title: 'What would you like from us?',
      titleHi: 'आप हमसे क्या चाहते हैं?',
      fields: [
        { key: 'interestedFeatures', label: 'Features you are interested in', labelHi: 'कौन सी सुविधाएँ आपको पसंद हैं', type: 'multi', options: ['Mandi-rate pricing', 'Quality-checked produce', 'Doorstep delivery', 'Subscription / weekly basket', 'Easy refunds', 'WhatsApp ordering'] },
        { key: 'willingToPay', label: 'Price vs quality', labelHi: 'कीमत बनाम गुणवत्ता', type: 'select', options: ['Only the cheapest', 'Slightly more for better quality', 'Premium for the best quality'] },
        { key: 'wouldTry', label: 'Would you try Sahi-Sahi?', labelHi: 'क्या आप Sahi-Sahi आज़माना चाहेंगे?', type: 'select', required: true, options: ['Yes, definitely', 'Maybe', 'Not right now'] },
        { key: 'feedback', label: 'Anything else you want to tell us?', labelHi: 'कुछ और जो आप हमें बताना चाहें?', type: 'textarea', max: 2000, placeholder: 'Your suggestions, expectations or complaints' },
        consent,
      ],
    },
  ],
};

export const PARTNER_FORM: FormSpec = {
  kind: 'partner',
  title: 'Partner survey',
  intro: 'Farmers, mandi traders, vegetable vendors and delivery partners - tell us about your work so we can build fair, mandi-linked opportunities together.',
  sections: [
    {
      title: 'Who are you?',
      titleHi: 'आप कौन हैं?',
      fields: [{ key: 'partnerType', label: 'I am a', labelHi: 'मैं हूँ', type: 'select', required: true, options: ['Farmer', 'Mandi trader / wholesaler', 'Sabzi vendor / retailer', 'Delivery partner', 'Other'] }],
    },
    {
      ...contact('Contact details', 'संपर्क विवरण'),
      fields: [
        ...contact('').fields,
        { key: 'businessName', label: 'Farm / shop / business name (optional)', labelHi: 'खेत / दुकान / व्यवसाय का नाम (वैकल्पिक)', type: 'text', max: 150 },
      ],
    },
    {
      title: 'Your work',
      titleHi: 'आपका काम',
      fields: [
        { key: 'experience', label: 'Experience', labelHi: 'अनुभव', type: 'select', options: ['Less than 1 year', '1-3 years', '3-7 years', 'More than 7 years'] },
        { key: 'products', label: 'What do you grow / sell?', labelHi: 'आप क्या उगाते / बेचते हैं?', type: 'multi', options: ['Leafy vegetables', 'Root vegetables', 'Seasonal vegetables', 'Fruits', 'Exotic vegetables', 'Herbs & spices'] },
        { key: 'monthlyVolume', label: 'Monthly volume', labelHi: 'मासिक मात्रा', type: 'select', options: ['Under 500 kg', '500 - 2,000 kg', '2,000 - 10,000 kg', 'Above 10,000 kg'] },
        { key: 'currentChannels', label: 'Where do you sell today?', labelHi: 'आज आप कहाँ बेचते हैं?', type: 'multi', options: ['Mandi', 'Local retailers', 'Direct to households', 'Online platforms', 'Hotels / restaurants', 'Not selling yet'] },
        { key: 'challenges', label: 'Your biggest challenges', labelHi: 'आपकी सबसे बड़ी चुनौतियाँ', type: 'multi', options: ['Unfair prices', 'Delayed payments', 'Wastage / spoilage', 'Finding buyers', 'Transport & logistics', 'No quality recognition'] },
      ],
    },
    {
      title: 'Working with Sahi-Sahi',
      titleHi: 'Sahi-Sahi के साथ काम',
      fields: [
        { key: 'interestedIn', label: 'What interests you?', labelHi: 'आपकी रुचि किसमें है?', type: 'multi', options: ['Selling on Sahi-Sahi', 'Fair mandi-linked rates', 'Quick payments', 'Delivery work', 'Quality-check partnership'] },
        { key: 'hasSmartphone', label: 'Do you use a smartphone?', labelHi: 'क्या आप स्मार्टफ़ोन इस्तेमाल करते हैं?', type: 'select', options: ['Yes', 'No'] },
        { key: 'canDeliver', label: 'Delivery', labelHi: 'डिलीवरी', type: 'select', options: ['Yes, with my own vehicle', 'Need help with delivery', 'Not applicable'] },
        { key: 'feedback', label: 'Anything else you want to tell us?', labelHi: 'कुछ और जो आप हमें बताना चाहें?', type: 'textarea', max: 2000, placeholder: 'Tell us what would make this work for you' },
        consent,
      ],
    },
  ],
};

export const FORMS = { customer: CUSTOMER_FORM, partner: PARTNER_FORM } as const;
