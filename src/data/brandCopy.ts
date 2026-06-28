import { BusinessType } from './onboarding';

export type BrandCopy = {
  businessLabel: string;
  professional: string;
  professionalTitle: string;
  shop: string;
  welcomeAccent: string;
  welcomeSubtitle: string;
  onboardingDoneSubtitle: string;
  paywallHeadline: string;
  paywallSubheadline: string;
  loginTagline: string;
  loginSubtitle: string;
};

const SALON_COPY: BrandCopy = {
  businessLabel: 'Hairstylist/braider',
  professional: 'stylist',
  professionalTitle: 'Hairstylist',
  shop: 'chair',
  welcomeAccent: 'your chair is about to get busier.',
  welcomeSubtitle: "A few fun questions, then we'll set up your business — takes about two minutes.",
  onboardingDoneSubtitle: 'your booking site is next.',
  paywallHeadline: 'Stop Managing Your Clients Through DMs',
  paywallSubheadline:
    'Bookings, clients, payments, reminders, and scheduling — requires a Styld subscription.',
  loginTagline: 'The CRM built for hairstylists & braiders',
  loginSubtitle: 'Bookings, clients, payments, and your booking site — all in one place.',
};

const BARBER_COPY: BrandCopy = {
  businessLabel: 'Barbershop',
  professional: 'barber',
  professionalTitle: 'Barber',
  shop: 'barbershop',
  welcomeAccent: 'your shop is about to get busier.',
  welcomeSubtitle: "A few quick questions, then we'll set up your barbershop — takes about two minutes.",
  onboardingDoneSubtitle: 'your booking site is next.',
  paywallHeadline: 'Stop Running Your Barbershop Through DMs',
  paywallSubheadline:
    'Cuts, bookings, clients, payments, and reminders — requires a Styld subscription.',
  loginTagline: 'The CRM built for barbers',
  loginSubtitle: 'Bookings, clients, payments, and your barbershop site — all in one place.',
};

const MAKEUP_COPY: BrandCopy = {
  businessLabel: 'Makeup artist',
  professional: 'artist',
  professionalTitle: 'Makeup artist',
  shop: 'studio',
  welcomeAccent: 'your calendar is about to fill up.',
  welcomeSubtitle: "A few quick questions, then we'll set up your studio — takes about two minutes.",
  onboardingDoneSubtitle: 'your booking site is next.',
  paywallHeadline: 'Stop Booking Makeup Through DMs',
  paywallSubheadline:
    'Clients, appointments, payments, and reminders — requires a Styld subscription.',
  loginTagline: 'The CRM built for makeup artists',
  loginSubtitle: 'Bookings, clients, payments, and your studio site — all in one place.',
};

const NAIL_COPY: BrandCopy = {
  businessLabel: 'Nail tech',
  professional: 'nail tech',
  professionalTitle: 'Nail tech',
  shop: 'nail studio',
  welcomeAccent: 'your chair is about to get busier.',
  welcomeSubtitle: "A few quick questions, then we'll set up your nail studio — takes about two minutes.",
  onboardingDoneSubtitle: 'your booking site is next.',
  paywallHeadline: 'Stop Running Your Nail Business Through DMs',
  paywallSubheadline:
    'Appointments, clients, payments, and reminders — requires a Styld subscription.',
  loginTagline: 'The CRM built for nail techs',
  loginSubtitle: 'Bookings, clients, payments, and your nail site — all in one place.',
};

const LASH_COPY: BrandCopy = {
  businessLabel: 'Lash tech',
  professional: 'lash tech',
  professionalTitle: 'Lash tech',
  shop: 'lash studio',
  welcomeAccent: 'your lash bed is about to fill up.',
  welcomeSubtitle: "A few quick questions, then we'll set up your lash studio — takes about two minutes.",
  onboardingDoneSubtitle: 'your booking site is next.',
  paywallHeadline: 'Stop Booking Lashes Through DMs',
  paywallSubheadline:
    'Appointments, clients, payments, and reminders — requires a Styld subscription.',
  loginTagline: 'The CRM built for lash techs',
  loginSubtitle: 'Bookings, clients, payments, and your lash site — all in one place.',
};

const OTHER_COPY: BrandCopy = {
  businessLabel: 'Other',
  professional: 'pro',
  professionalTitle: 'Professional',
  shop: 'business',
  welcomeAccent: 'your calendar is about to fill up.',
  welcomeSubtitle: "A few quick questions, then we'll set up your business — takes about two minutes.",
  onboardingDoneSubtitle: 'your booking site is next.',
  paywallHeadline: 'Stop Running Your Business Through DMs',
  paywallSubheadline:
    'Bookings, clients, payments, reminders, and scheduling — requires a Styld subscription.',
  loginTagline: 'The CRM built for beauty & wellness pros',
  loginSubtitle: 'Bookings, clients, payments, and your booking site — all in one place.',
};

const BRAND_COPY: Record<BusinessType, BrandCopy> = {
  hair_salon: SALON_COPY,
  barber: BARBER_COPY,
  makeup_artist: MAKEUP_COPY,
  nail_tech: NAIL_COPY,
  lash_tech: LASH_COPY,
  other: OTHER_COPY,
};

function withCustomOtherLabel(copy: BrandCopy, otherLabel: string): BrandCopy {
  const label = otherLabel.trim();
  return {
    ...copy,
    businessLabel: label,
    professionalTitle: label,
    loginTagline: `The CRM built for ${label}`,
  };
}

export function getBrandCopy(businessType: BusinessType | '', businessTypeOther?: string): BrandCopy {
  if (!businessType) return SALON_COPY;
  const base = BRAND_COPY[businessType];
  if (businessType === 'other' && businessTypeOther?.trim()) {
    return withCustomOtherLabel(base, businessTypeOther);
  }
  return base;
}

export const SALON_PAYWALL_NOTIFS = [
  { title: 'New booking', msg: 'Sarah M. booked Knotless braids · Sat 2:00 PM', time: 'now' },
  { title: 'Deposit paid', msg: '$75 deposit from Jada W. · Silk press', time: 'now' },
  { title: 'Booking confirmed', msg: 'Mia T. · Box braids · Fri 11:00 AM', time: '1m ago' },
  { title: 'Payment received', msg: '$120 from Keisha R. · Kids braids', time: 'now' },
  { title: 'New inquiry', msg: 'Alexis P. asked about loc retwist availability', time: '2m ago' },
  { title: 'Appointment tomorrow', msg: 'Reminder: Brianna L. · Sew-in · 9:30 AM', time: 'now' },
  { title: 'New booking', msg: 'Taylor J. booked Butterfly locs · Sun 1:00 PM', time: 'now' },
  { title: 'Deposit paid', msg: '$50 deposit from Nina C. · Trim & style', time: '3m ago' },
] as const;

export const BARBER_PAYWALL_NOTIFS = [
  { title: 'New booking', msg: 'Marcus J. booked Skin fade · Sat 2:00 PM', time: 'now' },
  { title: 'Deposit paid', msg: '$25 deposit from Devin W. · Beard trim', time: 'now' },
  { title: 'Booking confirmed', msg: 'Chris T. · Taper fade · Fri 11:00 AM', time: '1m ago' },
  { title: 'Payment received', msg: '$45 from Andre R. · Line up', time: 'now' },
  { title: 'New inquiry', msg: 'Jordan P. asked about walk-in availability', time: '2m ago' },
  { title: 'Appointment tomorrow', msg: 'Reminder: Mike L. · Fade + beard · 9:30 AM', time: 'now' },
  { title: 'New booking', msg: 'Tyler J. booked Hot towel shave · Sun 1:00 PM', time: 'now' },
  { title: 'Deposit paid', msg: '$20 deposit from Ryan C. · Kids cut', time: '3m ago' },
] as const;

export const MAKEUP_PAYWALL_NOTIFS = [
  { title: 'New booking', msg: 'Jasmine K. booked Bridal glam · Sat 10:00 AM', time: 'now' },
  { title: 'Deposit paid', msg: '$75 deposit from Mia R. · Soft glam', time: 'now' },
  { title: 'Booking confirmed', msg: 'Ava T. · Event makeup · Fri 2:00 PM', time: '1m ago' },
  { title: 'Payment received', msg: '$120 from Chloe L. · Photoshoot look', time: 'now' },
  { title: 'New inquiry', msg: 'Emma P. asked about bridal trial availability', time: '2m ago' },
  { title: 'Appointment tomorrow', msg: 'Reminder: Sofia M. · Prom glam · 11:00 AM', time: 'now' },
] as const;

export const NAIL_PAYWALL_NOTIFS = [
  { title: 'New booking', msg: 'Taylor S. booked Gel manicure · Sat 1:00 PM', time: 'now' },
  { title: 'Deposit paid', msg: '$30 deposit from Nina W. · Full set', time: 'now' },
  { title: 'Booking confirmed', msg: 'Kayla T. · Pedicure · Fri 3:30 PM', time: '1m ago' },
  { title: 'Payment received', msg: '$65 from Jordan R. · Nail art fill', time: 'now' },
  { title: 'New inquiry', msg: 'Alexis P. asked about acrylic set pricing', time: '2m ago' },
  { title: 'Appointment tomorrow', msg: 'Reminder: Bri L. · Gel removal · 10:00 AM', time: 'now' },
] as const;

export const LASH_PAYWALL_NOTIFS = [
  { title: 'New booking', msg: 'Morgan K. booked Volume fill · Sat 11:00 AM', time: 'now' },
  { title: 'Deposit paid', msg: '$40 deposit from Riley S. · Classic set', time: 'now' },
  { title: 'Booking confirmed', msg: 'Casey T. · Hybrid lashes · Fri 2:30 PM', time: '1m ago' },
  { title: 'Payment received', msg: '$95 from Dana L. · Lash lift & tint', time: 'now' },
  { title: 'New inquiry', msg: 'Sam P. asked about mega volume pricing', time: '2m ago' },
  { title: 'Appointment tomorrow', msg: 'Reminder: Jordan M. · Fill · 10:00 AM', time: 'now' },
] as const;

export function getPaywallNotifs(businessType: BusinessType | '') {
  switch (businessType) {
    case 'barber':
      return BARBER_PAYWALL_NOTIFS;
    case 'makeup_artist':
      return MAKEUP_PAYWALL_NOTIFS;
    case 'nail_tech':
      return NAIL_PAYWALL_NOTIFS;
    case 'lash_tech':
      return LASH_PAYWALL_NOTIFS;
    case 'other':
      return SALON_PAYWALL_NOTIFS;
    default:
      return SALON_PAYWALL_NOTIFS;
  }
}

type VibeMessage = { quote: string; sub: string };
type VibeFn = (n: number) => VibeMessage;
type VibeProgressFn = (done: number, left: number) => VibeMessage;

export const SALON_DAY_OFF_MESSAGES: VibeMessage[] = [
  { quote: 'Enjoy your day off 🌿', sub: 'Nothing booked — rest up.' },
  { quote: 'Clear calendar today ✨', sub: 'Take some time for yourself.' },
  { quote: 'A well-earned rest 🛁', sub: 'Recharge and come back stronger.' },
  { quote: 'No clients today 🤍', sub: 'Do something you love.' },
  { quote: 'Free day — make it yours 🌸', sub: "You've been putting in the work." },
];

export const BARBER_DAY_OFF_MESSAGES: VibeMessage[] = [
  { quote: 'Shop is quiet today ✂️', sub: 'Nothing booked — enjoy the break.' },
  { quote: 'Clear books today', sub: 'Recharge before the next rush.' },
  { quote: 'No cuts on the schedule', sub: 'Take the day for yourself.' },
  { quote: 'Empty chair, clear mind', sub: 'Rest up — busy days ahead.' },
  { quote: 'Day off earned 💈', sub: "You've been grinding." },
];

export const SALON_NOT_STARTED_MESSAGES: VibeFn[] = [
  (n) => ({ quote: `${n} ${n === 1 ? 'appointment' : 'appointments'} lined up today.`, sub: 'Time to make it happen.' }),
  (n) => ({ quote: `Big day ahead — ${n} booked 💼`, sub: "Let's get it." }),
  (n) => ({ quote: `${n} ${n === 1 ? 'client is' : 'clients are'} counting on you today ✨`, sub: "You've got this." }),
];

export const BARBER_NOT_STARTED_MESSAGES: VibeFn[] = [
  (n) => ({ quote: `${n} ${n === 1 ? 'cut' : 'cuts'} on the books today.`, sub: 'Time to open up.' }),
  (n) => ({ quote: `Busy chair ahead — ${n} booked`, sub: "Let's run a clean shop." }),
  (n) => ({ quote: `${n} ${n === 1 ? 'client' : 'clients'} coming through today`, sub: 'Sharp fades, sharp day.' }),
];

export const SALON_IN_PROGRESS_MESSAGES: VibeProgressFn[] = [
  (done, left) => ({ quote: `${left} more to go — keep it up 💪`, sub: `${done} done so far.` }),
  (done, left) => ({ quote: `On a roll — ${left} left 🔥`, sub: `${done} already behind you.` }),
  (done, left) => ({ quote: `${done} down, ${left} to finish strong ✨`, sub: 'Keep the momentum.' }),
];

export const BARBER_IN_PROGRESS_MESSAGES: VibeProgressFn[] = [
  (done, left) => ({ quote: `${left} more in the chair — keep going`, sub: `${done} done so far.` }),
  (done, left) => ({ quote: `On a roll — ${left} left`, sub: `${done} already handled.` }),
  (done, left) => ({ quote: `${done} down, ${left} to close out strong`, sub: 'Stay sharp.' }),
];

export const SALON_ALL_DONE_MESSAGES: VibeFn[] = [
  (n) => ({ quote: 'Wrapped up for the day 🙌', sub: `All ${n} done — incredible.` }),
  (n) => ({ quote: 'You crushed it today 🔥', sub: `Every single one — done.` }),
  (n) => ({ quote: "That's a wrap ✨", sub: `${n} ${n === 1 ? 'client' : 'clients'} taken care of today.` }),
];

export const BARBER_ALL_DONE_MESSAGES: VibeFn[] = [
  (n) => ({ quote: 'Shop closed out strong ✂️', sub: `All ${n} done.` }),
  (n) => ({ quote: 'Clean cuts all day', sub: `Every appointment handled.` }),
  (n) => ({ quote: "That's a full book 💈", sub: `${n} ${n === 1 ? 'client' : 'clients'} walked out fresh.` }),
];

export const MAKEUP_DAY_OFF_MESSAGES: VibeMessage[] = [
  { quote: 'No glam booked today ✨', sub: 'Enjoy the quiet studio.' },
  { quote: 'Clear calendar today', sub: 'Rest up before the next event rush.' },
  { quote: 'Studio day off', sub: 'Take time for yourself.' },
];

export const NAIL_DAY_OFF_MESSAGES: VibeMessage[] = [
  { quote: 'No appointments today 💅', sub: 'Enjoy the break.' },
  { quote: 'Empty chair today', sub: 'Recharge before the next rush.' },
  { quote: 'Studio is quiet', sub: 'Take the day for yourself.' },
];

export const MAKEUP_NOT_STARTED_MESSAGES: VibeFn[] = [
  (n) => ({ quote: `${n} ${n === 1 ? 'appointment' : 'appointments'} today.`, sub: 'Time to get glam ready.' }),
  (n) => ({ quote: `${n} clients booked today ✨`, sub: "Let's make them shine." }),
];

export const NAIL_NOT_STARTED_MESSAGES: VibeFn[] = [
  (n) => ({ quote: `${n} ${n === 1 ? 'appointment' : 'appointments'} on the books.`, sub: 'Time to open up.' }),
  (n) => ({ quote: `Busy day ahead — ${n} booked 💅`, sub: "Let's run a clean studio." }),
];

export const MAKEUP_IN_PROGRESS_MESSAGES: VibeProgressFn[] = [
  (done, left) => ({ quote: `${left} more to go ✨`, sub: `${done} done so far.` }),
  (done, left) => ({ quote: `${done} down, ${left} left`, sub: 'Keep the momentum.' }),
];

export const NAIL_IN_PROGRESS_MESSAGES: VibeProgressFn[] = [
  (done, left) => ({ quote: `${left} more in the chair`, sub: `${done} done so far.` }),
  (done, left) => ({ quote: `${done} down, ${left} to finish`, sub: 'Stay sharp.' }),
];

export const MAKEUP_ALL_DONE_MESSAGES: VibeFn[] = [
  (n) => ({ quote: 'All glam complete ✨', sub: `${n} ${n === 1 ? 'client' : 'clients'} served today.` }),
];

export const NAIL_ALL_DONE_MESSAGES: VibeFn[] = [
  (n) => ({ quote: 'Studio closed out strong 💅', sub: `All ${n} done.` }),
  (n) => ({ quote: 'Full book today', sub: `Every appointment handled.` }),
];

export const LASH_DAY_OFF_MESSAGES: VibeMessage[] = [
  { quote: 'No lash appointments today ✨', sub: 'Enjoy the quiet studio.' },
  { quote: 'Empty lash bed today', sub: 'Recharge before the next rush.' },
  { quote: 'Studio day off', sub: 'Take time for yourself.' },
];

export const LASH_NOT_STARTED_MESSAGES: VibeFn[] = [
  (n) => ({ quote: `${n} ${n === 1 ? 'appointment' : 'appointments'} on the books.`, sub: 'Time to open up.' }),
  (n) => ({ quote: `Busy day ahead — ${n} booked ✨`, sub: "Let's run a clean studio." }),
];

export const LASH_IN_PROGRESS_MESSAGES: VibeProgressFn[] = [
  (done, left) => ({ quote: `${left} more sets to go`, sub: `${done} done so far.` }),
  (done, left) => ({ quote: `${done} down, ${left} to finish`, sub: 'Keep the momentum.' }),
];

export const LASH_ALL_DONE_MESSAGES: VibeFn[] = [
  (n) => ({ quote: 'All sets complete ✨', sub: `${n} ${n === 1 ? 'client' : 'clients'} served today.` }),
  (n) => ({ quote: 'Full lash book today', sub: `Every appointment handled.` }),
];

export function getDashboardVibeMessages(businessType: BusinessType | '') {
  switch (businessType) {
    case 'barber':
      return {
        dayOff: BARBER_DAY_OFF_MESSAGES,
        notStarted: BARBER_NOT_STARTED_MESSAGES,
        inProgress: BARBER_IN_PROGRESS_MESSAGES,
        allDone: BARBER_ALL_DONE_MESSAGES,
      };
    case 'makeup_artist':
      return {
        dayOff: MAKEUP_DAY_OFF_MESSAGES,
        notStarted: MAKEUP_NOT_STARTED_MESSAGES,
        inProgress: MAKEUP_IN_PROGRESS_MESSAGES,
        allDone: MAKEUP_ALL_DONE_MESSAGES,
      };
    case 'nail_tech':
      return {
        dayOff: NAIL_DAY_OFF_MESSAGES,
        notStarted: NAIL_NOT_STARTED_MESSAGES,
        inProgress: NAIL_IN_PROGRESS_MESSAGES,
        allDone: NAIL_ALL_DONE_MESSAGES,
      };
    case 'lash_tech':
      return {
        dayOff: LASH_DAY_OFF_MESSAGES,
        notStarted: LASH_NOT_STARTED_MESSAGES,
        inProgress: LASH_IN_PROGRESS_MESSAGES,
        allDone: LASH_ALL_DONE_MESSAGES,
      };
    case 'other':
      return {
        dayOff: SALON_DAY_OFF_MESSAGES,
        notStarted: SALON_NOT_STARTED_MESSAGES,
        inProgress: SALON_IN_PROGRESS_MESSAGES,
        allDone: SALON_ALL_DONE_MESSAGES,
      };
    default:
      return {
        dayOff: SALON_DAY_OFF_MESSAGES,
        notStarted: SALON_NOT_STARTED_MESSAGES,
        inProgress: SALON_IN_PROGRESS_MESSAGES,
        allDone: SALON_ALL_DONE_MESSAGES,
      };
  }
}

/** @deprecated use getDashboardVibeMessages(businessType) */
export function getDashboardVibeMessagesLegacy(isBarber: boolean) {
  return getDashboardVibeMessages(isBarber ? 'barber' : 'hair_salon');
}
