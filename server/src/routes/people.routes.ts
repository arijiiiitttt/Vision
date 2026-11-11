import { Router } from "express";
import sharp from "sharp";
import { peopleRepository } from "../repositories/people.repository";
import { personObservationsRepository, personInteractionsRepository } from "../repositories/people-observations.repository";
import { personFacesRepository } from "../repositories/personFaces.repository";
import { mediaFilesRepository } from "../repositories/mediaFiles.repository";
import { memoryRepository } from "../repositories/memory.repository";
import { resolvePersonPhotos } from "../people/PersonPhotos";
import { computeFaceEmbeddingDetailed, NoFaceDetectedError } from "../perception/faceEmbedding";
import { scoreFaceQuality } from "../perception/quality/faceQuality";
import { playRequestsRepository } from "../repositories/playRequests.repository";
import { musicTracksRepository } from "../repositories/musicTracks.repository";
import { storeMedia } from "../camera/mediaStorage";
import { getEmbeddingBackend } from "../perception/embedding";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/authorization";

export const peopleRouter = Router();
// Scoped to this router's own prefix — see audio.routes.ts for why an
// unscoped `.use(requireAuth)` would leak into every other router mounted
// on the same flat /api namespace.
//
// Everything under /people is ADMIN-only: this is per-person biometric
// data (face embeddings) and a photographed history of everyone the robot
// has ever seen. TRUSTED users can talk to the robot and use the
// dashboard's other pages, but individual people profiles are not for
// general household viewing — see docs/vision-pipeline.md "Who can see
// what" section.
peopleRouter.use("/people", requireAuth, requireRole("ADMIN"));

peopleRouter.get("/people", async (_req, res) => res.json(await peopleRepository.list()));
peopleRouter.post("/people", async (req, res) => res.json(await peopleRepository.create(req.body)));

/**
 * Server -> simulator. The people the server knows, as face fingerprints, so the simulator recognises exactly the same people
 * (people you taught it, and people the real robot met). Only fingerprints made by the server's current face model are sent;
 * the simulator uses them only when it runs the same model family (face-api, 128 numbers).
 */
peopleRouter.get("/people/face-data", async (_req, res) => {
  const backend = getEmbeddingBackend().name;
  const rows = await personFacesRepository.listForSharing(backend);
  const byName = new Map<string, { name: string; category: string; faces: number[][] }>();
  for (const r of rows) { const k = r.name.toLowerCase(); (byName.get(k) ?? byName.set(k, { name: r.name, category: r.category, faces: [] }).get(k)!).faces.push(r.embedding); }
  res.json({ backend, people: [...byName.values()] });
});

peopleRouter.patch("/people/:id", async (req, res) => {
  const { name, category } = req.body ?? {};
  const row = await peopleRepository.update(req.params.id, { name, category });
  if (!row) return res.status(404).json({ code: "NOT_FOUND", message: "Person not found" });
  res.json(row);
});

peopleRouter.get("/people/:id", async (req, res) => {
  const p = await peopleRepository.findById(req.params.id);
  if (!p) return res.status(404).json({ code: "NOT_FOUND", message: "Person not found" });
  res.json({ ...p, ...(await resolvePersonPhotos(p.id)) });
});

// Registers a face for identity matching (see perception/faceEmbedding.ts
// and perception/personRecognition.ts EmbeddingPersonRecognizer). Expects a
// base64-encoded frame the person is visible in, and optionally the
// bounding box around them (from a prior /brain/observe or /camera/capture
// result) — without one, the whole frame is used, which works but is
// noisier since it includes background. Most faces get registered
// automatically the first time Vision sees someone new (see
// people/PersonEncounterService.ts) — this endpoint is for manually adding
// an extra reference photo (different lighting/angle) to improve matching.
peopleRouter.post("/people/:id/faces", async (req, res) => {
  const person = await peopleRepository.findById(req.params.id);
  if (!person) return res.status(404).json({ code: "NOT_FOUND", message: "Person not found" });

  const imageBase64 = req.body?.imageBase64;
  if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
    return res.status(400).json({ code: "INVALID_REQUEST", message: "imageBase64 is required" });
  }

  const buffer = Buffer.from(imageBase64, "base64");
  const boundingBox = req.body?.boundingBox;
  try {
    const { embedding, detection, backendName } = await computeFaceEmbeddingDetailed(buffer, boundingBox);
    const metadata = await sharp(buffer, { failOn: "none" }).metadata();
    const quality = await scoreFaceQuality(buffer, metadata.width ?? 0, metadata.height ?? 0, detection);
    if (!quality.isUsable) {
      return res.status(422).json({ code: "LOW_QUALITY_FACE", message: "Face image quality too low to register", reasons: quality.rejectReasons });
    }
    const row = await personFacesRepository.create({ personId: person.id, embedding, backend: backendName, mediaId: req.body?.mediaId ?? null, qualityScore: quality.overallScore });
    res.status(201).json(row);
  } catch (err) {
    if (err instanceof NoFaceDetectedError) {
      return res.status(422).json({ code: "NO_FACE_DETECTED", message: "No face could be found in the supplied image/region" });
    }
    throw err;
  }
});

/**
 * Simulator -> real robot. The simulator's "Send people to dashboard" button posts everyone it was taught (a name plus a few
 * 160 px face photos). We find or create the person by name and enrol each photo through the SAME face pipeline the real robot
 * uses (detect, embed, quality gate), so the dashboard shows them and the ESP32's camera frames are matched against them.
 * Photos are sent, not the simulator's own face fingerprints, because the two use different face models.
 * New people start as GUEST (not trusted) - an admin can change that on the People page. Nothing here touches hardware.
 */
const VISITOR_NAME = /^visitor\s*\d*$/i;
peopleRouter.post("/people/import-from-simulator", async (req, res) => {
  const list = req.body?.people;
  if (!Array.isArray(list)) return res.status(400).json({ code: "INVALID_REQUEST", message: "people must be a list" });
  const out: Array<Record<string, unknown>> = [];
  for (const entry of list.slice(0, 20)) {
    const name = String(entry?.name ?? "").trim().slice(0, 80);
    if (!name || VISITOR_NAME.test(name)) { out.push({ name: name || "(no name)", status: "skipped", reason: "not named yet" }); continue; }
    const matches = await peopleRepository.findAllByName(name);
    if (matches.length > 1) { out.push({ name, status: "skipped", reason: `${matches.length} people already share this name - rename one on the People page first` }); continue; }
    let person = matches[0] ?? null; const created = !person;
    if (!person) person = await peopleRepository.create({ name, category: "GUEST", metadata: { source: "simulator" } });
    let enrolled = 0; const failed: string[] = [];
    for (const raw of (Array.isArray(entry?.photos) ? entry.photos : []).slice(0, 8)) {
      try {
        const b64 = String(raw ?? "").replace(/^data:image\/\w+;base64,/, "");
        if (!b64 || b64.length > 400_000) { failed.push("photo missing or too big"); continue; }
        const buffer = Buffer.from(b64, "base64");
        const { embedding, detection, backendName } = await computeFaceEmbeddingDetailed(buffer);
        const meta = await sharp(buffer, { failOn: "none" }).metadata();
        const quality = await scoreFaceQuality(buffer, meta.width ?? 0, meta.height ?? 0, detection);
        if (!quality.isUsable) { failed.push(`quality too low (${(quality.rejectReasons ?? []).join(", ") || "unknown"})`); continue; }
        const stored = await storeMedia(buffer, `sim-${person.id}-${Date.now()}.jpg`, { mediaType: "IMAGE" }).catch(() => null);
        await personFacesRepository.create({ personId: person.id, embedding, backend: backendName, mediaId: stored?.mediaId ?? null, qualityScore: quality.overallScore });
        enrolled++;
      } catch (err) { failed.push(err instanceof NoFaceDetectedError ? "no face found in the photo" : "could not process the photo"); }
    }
    out.push({ name, status: created ? "created" : "updated", personId: person.id, enrolled, failed });
  }
  res.json({ results: out });
});

peopleRouter.get("/people/:id/faces", async (req, res) => {
  res.json(await personFacesRepository.forPerson(req.params.id));
});

// "What's Ram's favorite song?" — the real track requested most often,
// resolved to its title/BPM for display rather than just an id.
peopleRouter.get("/people/:id/favorite-song", async (req, res) => {
  const favorite = await playRequestsRepository.favoriteTrackForPerson(req.params.id);
  if (!favorite) return res.json({ favoriteTrack: null });
  const track = await musicTracksRepository.findById(favorite.trackId);
  res.json({ favoriteTrack: track, requestCount: favorite.requestCount });
});

// "That's not me" — clears every registered face for this person so the
// next real detection registers a fresh embedding rather than trying to
// identify which single stored embedding was the bad match.
peopleRouter.delete("/people/:id/faces", async (req, res) => {
  const deletedCount = await personFacesRepository.deleteAllForPerson(req.params.id);
  res.json({ deletedCount });
});

// Full history for one person: every time they were seen (whether or not
// they talked), each with a photo, timestamp, and location — the
// "each day's memory: date, time, and location" the dashboard shows per
// person. Interactions (actual conversations) are merged in alongside.
peopleRouter.get("/people/:id/timeline", async (req, res) => {
  const [observations, interactions] = await Promise.all([
    personObservationsRepository.forPerson(req.params.id).catch(() => []),
    personInteractionsRepository.forPerson(req.params.id).catch(() => []),
  ]);

  const mediaIds = [...new Set(observations.map((o) => o.mediaId).filter((id): id is string => !!id))];
  const mediaById = new Map(
    (await Promise.all(mediaIds.map((id) => mediaFilesRepository.findById(id)))).filter((m): m is NonNullable<typeof m> => !!m).map((m) => [m.id, m]),
  );

  const timeline = [
    ...observations.map((o) => ({
      type: "OBSERVATION" as const,
      talkedTo: o.talkedTo,
      createdAt: o.createdAt,
      context: o.context,
      photoUrl: o.mediaId ? mediaById.get(o.mediaId)?.googleDriveUrl ?? null : null,
    })),
    ...interactions.map((i) => ({ type: "INTERACTION" as const, summary: i.summary, createdAt: i.createdAt })),
  ].sort((a, b) => new Date(b.createdAt as unknown as string).getTime() - new Date(a.createdAt as unknown as string).getTime());

  res.json({ observations, interactions, timeline });
});

// ------------------------------------------------------------------
// Per-person memory / provenance — everything Vision has learned or
// inferred about this specific person, with an honest trail of where
// each fact came from (`source`: e.g. a direct statement the person
// made, vs. AI-inferred from observation/conceptual memory) and whether
// it's been human-checked (`verificationStatus`, `requiresReview`).
//
// Read-only from here on purpose: there is deliberately no PATCH/verify/
// reject route. Corrections don't happen by clicking a button in the
// dashboard — Vision asks about them out loud, the same way it already
// asks a stranger's name (see people/Introductions.ts for that
// pattern). See people/PendingMemoryReview.ts, MemoryReviewSelector.ts,
// and MemoryReviewInterpreter.ts for the ask/listen/persist flow, wired
// into brain/BrainOrchestrator.ts (asking) and
// routes/conversation.routes.ts (listening for the answer). This
// endpoint exists purely so the dashboard can show what Vision believes
// and how confident/verified it is — never to change it directly.
// ------------------------------------------------------------------

peopleRouter.get("/people/:id/memories", async (req, res) => {
  res.json(await memoryRepository.dynamic.forPerson(req.params.id));
});
