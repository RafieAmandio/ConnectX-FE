import 'expo-sqlite/localStorage/install';

import type { DiscoveryCard } from '@features/home/types/discovery.types';
import { isDiscoveryProfileCard } from '@features/home/types/discovery.types';

import type { MatchAnalysisResponse, MatchListItem } from '../types/matches.types';

const GENERATED_MATCHES_STORAGE_KEY = 'connectx.matches.generated.v1';
const MATCH_EXPIRY_DAYS = 7;

type GeneratedMockMatchRecord = {
  analysis: MatchAnalysisResponse;
  item: MatchListItem;
};

function normalizeMatchId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getCardTargetId(card: DiscoveryCard) {
  return isDiscoveryProfileCard(card) ? card.profileId : card.startupId;
}

function calculateExpiresInDays(expiresAt: string) {
  const delta = new Date(expiresAt).getTime() - Date.now();

  return Math.max(0, Math.ceil(delta / (24 * 60 * 60 * 1000)));
}

function loadRecords() {
  try {
    const rawValue = localStorage.getItem(GENERATED_MATCHES_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((record): record is GeneratedMockMatchRecord => {
      return Boolean(
        record &&
        typeof record === 'object' &&
        'item' in record &&
        'analysis' in record &&
        record.item &&
        typeof record.item === 'object' &&
        'matchId' in record.item &&
        typeof record.item.matchId === 'string'
      );
    });
  } catch (error) {
    console.warn('[generated_matches] load failed', error);
    return [];
  }
}

function saveRecords(records: GeneratedMockMatchRecord[]) {
  try {
    localStorage.setItem(GENERATED_MATCHES_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.warn('[generated_matches] save failed', error);
  }
}

function buildGeneratedRecord(card: DiscoveryCard, conversationId: string | null): GeneratedMockMatchRecord {
  const targetId = getCardTargetId(card);
  const matchId = `mock_match_${normalizeMatchId(targetId) || Date.now()}`;
  const matchedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + MATCH_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const score = card.match.score;
  const label = card.match.label ?? 'Strong Match';

  if (isDiscoveryProfileCard(card)) {
    const sharedInterests = card.interests
      .filter((interest) => interest.type !== 'availability')
      .map((interest) => interest.name);
    const commitment =
      card.interests.find((interest) => interest.type === 'availability')?.name ?? 'Not specified';

    return {
      item: {
        matchId,
        status: 'active',
        matchedAt,
        expiresAt,
        expiresInDays: calculateExpiresInDays(expiresAt),
        hasMessaged: false,
        isOnline: true,
        conversationId,
        user: {
          userId: card.profileId,
          name: card.name,
          photoUrl: card.photoUrl,
          headline: card.headline,
          location: card.location.display,
        },
        fitSummary: {
          score,
          label,
          insight: `You matched with ${card.name} on ConnectX.`,
        },
        actions: {
          canChat: true,
          canViewAnalysis: true,
        },
      },
      analysis: {
        success: true,
        message: 'Match analysis fetched successfully',
        data: {
          matchId,
          conversationId,
          status: 'active',
          generatedAt: matchedAt,
          user: {
            userId: card.profileId,
            name: card.name,
            photoUrl: card.photoUrl,
            headline: card.headline,
            location: card.location.display,
          },
          analysis: {
            compatibilityScore: score,
            label,
            subtitle: `You & ${card.name}`,
            skillComplementarity: {
              title: 'Skill Complementarity',
              youBring: ['Strategy', 'Founder vision', 'Execution'],
              theyBring: card.skills.map((skill) => skill.name),
              summary: 'This mock analysis is generated from the discovery card details.',
            },
            startupVisionAlignment: {
              title: 'Startup Vision Alignment',
              sharedInterests,
            },
            commitmentCompatibility: {
              title: 'Commitment Compatibility',
              you: 'Open to connect',
              them: commitment,
            },
            suggestedRoles: {
              title: 'Suggested Roles',
              you: 'Founder',
              them: card.headline,
            },
          },
        },
      },
    };
  }

  const role = card.openRoles[0]?.title ?? card.lookingFor[0] ?? 'Co-Founder';
  const founderTitle = card.founder.title ?? role;

  return {
    item: {
      matchId,
      status: 'active',
      matchedAt,
      expiresAt,
      expiresInDays: calculateExpiresInDays(expiresAt),
      hasMessaged: false,
      isOnline: true,
      conversationId,
      user: {
        userId: card.startupId,
        name: card.founder.name || card.name,
        photoUrl: card.logoUrl,
        headline: founderTitle,
        location: card.industry.display,
      },
      fitSummary: {
        score,
        label,
        insight: `You connected with ${card.name} for ${role}.`,
      },
      actions: {
        canChat: true,
        canViewAnalysis: true,
      },
    },
    analysis: {
      success: true,
      message: 'Match analysis fetched successfully',
      data: {
        matchId,
        conversationId,
        status: 'active',
        generatedAt: matchedAt,
        user: {
          userId: card.startupId,
          name: card.founder.name || card.name,
          photoUrl: card.logoUrl,
          headline: founderTitle,
          location: card.industry.display,
        },
        analysis: {
          compatibilityScore: score,
          label,
          subtitle: `You & ${card.name}`,
          skillComplementarity: {
            title: 'Role Fit',
            youBring: ['Founder energy', 'Execution', 'Startup interest'],
            theyBring: [role, ...card.lookingFor],
            summary: card.summary,
          },
          startupVisionAlignment: {
            title: 'Startup Vision Alignment',
            sharedInterests: [card.industry.primary, card.industry.secondary].filter(
              (value): value is string => Boolean(value)
            ),
          },
          suggestedRoles: {
            title: 'Suggested Roles',
            you: role,
            them: founderTitle,
          },
          suggestedTeamStructure: {
            title: 'Suggested Team Structure',
            roles: card.openRoles.map((openRole) => openRole.title),
          },
        },
      },
    },
  };
}

export function upsertGeneratedMockMatch(card: DiscoveryCard, conversationId: string | null) {
  const nextRecord = buildGeneratedRecord(card, conversationId);
  const records = loadRecords();
  const filteredRecords = records.filter((record) => record.item.matchId !== nextRecord.item.matchId);
  const nextRecords = [nextRecord, ...filteredRecords];

  saveRecords(nextRecords);

  return nextRecord;
}

export function loadGeneratedMockMatches() {
  return loadRecords().map((record) => ({
    ...record.item,
    expiresInDays: calculateExpiresInDays(record.item.expiresAt),
  }));
}

export function loadGeneratedMockMatchAnalysis(matchId: string) {
  return loadRecords().find((record) => record.item.matchId === matchId)?.analysis ?? null;
}
