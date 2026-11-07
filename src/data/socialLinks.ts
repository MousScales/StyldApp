export type SocialPlatformId =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'x'
  | 'youtube'
  | 'pinterest'
  | 'linkedin'
  | 'threads'
  | 'snapchat'
  | 'yelp'
  | 'google'
  | 'whatsapp';

export type SocialInputKind = 'handle' | 'url' | 'phone';

export type SiteSocialLinks = Record<SocialPlatformId, string>;

export type SocialPlatformConfig = {
  id: SocialPlatformId;
  label: string;
  icon: string;
  placeholder: string;
  inputKind: SocialInputKind;
  prefix?: string;
};

export const SOCIAL_PLATFORMS: SocialPlatformConfig[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: 'logo-instagram',
    placeholder: 'yourhandle',
    inputKind: 'handle',
    prefix: '@',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: 'logo-tiktok',
    placeholder: 'yourhandle',
    inputKind: 'handle',
    prefix: '@',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: 'logo-facebook',
    placeholder: 'Page name or facebook.com/yourpage',
    inputKind: 'url',
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    icon: 'logo-twitter',
    placeholder: 'yourhandle',
    inputKind: 'handle',
    prefix: '@',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: 'logo-youtube',
    placeholder: '@channel or youtube.com/...',
    inputKind: 'url',
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    icon: 'logo-pinterest',
    placeholder: 'yourhandle',
    inputKind: 'handle',
    prefix: '@',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: 'logo-linkedin',
    placeholder: 'Profile URL or username',
    inputKind: 'url',
  },
  {
    id: 'threads',
    label: 'Threads',
    icon: 'at-circle-outline',
    placeholder: 'yourhandle',
    inputKind: 'handle',
    prefix: '@',
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    icon: 'logo-snapchat',
    placeholder: 'yourhandle',
    inputKind: 'handle',
    prefix: '@',
  },
  {
    id: 'yelp',
    label: 'Yelp',
    icon: 'star-outline',
    placeholder: 'yelp.com/biz/...',
    inputKind: 'url',
  },
  {
    id: 'google',
    label: 'Google Business',
    icon: 'logo-google',
    placeholder: 'maps.google.com/... or g.page/...',
    inputKind: 'url',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'logo-whatsapp',
    placeholder: '15551234567',
    inputKind: 'phone',
    prefix: '+',
  },
];

export const DEFAULT_SOCIAL_LINKS: SiteSocialLinks = {
  instagram: '',
  tiktok: '',
  facebook: '',
  x: '',
  youtube: '',
  pinterest: '',
  linkedin: '',
  threads: '',
  snapchat: '',
  yelp: '',
  google: '',
  whatsapp: '',
};

const PLATFORM_IDS = SOCIAL_PLATFORMS.map((platform) => platform.id);

function stripHandle(value: string): string {
  return value.replace(/^@+/, '').trim();
}

function stripPhone(value: string): string {
  return value.replace(/[^\d+]/g, '').trim();
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^www\./i.test(value);
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (looksLikeUrl(trimmed)) {
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  return trimmed;
}

export function normalizeSocialInput(platform: SocialPlatformConfig, raw: string): string {
  const value = raw.trim();
  if (!value) return '';

  if (platform.inputKind === 'handle') {
    return stripHandle(value);
  }
  if (platform.inputKind === 'phone') {
    return stripPhone(value);
  }
  return normalizeUrl(value);
}

export function normalizeSocialLinks(
  raw: unknown,
  legacyInstagram?: string,
): SiteSocialLinks {
  const source =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const links = { ...DEFAULT_SOCIAL_LINKS };

  for (const platform of SOCIAL_PLATFORMS) {
    const value = source[platform.id];
    if (typeof value === 'string') {
      links[platform.id] = normalizeSocialInput(platform, value);
    }
  }

  if (!links.instagram && legacyInstagram?.trim()) {
    links.instagram = stripHandle(legacyInstagram);
  }

  return links;
}

export function hasAnySocialLink(links: SiteSocialLinks): boolean {
  return PLATFORM_IDS.some((id) => links[id].trim().length > 0);
}

export function listActiveSocialLinks(
  links: SiteSocialLinks,
): { platform: SocialPlatformConfig; value: string }[] {
  return SOCIAL_PLATFORMS.map((platform) => ({
    platform,
    value: links[platform.id].trim(),
  })).filter((row) => row.value.length > 0);
}

export function socialLinksPreviewText(links: SiteSocialLinks): string {
  const active = listActiveSocialLinks(links);
  if (active.length === 0) return 'Not set';
  if (active.length === 1) {
    const row = active[0];
    return formatSocialDisplay(row.platform, row.value);
  }
  return `${active.length} profiles`;
}

function platformById(id: SocialPlatformId): SocialPlatformConfig {
  return SOCIAL_PLATFORMS.find((platform) => platform.id === id) ?? SOCIAL_PLATFORMS[0];
}

export function buildSocialUrl(platformId: SocialPlatformId, rawValue: string): string | null {
  const platform = platformById(platformId);
  const value = normalizeSocialInput(platform, rawValue);
  if (!value) return null;

  switch (platformId) {
    case 'instagram':
      return `https://www.instagram.com/${encodeURIComponent(value)}/`;
    case 'tiktok':
      return `https://www.tiktok.com/@${encodeURIComponent(value)}`;
    case 'facebook':
      return looksLikeUrl(value) || value.includes('facebook.com')
        ? normalizeUrl(value)
        : `https://www.facebook.com/${encodeURIComponent(value)}`;
    case 'x':
      return `https://x.com/${encodeURIComponent(value)}`;
    case 'youtube':
      return looksLikeUrl(value) || value.includes('youtube.com') || value.includes('youtu.be')
        ? normalizeUrl(value)
        : `https://www.youtube.com/${value.startsWith('@') ? value : `@${value}`}`;
    case 'pinterest':
      return `https://www.pinterest.com/${encodeURIComponent(value)}/`;
    case 'linkedin':
      return looksLikeUrl(value) || value.includes('linkedin.com')
        ? normalizeUrl(value)
        : `https://www.linkedin.com/in/${encodeURIComponent(value)}`;
    case 'threads':
      return `https://www.threads.net/@${encodeURIComponent(value)}`;
    case 'snapchat':
      return `https://www.snapchat.com/add/${encodeURIComponent(value)}`;
    case 'yelp':
    case 'google':
      return normalizeUrl(value);
    case 'whatsapp': {
      const digits = value.replace(/\D/g, '');
      return digits ? `https://wa.me/${digits}` : null;
    }
    default:
      return null;
  }
}

export function formatSocialDisplay(platform: SocialPlatformConfig, rawValue: string): string {
  const value = normalizeSocialInput(platform, rawValue);
  if (!value) return '';

  if (platform.inputKind === 'handle' && platform.prefix) {
    return `${platform.label} · ${platform.prefix}${value}`;
  }
  if (platform.inputKind === 'phone') {
    return `${platform.label} · ${value}`;
  }
  if (platform.inputKind === 'url') {
    const short = value.replace(/^https?:\/\/(www\.)?/i, '');
    return `${platform.label} · ${short.length > 36 ? `${short.slice(0, 36)}…` : short}`;
  }
  return `${platform.label} · ${value}`;
}

export function buildSocialLinksHtml(
  links: SiteSocialLinks,
  escapeHtml: (value: string) => string,
): string {
  const rows = listActiveSocialLinks(links)
    .map(({ platform, value }) => {
      const url = buildSocialUrl(platform.id, value);
      if (!url) return '';
      const label = formatSocialDisplay(platform, value);
      return `<p class="profile-social-link"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></p>`;
    })
    .filter(Boolean)
    .join('');

  if (!rows) return '';
  return `<div class="profile-location-col"><h3>Social</h3>${rows}</div>`;
}

export function patchSocialLinks(
  links: SiteSocialLinks,
  platformId: SocialPlatformId,
  rawValue: string,
): { socialLinks: SiteSocialLinks; instagramHandle: string } {
  const platform = platformById(platformId);
  const socialLinks = {
    ...links,
    [platformId]: normalizeSocialInput(platform, rawValue),
  };
  return {
    socialLinks,
    instagramHandle: socialLinks.instagram,
  };
}
