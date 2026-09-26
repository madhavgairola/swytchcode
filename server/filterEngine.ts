import { SyncFilterConfig } from './types.js';

export interface EvaluatedItem {
  id?: string;
  source?: string;
  from?: string;
  subject?: string;
  snippet?: string;
  body?: string;
  category?: string;
  urgency?: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  relevanceScore?: number;
  [key: string]: any;
}

export interface FilterEvaluationResult {
  passed: boolean;
  rejectReason?: 'domainFiltered' | 'categoryFiltered' | 'keywordFiltered' | 'duplicate' | 'urgencyFiltered';
  explanation: string;
  matchedRules: {
    matchedDomain?: string;
    matchedSender?: string;
    matchedCategory?: string;
    matchedKeywords: string[];
  };
}

/**
 * Normalizes email address or domain string for comparison
 */
export function normalizeDomain(domain: string): string {
  let clean = domain.trim().toLowerCase();
  if (clean.startsWith('@')) {
    clean = clean.substring(1);
  }
  return clean;
}

/**
 * Extracts sender email address from standard headers like "Name <email@example.com>"
 */
export function extractEmailAddress(rawSender: string): string {
  if (!rawSender) return '';
  const match = rawSender.match(/<([^>]+)>/);
  if (match) {
    return match[1].trim().toLowerCase();
  }
  return rawSender.trim().toLowerCase();
}

/**
 * Maps human-readable category strings to SyncCategoryFilters keys
 */
export function mapCategoryToKey(categoryName?: string): string | null {
  if (!categoryName) return 'directCommunication';
  const norm = categoryName.toLowerCase().trim();
  
  if (norm.includes('social') || norm.includes('network') || norm.includes('linkedin')) {
    return 'socialNetworking';
  }
  if (norm.includes('event') || norm.includes('conference') || norm.includes('pass') || norm.includes('ticket') || norm.includes('hackathon')) {
    return 'eventConferencePass';
  }
  if (norm.includes('campus') || norm.includes('circular') || norm.includes('university') || norm.includes('opportunity') || norm.includes('placement')) {
    return 'campusOpportunity';
  }
  if (norm.includes('newsletter') || norm.includes('digest') || norm.includes('medium') || norm.includes('deviantart') || norm.includes('digest')) {
    return 'newsletterDigest';
  }
  if (norm.includes('security') || norm.includes('2fa') || norm.includes('alert') || norm.includes('auth') || norm.includes('password')) {
    return 'securityAlert';
  }
  if (norm.includes('direct') || norm.includes('communication') || norm.includes('message') || norm.includes('inquiry')) {
    return 'directCommunication';
  }

  return 'directCommunication';
}

/**
 * Evaluates an incoming item against all configured filter rules
 */
export function evaluateItemAgainstFilters(
  item: EvaluatedItem,
  config: SyncFilterConfig,
  expandedKeywords: string[] = []
): FilterEvaluationResult {
  const matchedRules: FilterEvaluationResult['matchedRules'] = {
    matchedKeywords: []
  };

  const senderEmail = extractEmailAddress(item.from || item.author || '');
  const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1] : '';

  // 1. Check Blocklist
  if (config.blockedDomains && config.blockedDomains.length > 0) {
    const isBlocked = config.blockedDomains.some(d => {
      const normD = normalizeDomain(d);
      return senderDomain === normD || senderDomain.endsWith(`.${normD}`);
    });
    if (isBlocked) {
      return {
        passed: false,
        rejectReason: 'domainFiltered',
        explanation: `Sender domain ${senderDomain} is in the blocked domains list.`,
        matchedRules
      };
    }
  }

  // 2. Check Allowed Domains / Senders (if specified)
  const hasDomainFilters = (config.allowedDomains && config.allowedDomains.length > 0) ||
                           (config.allowedSenders && config.allowedSenders.length > 0);

  if (hasDomainFilters) {
    let domainMatched = false;

    if (config.allowedSenders && config.allowedSenders.length > 0) {
      const matchSender = config.allowedSenders.some(s => extractEmailAddress(s) === senderEmail);
      if (matchSender) {
        domainMatched = true;
        matchedRules.matchedSender = senderEmail;
      }
    }

    if (!domainMatched && config.allowedDomains && config.allowedDomains.length > 0) {
      const matchDomain = config.allowedDomains.some(d => {
        const normD = normalizeDomain(d);
        return senderDomain === normD || senderDomain.endsWith(`.${normD}`);
      });
      if (matchDomain) {
        domainMatched = true;
        matchedRules.matchedDomain = senderDomain;
      }
    }

    if (!domainMatched) {
      return {
        passed: false,
        rejectReason: 'domainFiltered',
        explanation: `Sender "${item.from || 'unknown'}" (${senderDomain}) does not match allowed domains or senders.`,
        matchedRules
      };
    }
  }

  // 3. Category Filter
  const categoryKey = mapCategoryToKey(item.category);
  if (categoryKey && config.categoryFilters) {
    const isCategoryAllowed = (config.categoryFilters as any)[categoryKey];
    if (isCategoryAllowed === false) {
      return {
        passed: false,
        rejectReason: 'categoryFiltered',
        explanation: `Category "${item.category || categoryKey}" is disabled in filter configuration.`,
        matchedRules
      };
    }
    matchedRules.matchedCategory = item.category || categoryKey;
  }

  // 4. Keyword & Semantic Terms Filter
  const allKeywords = [
    ...(config.keywords || []),
    ...(config.semanticExpansion ? expandedKeywords : [])
  ].map(k => k.trim().toLowerCase()).filter(Boolean);

  if (allKeywords.length > 0) {
    const contentToSearch = [
      item.subject || '',
      item.snippet || '',
      item.body || '',
      item.from || '',
      item.name || '',
      item.title || ''
    ].join(' ').toLowerCase();

    const matched = allKeywords.filter(kw => {
      if (kw.length <= 2) {
        // Exact word boundary for short abbreviations
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(contentToSearch);
      }
      return contentToSearch.includes(kw);
    });

    if (matched.length === 0) {
      return {
        passed: false,
        rejectReason: 'keywordFiltered',
        explanation: `Content does not contain any of the required keywords or related terms.`,
        matchedRules
      };
    }

    matchedRules.matchedKeywords = Array.from(new Set(matched));
  }

  // 5. Urgency Filter
  if (config.minUrgencyLevel && config.minUrgencyLevel !== 'ALL') {
    const urgencyHierarchy: Record<string, number> = {
      'INFO': 1,
      'LOW': 2,
      'MEDIUM': 3,
      'HIGH': 4,
      'CRITICAL': 5
    };
    const minScore = urgencyHierarchy[config.minUrgencyLevel] || 1;
    const itemScore = urgencyHierarchy[item.urgency || 'INFO'] || 1;

    if (itemScore < minScore) {
      return {
        passed: false,
        rejectReason: 'urgencyFiltered',
        explanation: `Urgency ${item.urgency || 'INFO'} is below the minimum threshold (${config.minUrgencyLevel}).`,
        matchedRules
      };
    }
  }

  return {
    passed: true,
    explanation: 'Passed all domain, category, keyword, and urgency filters.',
    matchedRules
  };
}
