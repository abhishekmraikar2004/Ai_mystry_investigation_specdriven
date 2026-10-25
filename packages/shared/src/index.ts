import { z } from 'zod';

export const difficultySchema = z.enum(['easy', 'medium', 'hard']);
export const lengthSchema = z.enum(['short', 'standard']);
export const createCaseSchema = z.object({
  scenario: z.string().trim().min(30, 'Scenario must be at least 30 characters.').max(1000, 'Scenario must be at most 1,000 characters.'),
  difficulty: difficultySchema,
  caseLength: lengthSchema,
  fictionalContentAcknowledged: z.literal(true, { errorMap: () => ({ message: 'Please acknowledge that this is fictional.' }) })
});
export const accusationSchema = z.object({ suspectId: z.string().min(1) });
export type Difficulty = z.infer<typeof difficultySchema>;
export type CaseLength = z.infer<typeof lengthSchema>;
export type Suspect = { id: string; name: string; role: string; description: string; apparentMotive: string; alibi: string };
export type Evidence = { id: string; type: 'message' | 'witness_statement' | 'cctv_transcript' | 'document' | 'physical_clue' | 'image'; title: string; summary: string; content: string; sourceLabel: string; inWorldTimestamp?: string; suspectIds: string[]; reliability: 'high' | 'medium' | 'low'; media?: { kind: 'image'; altText: string; fictionalLabel: string } };
export type Mystery = { title: string; premise: string; setting: string; incidentTimestamp: string; difficulty: Difficulty; caseLength: CaseLength; suspects: Suspect[]; evidence: Evidence[]; hints: string[]; solution: { culpritSuspectId: string; motive: string; explanation: string; decisiveEvidenceIds: string[] } };
export type PublicCase = Omit<Mystery, 'solution' | 'hints'> & { hintsRemaining: number; openedEvidenceIds: string[]; hintsUsed: number; accusationSubmitted: boolean };
