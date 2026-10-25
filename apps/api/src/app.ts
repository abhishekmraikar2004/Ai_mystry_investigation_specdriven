import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { accusationSchema, createCaseSchema, type PublicCase } from '@mystery/shared';
import { CaseModel, type CaseRecord } from './model.js';
import { generateMystery, validateMystery } from './generator.js';

const app = express();
const allowedOrigins = [process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'];
if (process.env.NODE_ENV !== 'production') allowedOrigins.push('http://localhost:5173', 'http://localhost:5174');
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use((req, res, next) => { const id = randomUUID(); res.setHeader('X-Request-Id', id); (req as Request & { requestId: string }).requestId = id; next(); });
const createLimiter = rateLimit({ windowMs: Number(process.env.CASE_RATE_LIMIT_WINDOW_MS ?? 3600000), limit: Number(process.env.CASE_RATE_LIMIT_MAX ?? 5), standardHeaders: true, legacyHeaders: false, handler: (_req, res) => fail(res, 429, 'RATE_LIMITED', 'You’ve reached the case creation limit for this hour. Please wait and try again.') });
const hintLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false, handler: (_req, res) => fail(res, 429, 'RATE_LIMITED', 'Please wait before requesting more hints.') });
const requireDatabase: express.RequestHandler = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) return fail(res, 503, 'DATABASE_UNAVAILABLE', 'Case storage is unavailable. Please check the MongoDB connection and try again.');
  next();
};

type AuthedRequest = Request & { mysteryCase: CaseRecord };
const hash = (token: string) => createHmac('sha256', process.env.SESSION_SECRET ?? 'development-only').update(token).digest('hex');
function fail(res: Response, status: number, code: string, message: string) { return res.status(status).json({ error: { code, message, requestId: res.getHeader('X-Request-Id') } }); }
async function authorized(req: Request, res: Response, next: NextFunction) {
  if (mongoose.connection.readyState !== 1) return fail(res, 503, 'DATABASE_UNAVAILABLE', 'Case storage is unavailable. Please try again shortly.');
  try {
    const record = await CaseModel.findOne({ publicId: req.params.caseId }) as unknown as CaseRecord | null;
    if (!record) return fail(res, 404, 'CASE_NOT_FOUND', 'This case could not be found.');
    const token = req.cookies?.[`case_${record.publicId}`];
    if (!token) return fail(res, 401, 'CASE_ACCESS_REQUIRED', 'Open the case using the browser where it was created.');
    const expected = Buffer.from(record.accessTokenHash, 'hex'), actual = Buffer.from(hash(token), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return fail(res, 401, 'CASE_ACCESS_REQUIRED', 'This case access token is invalid.');
    (req as AuthedRequest).mysteryCase = record;
    next();
  } catch { fail(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.'); }
}

app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', version: '1', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.post('/api/v1/cases', createLimiter, requireDatabase, async (req, res, next) => {
  try {
  const parsed = createCaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: parsed.error.issues.map(i => ({ field: String(i.path[0] ?? ''), message: i.message })) } });
  const key = req.header('Idempotency-Key');
  if (!key || key.length > 100) return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'Refresh the page and try again.');
  const keyHash = hash(key);
  const existing = await CaseModel.findOne({ idempotencyKeyHash: keyHash });
  if (existing) return res.status(202).json({ caseId: existing.publicId, status: existing.status, statusUrl: `/api/v1/cases/${existing.publicId}/status` });
  const publicId = randomBytes(18).toString('hex'), token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + Number(process.env.CASE_ACCESS_TOKEN_TTL_DAYS ?? 14) * 86400000);
  const record = await CaseModel.create({ publicId, accessTokenHash: hash(token), idempotencyKeyHash: keyHash, status: 'generating', scenario: parsed.data.scenario, difficulty: parsed.data.difficulty, caseLength: parsed.data.caseLength, progress: { openedEvidenceIds: [], hintsUsed: 0 }, generation: { stage: 'blueprint', progressPercent: 10 }, expiresAt });
  res.cookie(`case_${publicId}`, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: expiresAt, path: `/api/v1/cases/${publicId}` });
  void (async () => {
    try {
      record.generation.stage = 'evidence'; record.generation.progressPercent = 55; await record.save();
      const mystery = await generateMystery(parsed.data.scenario, parsed.data.difficulty, parsed.data.caseLength);
      validateMystery(mystery, parsed.data.caseLength);
      record.mystery = mystery; record.status = 'ready'; record.generation.stage = 'complete'; record.generation.progressPercent = 100; await record.save();
    } catch (error) {
      console.error('Case generation failed:', error instanceof Error ? error.message : 'unknown');
      record.status = 'failed'; record.generation.stage = 'failed'; record.generation.failureCode = error instanceof Error && error.message === 'GENERATION_UNAVAILABLE' ? 'GENERATION_UNAVAILABLE' : 'GENERATION_FAILED'; await record.save();
    }
  })();
  return res.status(202).json({ caseId: publicId, status: 'generating', statusUrl: `/api/v1/cases/${publicId}/status` });
  } catch (error) { next(error); }
});

app.get('/api/v1/cases/:caseId/status', authorized, (req, res) => {
  const c = (req as AuthedRequest).mysteryCase;
  res.json({ caseId: c.publicId, status: c.status, stage: c.generation.stage, progressPercent: c.generation.progressPercent, error: c.status === 'failed' ? { code: c.generation.failureCode, retryAvailable: true } : null });
});
function publicView(c: CaseRecord): PublicCase {
  const m = c.mystery;
  return { title: m.title, premise: m.premise, setting: m.setting, incidentTimestamp: m.incidentTimestamp, difficulty: m.difficulty, caseLength: m.caseLength, suspects: m.suspects, evidence: m.evidence.map(e => ({ ...e, content: undefined })), hintsRemaining: Math.max(0, 3 - c.progress.hintsUsed), openedEvidenceIds: c.progress.openedEvidenceIds, hintsUsed: c.progress.hintsUsed, accusationSubmitted: Boolean(c.accusation?.suspectId) } as unknown as PublicCase;
}
app.get('/api/v1/cases/:caseId', authorized, (req, res) => { const c = (req as AuthedRequest).mysteryCase; if (!['ready', 'completed'].includes(c.status)) return fail(res, 409, 'CASE_NOT_READY', 'This case is not ready yet.'); res.json({ case: publicView(c), result: c.accusation?.suspectId ? resultDto(c) : null }); });
app.get('/api/v1/cases/:caseId/evidence/:evidenceId', authorized, async (req, res) => {
  const c = (req as AuthedRequest).mysteryCase; if (!c.mystery) return fail(res, 409, 'CASE_NOT_READY', 'This case is not ready yet.');
  const evidence = c.mystery.evidence.find(e => e.id === req.params.evidenceId); if (!evidence) return fail(res, 404, 'EVIDENCE_NOT_FOUND', 'Evidence could not be found.');
  if (!c.progress.openedEvidenceIds.includes(evidence.id)) { c.progress.openedEvidenceIds.push(evidence.id); await c.save(); }
  res.json({ evidence });
});
app.post('/api/v1/cases/:caseId/hints', hintLimiter, authorized, async (req, res) => {
  const c = (req as AuthedRequest).mysteryCase; const level = Number(req.body?.hintLevel);
  if (!Number.isInteger(level) || level < 1 || level > 3) return fail(res, 400, 'INVALID_HINT_LEVEL', 'Choose a hint from 1 to 3.');
  if (level > c.progress.hintsUsed + 1) return fail(res, 409, 'HINT_ORDER_REQUIRED', 'Unlock the previous hint first.');
  if (level > c.progress.hintsUsed && c.progress.hintsUsed >= 3) return fail(res, 429, 'HINT_LIMIT_REACHED', 'You have used all three hints.');
  if (level > c.progress.hintsUsed) { c.progress.hintsUsed = level; await c.save(); }
  res.json({ hint: c.mystery.hints[level - 1], remaining: 3 - c.progress.hintsUsed });
});
function resultDto(c: CaseRecord) {
  const s = c.mystery.solution, correct = c.accusation?.correct ?? false;
  const scenario = c.scenario.toLowerCase();
  const item = /sandalwood/.test(scenario) ? 'sealed box of Mysore sandalwood' : /ceremonial brass lamp|brass lamp|\blamp\b/.test(scenario) ? 'ceremonial brass lamp' : /painting/.test(scenario) ? 'rare painting' : /clock/.test(scenario) ? 'rare clock' : /jewell?ery|jewels/.test(scenario) ? 'jewel case' : /manuscript|book/.test(scenario) ? 'rare manuscript' : 'missing object';
  const explanation = s.explanation.includes(item) ? s.explanation : `${s.explanation} Together, the cited clues connect the route through the restoration room to the missing ${item} during the power cut.`;
  return { caseId: c.publicId, submittedSuspectId: c.accusation?.suspectId, culpritSuspectId: s.culpritSuspectId, correct, headline: correct ? 'Case solved' : 'Not quite — review the evidence', explanation, decisiveEvidence: s.decisiveEvidenceIds.map(id => { const e = c.mystery.evidence.find(item => item.id === id)!; return { evidenceId: id, title: e.title, relevance: e.summary }; }) };
}
app.post('/api/v1/cases/:caseId/accusation', authorized, async (req, res) => {
  const c = (req as AuthedRequest).mysteryCase; const parsed = accusationSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'VALIDATION_ERROR', 'Choose a suspect to accuse.');
  if (c.accusation?.suspectId) return fail(res, 409, 'ACCUSATION_ALREADY_SUBMITTED', 'A final accusation has already been recorded.');
  if (!c.mystery.suspects.some(s => s.id === parsed.data.suspectId)) return fail(res, 400, 'INVALID_SUSPECT', 'That suspect is not part of this case.');
  const correct = parsed.data.suspectId === c.mystery.solution.culpritSuspectId;
  const updated = await CaseModel.findOneAndUpdate({ publicId: c.publicId, 'accusation.suspectId': { $exists: false } }, { $set: { accusation: { suspectId: parsed.data.suspectId, correct, submittedAt: new Date() }, status: 'completed' } }, { new: true }) as unknown as CaseRecord | null;
  if (!updated) return fail(res, 409, 'ACCUSATION_ALREADY_SUBMITTED', 'A final accusation has already been recorded.');
  res.json(resultDto(updated));
});
app.use('/api', (_req, res) => fail(res, 404, 'NOT_FOUND', 'That API route could not be found.'));
const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
app.use(express.static(webDist, { index: false, maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0, immutable: process.env.NODE_ENV === 'production' }));
app.get('*', (_req, res, next) => res.sendFile(fileURLToPath(new URL('../../web/dist/index.html', import.meta.url)), error => { if (error) next(); }));
app.use((_req, res) => fail(res, 404, 'NOT_FOUND', 'That page could not be found.'));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { console.error('API error:', error instanceof Error ? error.message : error); fail(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.'); });
export default app;
