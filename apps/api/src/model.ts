import mongoose, { Schema } from 'mongoose';
import type { Mystery } from '@mystery/shared';

const CaseSchema = new Schema({
  publicId: { type: String, unique: true, index: true }, accessTokenHash: { type: String, required: true }, idempotencyKeyHash: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ['generating', 'ready', 'failed', 'completed'], default: 'generating' },
  scenario: String, difficulty: String, caseLength: String, mystery: Schema.Types.Mixed,
  progress: { openedEvidenceIds: { type: [String], default: [] }, hintsUsed: { type: Number, default: 0 } },
  accusation: { type: new Schema({ suspectId: String, correct: Boolean, submittedAt: Date }, { _id: false }), default: undefined },
  generation: { stage: String, progressPercent: Number, failureCode: String },
  createdAt: { type: Date, default: Date.now }, expiresAt: Date
}, { minimize: false });
CaseSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });
export const CaseModel = mongoose.models.MysteryCase || mongoose.model('MysteryCase', CaseSchema);
export type CaseRecord = { publicId: string; accessTokenHash: string; status: string; scenario: string; difficulty: string; caseLength: string; mystery: Mystery; progress: { openedEvidenceIds: string[]; hintsUsed: number }; accusation?: { suspectId: string; correct: boolean; submittedAt: Date }; generation: { stage: string; progressPercent: number; failureCode?: string }; save(): Promise<unknown> };
