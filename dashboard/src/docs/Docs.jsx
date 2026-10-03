import { useState } from "react";

const NAV = [
  { id: "overview", label: "Overview", group: "Introduction" },
  { id: "how-it-works", label: "How It Works", group: "Introduction" },
  { id: "capabilities", label: "Capabilities", group: "Reference" },
  { id: "tech-stack", label: "Tech Stack", group: "Reference" },
  { id: "api", label: "API Endpoints", group: "Reference" },
  { id: "database", label: "Database", group: "Reference" },
  { id: "setup", label: "Local Setup", group: "Reference" },
];

const H1 = ({ children }) => (
  <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#0f0f0f] mb-3 leading-tight">
    {children}
  </h1>
);

const H2 = ({ children }) => (
  <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0f0f0f] mt-10 mb-3">
    {children}
  </h2>
);

const H3 = ({ children }) => (
  <h3 className="text-[13px] font-semibold text-[#0f0f0f] mt-6 mb-2">
    {children}
  </h3>
);

const P = ({ children }) => (
  <p className="text-[15px] leading-[1.75] text-[#444] mb-4">{children}</p>
);

const Block = ({ children }) => (
  <pre className="bg-[#f8f8f8] text-black font-sans text-[13px] leading-[1.7] rounded-lg px-5 py-4 overflow-x-auto my-4 whitespace-pre-wrap">
    {children}
  </pre>
);

const Divider = () => <hr className="border-[#ebebeb] my-8" />;

// Small labeled route line used across the API page
const Route = ({ method, path, note }) => (
  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5 border-b border-[#f0f0f0] last:border-0">
    <span className="text-[11px] font-mono font-semibold text-[#0f0f0f] w-14 shrink-0">
      {method}
    </span>
    <span className="text-[13px] font-mono text-[#333]">{path}</span>
    {note ? <span className="text-[12px] text-[#999]">— {note}</span> : null}
  </div>
);

const RouteGroup = ({ title, children }) => (
  <div className="mb-7">
    <p className="text-[13px] font-semibold text-[#0f0f0f] mb-1">{title}</p>
    <div>{children}</div>
  </div>
);

// One row in the Capabilities reference page: what it does, where it lives, what it exports
const Cap = ({ label, files, exports: exp }) => (
  <div className="py-3 border-b border-[#f0f0f0] last:border-0">
    <p className="text-[13.5px] text-[#333] leading-relaxed mb-1.5">
      {label}
    </p>
    <div className="flex flex-wrap gap-1.5 mb-1">
      {files.split(", ").map((f) => (
        <span
          key={f}
          className="text-[11.5px] font-mono text-[#0f0f0f] bg-[#f8f8f8] rounded px-1.5 py-0.5"
        >
          {f}
        </span>
      ))}
    </div>
    {exp ? (
      <p className="text-[11.5px] font-mono text-[#999] leading-relaxed">
        {exp}
      </p>
    ) : null}
  </div>
);

const CapGroup = ({ title, note, rows }) => (
  <div className="mb-10">
    <H2>{title}</H2>
    {note ? <P>{note}</P> : null}
    <div>
      {rows.map((r) => (
        <Cap key={r.label} label={r.label} files={r.files} exports={r.exports} />
      ))}
    </div>
  </div>
);

const OverviewPage = () => (
  <div>
    <H1>Vision</H1>
    <p className="text-[15px] text-[#888] mb-8 leading-relaxed">
      An autonomous quadruped companion robot that sees, remembers, talks,
      and decides for itself.
    </p>
    <P>
      Vision is a small camera-equipped robot built on an ESP32-S3, paired
      with a TypeScript server that gives it perception, memory, and
      judgment. It recognizes faces, tracks people and objects, holds real
      conversations, plays music it can actually find and fetch, learns
      who it meets over time, and moves on its own when nobody is
      directing it — all visible and controllable from a live React
      dashboard.
    </P>
    <P>
      It isn't a scripted demo. Object and face detection run on real
      models, memory persists across sessions in Postgres, music comes
      from a real licensed catalog search, and its exploration goals are
      proposed by an LLM reasoning about what it has actually seen — with
      a fixed, deterministic safety layer underneath that never depends on
      any of that reasoning going right.
    </P>

    <Divider />
    <H2>Three layers, one robot</H2>
    <P>Every capability sits in one of three places:</P>
    <div className="grid grid-cols-1 gap-3 my-4">
      {[
        {
          name: "ESP32-CAM Firmware",
          desc: "C++ on an ESP32-S3: camera capture, servo/gait control via PCA9685, ultrasonic safety cutoffs, I2S mic/speaker, command-protocol parsing, and local safety interlocks that hold even if the network drops.",
        },
        {
          name: "Render Server",
          desc: "TypeScript: the perception pipeline, four-layer memory, the brain's decision loop, person recognition and social behavior, audio/music, the Vision Script compiler, and every REST/WebSocket route — backed by Postgres on Neon.",
        },
        {
          name: "React Dashboard",
          desc: "Live camera feed, tracking visualization, manual servo/gait control, dark/light theming, and full inspection of memory, decisions, and reactions — updated over Socket.IO in real time.",
        },
      ].map((p) => (
        <div key={p.name} className="border border-[#ebebeb] rounded-lg px-4 py-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[14px] font-semibold text-[#0f0f0f]">
              {p.name}
            </span>
          </div>
          <p className="text-[14px] text-[#666] leading-relaxed">{p.desc}</p>
        </div>
      ))}
    </div>

    <Divider />
    <H2>What it actually does</H2>
    <P>Beyond the perception → decision → action loop, Vision covers a lot of ground:</P>
    <div className="grid grid-cols-1 gap-3 my-4">
      {[
        {
          name: "People & social behavior",
          desc: "Registers and recalls people by face, asks for a name when it doesn't know someone, disambiguates when a name matches multiple people, throttles re-greeting, and notices when someone is leaving.",
        },
        {
          name: "Audio & music",
          desc: "Real text-to-speech and speech-to-text (multiple providers, with mocks for offline dev), turn-taking so it doesn't talk over people, and a genuine 'play a song' flow backed by a licensed catalog search — not just files someone uploaded.",
        },
        {
          name: "Vision Script",
          desc: "A small purpose-built scripting language — lexer, parser, semantic analysis, and IR generation — for authoring gait/servo/wait routines, with compile-time safety bounds on loop count, nesting, and program size.",
        },
        {
          name: "Safety & control",
          desc: "Every hardware command passes through validation and a safety manager regardless of what decided to send it, with an ultrasonic distance check, an always-available emergency stop, and AUTONOMOUS/MANUAL mode gating.",
        },
      ].map((p) => (
        <div key={p.name} className="border border-[#ebebeb] rounded-lg px-4 py-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[14px] font-semibold text-[#0f0f0f]">
              {p.name}
            </span>
          </div>
          <p className="text-[14px] text-[#666] leading-relaxed">{p.desc}</p>
        </div>
      ))}
    </div>

    <Divider />
    <H2>Honest gaps</H2>
    <P>
      Vision doesn't do SLAM or pathfinding — "find person" is patrol and
      dead reckoning, not navigation. Music only ever plays a track from
      its licensed catalog search, not YouTube or Spotify. AI-vision
      detection and paid speech providers need your own API keys; the
      integration code is real, the credential is yours to supply. See the
      Capabilities page for the maturity of each piece.
    </P>
  </div>
);

const HowItWorksPage = () => (
  <div>
    <H1>How It Works</H1>
    <p className="text-[15px] text-[#888] mb-8">
      One cycle, several stages — from a raw camera frame to a decision, a
      conversation, and a movement.
    </p>
    {[
      {
        step: "01",
        title: "It sees",
        body: "Frames come in from the ESP32-CAM and pass a quality gate before anything else runs — blur, darkness, blown-out exposure, and blank frames get discarded. What survives goes through real object and face detection, motion detection, and person recognition against stored face embeddings.",
        code: `camera/CameraService.ts → camera/imageProcessor.ts\nperception/objectDetectionModel.ts (CenterNet, COCO-80)\nperception/faceDetection.ts → perception/faceEmbedding.ts`,
      },
      {
        step: "02",
        title: "It thinks",
        body: "Every cycle, BrainOrchestrator turns that perception into a structured observation and hands it to DecisionMaker — a fast, deterministic, rule-based path that stays safety-critical on purpose. Separately, a slower deliberative loop only runs when the robot is genuinely alone and idle, proposing real exploration goals through an LLM.",
        code: `brain/BrainOrchestrator.ts → decisions/DecisionMaker.ts\ndecisions/GoalProposer.ts   (idle-only, LLM-proposed goals)\ncuriosity/ExplorationController.ts`,
      },
      {
        step: "03",
        title: "It remembers",
        body: "Lookups fall through four layers in order: hardcoded safety and identity rules, learned facts from past encounters, similarity-based recall over stored features, and an AI fallback only if nothing else matches. Face matches use pgvector nearest-neighbor search with multi-frame voting before an identity is confirmed.",
        code: `memory/MemoryManager.ts\n  → memory/static/StaticMemory.ts\n  → memory/dynamic/DynamicMemory.ts\n  → memory/conceptual/ConceptualMemory.ts\n  → ai/aiFallback.ts`,
      },
      {
        step: "04",
        title: "It knows who it's talking to",
        body: "A recognized face becomes a person record it can greet, ask the name of, or disambiguate if the name matches more than one person on file. It throttles re-greeting the same person every cycle and notices when someone is saying goodbye.",
        code: `people/PersonEncounterService.ts\npeople/Introductions.ts + people/PendingDisambiguation.ts\npeople/GreetingThrottle.ts + people/FarewellTracker.ts`,
      },
      {
        step: "05",
        title: "It talks and plays music",
        body: "Speech goes through intent parsing and a turn-taking arbiter so it doesn't interrupt. A 'play a song' request kicks off a real catalog search alongside a genuine getting-to-know-you conversation about the person's taste, running concurrently — with honest handling when a track isn't found.",
        code: `audio/IntentEngine.ts + audio/ConversationArbiter.ts\nmusic/PlaySongService.ts → music/JamendoMusicService.ts\nmusic/SongQuestionProposer.ts`,
      },
      {
        step: "06",
        title: "It acts — safely",
        body: "A matched reaction runs through GestureExecutor, or a gait sequence moves the legs — but every movement command still passes through the command registry's validation, SafetyManager, and the ultrasonic distance check first, regardless of what decided to move. AUTONOMOUS and MANUAL modes gate who's allowed to ask, and emergency stop is always reachable.",
        code: `commands/CommandRegistry.ts → commands/CommandValidator.ts\nsafety/SafetyManager.ts + ultrasonic/UltrasonicSafety.ts\ncontrol/ControlMode.ts + safety/EmergencyStop.ts`,
      },
      {
        step: "07",
        title: "Optional: it can be scripted",
        body: "Vision Script is a small language for authoring gait/servo/wait routines directly — tokenized, parsed, semantically checked, then compiled to an IR that unrolls loops and substitutes variables before it ever reaches the command registry. A kill switch can disable the whole feature.",
        code: `compiler/Compiler.ts (lexer → parser → semantic → IR)\nscripts/ScriptExecutor.ts\ncontrol/CompilerSettings.ts`,
      },
    ].map(({ step, title, body, code }) => (
      <div key={step} className="mb-10">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-[12px] font-mono text-[#bbb]">{step}</span>
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0f0f0f]">
            {title}
          </h2>
        </div>
        <P>{body}</P>
        <Block>{code}</Block>
      </div>
    ))}
  </div>
);

const CapabilitiesPage = () => (
  <div>
    <H1>Capabilities</H1>
    <p className="text-[15px] text-[#888] mb-8">
      The full capability-to-file map. Paths are relative to{" "}
      <code className="font-mono text-[13px]">server/src/</code> unless
      marked <code className="font-mono text-[13px]">firmware/</code> or{" "}
      <code className="font-mono text-[13px]">dashboard/</code>. Every file
      listed actually exists in the codebase.
    </p>

    <CapGroup
      title="1. Perception — seeing and recognizing"
      rows={[
        { label: "Frame capture from ESP32-CAM", files: "camera/CameraService.ts", exports: "CameraService, cameraService" },
        { label: "Whole-frame quality gate (blur/dark/blown-out/blank)", files: "camera/imageProcessor.ts", exports: "DEFAULT_FRAME_QUALITY_THRESHOLDS, FrameQuality, ProcessedImage" },
        { label: "Decide whether to store a frame + log the decision", files: "camera/mediaCapture.ts", exports: "decideAndStoreMedia, MediaCaptureOutcome" },
        { label: "Upload media to Google Drive + DB row", files: "camera/mediaStorage.ts", exports: "storeMedia, storeAudioMedia, StoredMedia" },
        { label: "Pipeline stats (frames kept/discarded)", files: "camera/visionStats.ts", exports: "visionStats, VisionPipelineStats" },
        { label: "Motion detection (frame-diff)", files: "perception/motionDetection.ts", exports: "MotionDetector, getMotionDetectorFor, resetMotionDetectorFor" },
        { label: "Real object/person detection (CenterNet, COCO-80)", files: "perception/objectDetectionModel.ts", exports: "detectObjects, RawObjectDetection" },
        { label: "Person detection (real ML + heuristic fallback + mock)", files: "perception/personDetection.ts", exports: "LocalMLPersonDetector, HeuristicPersonDetector, MockPersonDetector, PersonDetection" },
        { label: "Generic object detection (real ML + heuristic fallback)", files: "perception/objectDetection.ts", exports: "LocalMLObjectDetector, HeuristicObjectDetector, MockObjectDetector, ObjectDetection" },
        { label: "AI-vision detection (upgrades to a real vision-LLM when configured)", files: "perception/aiVisionDetector.ts", exports: "AIVisionPersonDetector, AIVisionObjectDetector" },
        { label: "Which detector is active this run", files: "brain/perception.ts", exports: "personDetector, objectDetector, personRecognizer" },
        { label: "Face detection + 68 landmarks (real CNN)", files: "perception/faceDetection.ts", exports: "detectFace, FaceDetectionResult, Point2D" },
        { label: "Face-quality scoring (size/pose/occlusion/sharpness)", files: "perception/quality/faceQuality.ts", exports: "scoreFaceQuality, FaceQualityScore" },
        { label: "Temporal dedup (perceptual hash)", files: "perception/quality/temporalDeduplication.ts", exports: "TemporalDeduplicator, temporalDeduplicator, computePerceptualHash" },
        { label: "Orchestrates dedup → detect → quality before any embedding runs", files: "perception/qualityGate.ts", exports: "evaluateFrameForRecognition, QualityGateResult" },
        { label: "Face alignment (similarity-transform warp)", files: "perception/embedding/alignment.ts", exports: "alignFace, arcfaceTemplate" },
        { label: "Embedding backend interface", files: "perception/embedding/types.ts", exports: "FaceEmbeddingBackend" },
        { label: "Default face embedding model (dlib CNN, 128-d)", files: "perception/embedding/faceApiBackend.ts", exports: "FaceApiEmbeddingBackend" },
        { label: "Real ONNX Runtime embedding backend (512-d, needs a supplied model)", files: "perception/embedding/onnxBackend.ts", exports: "OnnxEmbeddingBackend" },
        { label: "Picks the configured backend", files: "perception/embedding/index.ts", exports: "getEmbeddingBackend, __setEmbeddingBackendForTests" },
        { label: "Full detect → align → embed orchestration", files: "perception/faceEmbedding.ts", exports: "computeFaceEmbedding, computeFaceEmbeddingDetailed, embedDetectedFace, faceDistance, similarityFromDistance, NoFaceDetectedError" },
        { label: "pgvector nearest-neighbor face match + multi-frame voting", files: "perception/personRecognition.ts", exports: "EmbeddingPersonRecognizer, MockPersonRecognizer, RECOGNITION_MATCH_THRESHOLD_DISTANCE" },
        { label: "Requires N agreeing frames before confirming identity", files: "perception/multiFrameIdentity.ts", exports: "MultiFrameIdentityTracker, multiFrameIdentityTracker" },
        { label: "Feature extraction for conceptual-memory matching", files: "perception/featureExtraction.ts", exports: "extractFeatures, VisualFeatures" },
        { label: "Servo-driven eye/head tracking math", files: "perception/tracking.ts", exports: "computeTrackingStep, nextTrackingState, DEFAULT_TRACKING_CONFIG" },
        { label: "Shared per-frame detection context", files: "perception/perceptionContext.ts", exports: "DetectionContext" },
        { label: "Config for the whole face pipeline", files: "config/faceRecognitionConfig.ts", exports: "faceRecognitionConfig" },
      ]}
    />

    <CapGroup
      title="2. Brain — the per-cycle decision loop"
      rows={[
        { label: "Top-level per-cycle orchestration", files: "brain/BrainOrchestrator.ts", exports: "BrainOrchestrator, brainOrchestrator" },
        { label: "Turns raw perception into a structured observation", files: "brain/observationProcessor.ts", exports: "ObservationResult" },
        { label: "Shared brain-cycle types", files: "brain/brainTypes.ts", exports: "PerceptionSummary, MediaOutcome, BrainCycleResult" },
        { label: "Rule-based decision-making per cycle (fast, deterministic, safety-critical)", files: "decisions/DecisionMaker.ts", exports: "DecisionMaker, decisionMaker" },
        { label: "Decision policy rules", files: "decisions/policies.ts", exports: "applyPolicies" },
        { label: "Decision data shapes", files: "decisions/decisionTypes.ts", exports: "DecisionInput, Decision" },
        { label: "Real, grounded, LLM-proposed exploration goals (slow loop, only when alone)", files: "decisions/GoalProposer.ts", exports: "proposeGoal, EXPLORATION_GOALS, ProposedGoal" },
        { label: "Turns \"genuinely alone + idle\" into actual movement", files: "curiosity/ExplorationController.ts", exports: "tick, ExplorationTickResult" },
        { label: "Mental-state modeling (mood-ish, rule-based)", files: "mental/MentalIntelligence.ts", exports: "MentalIntelligence, mentalIntelligence" },
        { label: "Curiosity scoring logic", files: "mental/curiosity.ts", exports: "updateCuriosity, decideCuriosityAction" },
        { label: "Trust/behavior judgement per person category", files: "mental/judgement.ts", exports: "judgePersonInteraction, BEHAVIOR_PROFILE" },
        { label: "Default/clone mental state", files: "mental/state.ts", exports: "DEFAULT_MENTAL_STATE, cloneState" },
        { label: "Curiosity engine (drives exploration)", files: "curiosity/CuriosityEngine.ts", exports: "curiosityEngine" },
        { label: "When idle time should trigger exploring", files: "curiosity/ExplorationTrigger.ts", exports: "shouldEnterExploration, IDLE_EXPLORATION_THRESHOLD_MS" },
        { label: "Emotion → gesture mapping", files: "emotion/EmotionEngine.ts", exports: "evaluateEmotion, emotionToGestureHint, emotionEngine" },
        { label: "Reaction rule matching", files: "reactions/behaviorRules.ts", exports: "reactionFor" },
        { label: "Runs the matched reaction (gestures etc)", files: "reactions/ReactionEngine.ts, reactions/GestureExecutor.ts", exports: "ReactionEngine, reactionEngine" },
      ]}
    />

    <CapGroup
      title="3. Memory"
      rows={[
        { label: "Top-level lookup across all memory layers", files: "memory/MemoryManager.ts", exports: "MemoryManager, memoryManager, MemoryLookupResult" },
        { label: "Hardcoded safety/behavior rules (layer 1)", files: "memory/static/staticRules.ts, memory/static/StaticMemory.ts", exports: "STATIC_SAFETY_RULES, StaticMemory" },
        { label: "Learned facts (layer 2)", files: "memory/dynamic/DynamicMemory.ts, memory/dynamic/learning.ts", exports: "DynamicMemory, createDynamicMemory" },
        { label: "Similarity-based recall (layer 3)", files: "memory/conceptual/ConceptualMemory.ts, similarity.ts, ranking.ts, featureComparison.ts", exports: "ConceptualMemory, rankCandidates, bestMatch, compareFeatures" },
        { label: "AI fallback (layer 4)", files: "ai/aiFallback.ts, ai/OpenRouterClient.ts", exports: "OpenRouterClient, openRouterClient" },
      ]}
    />

    <CapGroup
      title="4. People — recognition, memory, and social behavior"
      rows={[
        { label: "Register/recall a person, log every encounter", files: "people/PersonEncounterService.ts", exports: "PersonEncounterService, personEncounterService, EncounterInput, EncounterOutcome" },
        { label: "\"Find X\" search task", files: "people/PersonSearchService.ts, people/PersonSearchRunner.ts", exports: "personSearchService, SearchMission" },
        { label: "Ask-and-resolve when a name matches multiple people", files: "people/PendingDisambiguation.ts", exports: "startDisambiguation, resolveDisambiguation, getPendingDisambiguation" },
        { label: "Capture a person's name when asked", files: "people/Introductions.ts", exports: "askForName, extractNameFromTranscript, getPendingIntroduction" },
        { label: "Bystander Q&A during a search (keyword + optional LLM)", files: "people/BystanderResponses.ts, people/PendingBystanderQuestion.ts", exports: "interpretBystanderReplyKeywords, markBystanderAsked" },
        { label: "Don't re-greet the same person every cycle", files: "people/GreetingThrottle.ts", exports: "shouldGreet, recordGreeted" },
        { label: "Farewell detection", files: "people/FarewellTracker.ts", exports: "recordInteraction, takeFarewellTarget" },
        { label: "Open-loop return-path dead reckoning", files: "people/DeadReckoning.ts", exports: "buildReturnPath, PatrolStep, ReturnStep" },
      ]}
    />

    <CapGroup
      title="5. Audio — speech, TTS/STT, and music"
      rows={[
        { label: "Speech playback state", files: "audio/AudioService.ts", exports: "AudioService, audioService" },
        { label: "Text-to-speech (EdgeTTS, OmniVoice, ElevenLabs, mock)", files: "audio/TextToSpeech.ts", exports: "EdgeTextToSpeech, OmniVoiceTextToSpeech, ElevenLabsTextToSpeech, MockTextToSpeech" },
        { label: "Speech-to-text (ElevenLabs, Groq/Whisper, mock)", files: "audio/SpeechToText.ts", exports: "ElevenLabsSpeechToText, GroqSpeechToText, MockSpeechToText" },
        { label: "MP3/any → PCM16 transcode (shared by TTS and music)", files: "audio/audioTranscode.ts", exports: "transcodeMp3ToPcm16" },
        { label: "One-shot audio queue the firmware polls", files: "audio/PendingSpeechCache.ts", exports: "setPendingSpeech, takePendingSpeech" },
        { label: "Turn-taking / interruption logic", files: "audio/ConversationArbiter.ts", exports: "conversationArbiter, ArbitrationResult" },
        { label: "Speaker separation", files: "audio/Diarization.ts", exports: "DiarizationProvider, MockDiarization" },
        { label: "Speech → intent parsing", files: "audio/IntentEngine.ts", exports: "understandIntent, Intent" },
        { label: "Real DSP beat detection (energy-flux + autocorrelation)", files: "audio/beatDetection.ts", exports: "detectBeats, BeatDetectionResult" },
        { label: "Upload → transcode → beat-detect → store → log pipeline (user-uploaded files)", files: "music/MusicUploadService.ts", exports: "MusicUploadService, musicUploadService, UploadedTrackResult" },
        { label: "Real licensed catalog search + fetch (Jamendo, CC-licensed)", files: "music/JamendoMusicService.ts", exports: "searchJamendo, fetchJamendoAudio, JamendoTrack" },
        { label: "Full \"play [song]\" orchestration — search + genuine getting-to-know-you conversation running concurrently, honest not-found handling", files: "music/PlaySongService.ts", exports: "startPlayRequest, handleConversationReply" },
        { label: "Genuine, validated conversation questions about the person's own music taste (never lyrics)", files: "music/SongQuestionProposer.ts", exports: "proposeSongQuestion, ProposedQuestion" },
        { label: "Per-request ask-then-consume tracking (same pattern as Introductions.ts)", files: "people/PendingMusicQuestion.ts", exports: "askMusicQuestion, getPendingMusicQuestion" },
      ]}
    />

    <CapGroup
      title="6. Movement — gait, dance, servos"
      rows={[
        { label: "Gait definitions (walk/turn)", files: "gait/GaitConfiguration.ts", exports: "DEFAULT_WALK_FORWARD, DEFAULT_WALK_BACKWARD, DEFAULT_TURN_LEFT, DEFAULT_TURN_RIGHT" },
        { label: "Runs a gait sequence", files: "gait/GaitController.ts", exports: "GaitController" },
        { label: "Gait phase timing", files: "gait/gaitPhases.ts", exports: "internal tables" },
        { label: "Gait config validation", files: "gait/gaitSafety.ts", exports: "validateGaitConfig, GaitSafetyError" },
        { label: "Fixed-tempo dance choreography", files: "performance/DanceChoreographer.ts", exports: "generateDanceSequence, DanceFrame" },
        { label: "Real beat-synced dance choreography", files: "performance/DanceChoreographer.ts", exports: "generateBeatSyncedDanceSequence" },
        { label: "Runs a dance (fixed-tempo or beat-synced)", files: "performance/DanceRunner.ts", exports: "runDance, runDanceToBeats" },
        { label: "Servo abstraction (positional + continuous)", files: "servos/positionalServo.ts, servos/continuousServo.ts", exports: "PositionalServo, ContinuousServo, ServoLimitError" },
        { label: "Servo channel map / hardware layout", files: "servos/ServoConfiguration.ts", exports: "EYE_SERVO_CHANNEL, DEFAULT_SERVO_CONFIGS" },
        { label: "Top-level servo dispatch", files: "servos/ServoManager.ts", exports: "ServoManager, servoManager" },
        { label: "Head/eye orientation decisions", files: "attention/HeadOrientationController.ts, attention/AttentionController.ts", exports: "decideHeadCommand, AttentionController, getAttentionControllerFor" },
      ]}
    />

    <CapGroup
      title="7. Compiler — Vision Script"
      note="A small purpose-built language for authoring gait/servo/wait routines, with a kill switch to disable the whole feature."
      rows={[
        { label: "Tokenizer (real char-accurate columns, $var refs, SET/REPEAT/TIMES/AS/END keywords)", files: "compiler/lexer/Lexer.ts", exports: "Lexer" },
        { label: "Lexical error type", files: "compiler/lexer/LexError.ts", exports: "LexError" },
        { label: "Parser (one-statement-per-line, REPEAT block nesting up to 5 deep)", files: "compiler/parser/Parser.ts", exports: "Parser" },
        { label: "Parse error type", files: "compiler/parser/ParseError.ts", exports: "ParseError" },
        { label: "AST node shapes (incl. SetStatement, RepeatStatement, VariableRef)", files: "compiler/ast/nodes.ts, compiler/ast/AST.ts", exports: "CommandStatement, WaitStatement, SetStatement, RepeatStatement, ProgramAST" },
        { label: "Command-existence, WAIT-range, variable type/scope checks", files: "compiler/semantic/SemanticAnalyzer.ts", exports: "analyze, assertNoErrors, Diagnostic" },
        { label: "Known-command lookup", files: "compiler/semantic/TypeChecker.ts", exports: "isKnownCommand" },
        { label: "Shared compile-time safety bounds (loop count/nesting/total size)", files: "compiler/limits.ts", exports: "MAX_REPEAT_COUNT, MAX_NESTING_DEPTH, MAX_TOTAL_INSTRUCTIONS" },
        { label: "AST → IR — unrolls loops, substitutes variables, carries line/column", files: "compiler/ir/IRGenerator.ts, compiler/ir/IR.ts", exports: "generateIR, IRProgram" },
        { label: "Compile-time-limit error type (too-large expansion, out-of-range loop-varying value)", files: "compiler/ir/CompileLimitError.ts", exports: "CompileLimitError" },
        { label: "Full pipeline entry point", files: "compiler/Compiler.ts", exports: "Compiler, compiler, CompileResult" },
        { label: "Human-readable error formatting (caret pointer)", files: "compiler/diagnostics.ts", exports: "formatDiagnostic, formatDiagnostics" },
        { label: "Runs compiled IR through CommandRegistry", files: "scripts/ScriptExecutor.ts", exports: "ScriptExecutor, scriptExecutor, paramsForArg" },
        { label: "Script CRUD/orchestration", files: "scripts/ScriptService.ts", exports: "ScriptService, scriptService" },
        { label: "Kill switch for the whole compiler feature", files: "control/CompilerSettings.ts", exports: "compilerSettings, CompilerDisabledError" },
      ]}
    />

    <CapGroup
      title="8. Commands, safety, and control mode"
      rows={[
        { label: "Single entry point for every hardware command", files: "commands/CommandRegistry.ts", exports: "CommandRegistry, commandRegistry, DispatchInput" },
        { label: "Per-command business logic", files: "commands/CommandExecutor.ts", exports: "CommandExecutor, commandExecutor" },
        { label: "Zod schema validation per command", files: "commands/CommandValidator.ts, commands/commandSchemas.ts", exports: "validateCommand, CommandValidationError" },
        { label: "Command metadata (admin-only, movement, etc.)", files: "packages/commands.ts", exports: "COMMAND_CATEGORY, ADMIN_ONLY_COMMANDS, MANUAL_GATED_COMMANDS, MOVEMENT_COMMANDS" },
        { label: "Queue for commands awaiting robot pickup", files: "commands/PendingCommandQueue.ts", exports: "pendingCommandQueue, QueuedCommand" },
        { label: "AUTONOMOUS vs MANUAL gating", files: "control/ControlMode.ts", exports: "controlMode, ControlModeError" },
        { label: "Hardware safety checks (applies regardless of mode)", files: "safety/SafetyManager.ts, safety/safetyRules.ts", exports: "SafetyManager, safetyManager, requiresSafetyCheck" },
        { label: "Emergency stop", files: "safety/EmergencyStop.ts", exports: "EmergencyStop" },
        { label: "Ultrasonic-based movement safety", files: "ultrasonic/UltrasonicSafety.ts", exports: "isMovementSafe, isMovementSafeConsideringHeadAngle, classifyDistance" },
        { label: "Ultrasonic sensor read/filter", files: "ultrasonic/UltrasonicController.ts, UltrasonicFilter.ts, UltrasonicService.ts", exports: "ultrasonicController, UltrasonicFilter, ultrasonicService" },
        { label: "Presence detection from ultrasonic", files: "ultrasonic/PresenceDetector.ts", exports: "detectPresenceEvent, trackPresence" },
      ]}
    />

    <CapGroup
      title="9. Auth, users, and restrictions"
      rows={[
        { label: "Register/login", files: "auth/AuthService.ts", exports: "authService, RegisterInput, LoginInput, AuthError" },
        { label: "Password hashing", files: "auth/PasswordService.ts", exports: "passwordService" },
        { label: "Session issuing/lookup", files: "auth/SessionService.ts", exports: "sessionService, IssuedSession" },
        { label: "Token generation/hashing (email verify, password reset)", files: "auth/tokens.ts", exports: "generateToken, hashToken" },
        { label: "Audit logging", files: "auth/AuditService.ts, logging/audit.ts", exports: "auditLog" },
        { label: "Auth middleware (session cookie + robot auth)", files: "middleware/auth.ts", exports: "requireRobotAuth, AuthedRequest, SESSION_COOKIE_NAME" },
        { label: "Role gating (USER < TRUSTED < ADMIN)", files: "middleware/authorization.ts", exports: "requireRole, requireAdmin" },
        { label: "Rate limiting", files: "middleware/rateLimit.ts", exports: "loginRateLimit, commandRateLimit, aiRateLimit, accountRateLimit" },
        { label: "Per-user/admin restrictions", files: "restrictions/RestrictionService.ts", exports: "restrictionService, RestrictionError" },
      ]}
    />

    <CapGroup
      title="10. Tasks, telemetry, and system health"
      rows={[
        { label: "Async task lifecycle (dance, search, etc.)", files: "tasks/TaskManager.ts", exports: "TaskManager, taskManager" },
        { label: "Scheduled/recurring tasks", files: "tasks/TaskScheduler.ts", exports: "TaskScheduler, taskScheduler" },
        { label: "Telemetry ingestion/storage", files: "telemetry/TelemetryService.ts", exports: "TelemetryService, telemetryService" },
        { label: "Overall system health checks", files: "system/SystemHealthService.ts", exports: "systemHealthService, SystemHealthReport" },
        { label: "Robot connection/session tracking", files: "robot/RobotConnection.ts, robot/RobotManager.ts", exports: "robotConnection, RobotManager, robotManager" },
        { label: "Declared hardware capabilities", files: "robot/capabilities.ts", exports: "getCapabilities" },
        { label: "WebSocket server + events", files: "websocket/socket.ts, events.ts, rooms.ts", exports: "initSocket, getIO, emitToAll, SOCKET_EVENTS, ROOMS" },
      ]}
    />

    <CapGroup
      title="11. Integrations"
      rows={[
        { label: "Generic HTTP-triggered smart device (lights/plugs/etc)", files: "integrations/HttpSmartDevice.ts", exports: "isValidHttpUrl, SmartDeviceConfig, SmartDeviceTriggerResult" },
        { label: "Google Drive upload (photos + audio)", files: "google-drive/GoogleDriveService.ts", exports: "GoogleDriveService, googleDriveService" },
        { label: "OpenRouter (AI fallback + vision)", files: "ai/OpenRouterClient.ts", exports: "OpenRouterClient, openRouterClient" },
      ]}
    />

    <Divider />
    <H2>Firmware (firmware/esp32-cam/)</H2>
    <P>
      C++ (PlatformIO). Servo/gait control via PCA9685, camera capture +
      HTTPS/WSS upload, HC-SR04 ultrasonic safety cutoffs, I2S mic/speaker,
      command-protocol parsing, WiFi/HTTP client, local safety interlocks
      that work even offline.
    </P>

    <H2>Dashboard (dashboard/)</H2>
    <P>
      React + Tailwind + Zustand, Socket.IO live updates. Live camera
      feed, tracking visualization, manual gait/servo control,
      memory/log/user inspection. Dark/light theming lives in{" "}
      <code className="font-mono text-[13px]">state/ThemeContext.jsx</code>{" "}
      — a toggle in the top bar, persisted, and it respects OS preference
      on first load.
    </P>

    <Divider />
    <H2>Honest gaps</H2>
    <P>
      No SLAM/mapping/pathfinding — "find person" is patrol + dead
      reckoning, not navigation. No open-ended goal generation on the fast
      per-cycle safety path — that stays a fixed enum on purpose — but the
      slower deliberative loop genuinely proposes goals via an LLM while
      the robot is alone. No YouTube/Spotify audio —{" "}
      <code className="font-mono text-[13px]">music/MusicUploadService.ts</code>{" "}
      only ever plays a file someone uploaded, alongside the licensed
      Jamendo catalog search. AI-vision detection and paid STT/TTS
      providers need your own API keys — the code is real, the credential
      is yours to supply.
    </P>
  </div>
);

const TechStackPage = () => (
  <div>
    <H1>Tech Stack</H1>
    <p className="text-[15px] text-[#888] mb-8">
      Three independent projects — firmware, server, dashboard — each
      buildable and deployable on its own.
    </p>

    <H2>Firmware (firmware/esp32-cam)</H2>
    {[
      {
        name: "ESP32-S3 + PlatformIO",
        why: "OceanLabz ESP32-S3 WROOM N16R8 (16MB flash, 8MB octal PSRAM). C++ firmware handles camera capture, WiFi/HTTPS/WSS upload, and command-protocol parsing.",
      },
      {
        name: "PCA9685 + 5 servos",
        why: "I2C PWM driver at address 0x40 drives eye/head tracking (shared with the HC-SR04 aim) plus left/right leg rotation and joint servos.",
      },
      {
        name: "I2S mic & speaker",
        why: "Onboard audio capture and playback, independent of the PCA9685 servo bus.",
      },
      {
        name: "HC-SR04 ultrasonic",
        why: "Local, offline-capable safety interlock for movement — works even if the connection to the server drops.",
      },
    ].map(({ name, why }) => (
      <div key={name} className="flex gap-4 py-3 border-b border-[#f0f0f0] last:border-0">
        <span className="text-[14px] font-semibold text-[#0f0f0f] w-40 shrink-0">
          {name}
        </span>
        <span className="text-[14px] text-[#555] leading-relaxed">{why}</span>
      </div>
    ))}

    <H2>Backend (server/)</H2>
    {[
      {
        name: "Node.js + TypeScript",
        why: "The full perception, brain, memory, and command stack — routes registered in index.ts, mounted under /api.",
      },
      {
        name: "PostgreSQL on Neon",
        why: "48+ tables via Drizzle ORM, including pgvector on person_faces for nearest-neighbor face matching.",
      },
      {
        name: "Zod",
        why: "Per-command schema validation before anything reaches CommandExecutor — bad input never reaches hardware logic.",
      },
      {
        name: "bcrypt + JWT",
        why: "Password hashing (PasswordService) and session tokens (SessionService), with the JWT also persisted server-side so logout actually revokes it.",
      },
      {
        name: "dlib CNN / ONNX Runtime",
        why: "Face embedding backends — a default 128-d dlib CNN model, with a real ONNX Runtime backend (512-d) available when you supply your own model.",
      },
      {
        name: "EdgeTTS / ElevenLabs / Groq",
        why: "Pluggable text-to-speech and speech-to-text providers, with mocks so the pipeline still runs without API keys during development.",
      },
      {
        name: "Jamendo",
        why: "Licensed, CC-friendly music catalog search and fetch behind the 'play a song' feature.",
      },
      {
        name: "OpenRouter",
        why: "AI fallback tier for memory lookups and optional vision-LLM upgrades to object/person detection.",
      },
      {
        name: "Google Drive",
        why: "Storage target for captured photos and audio clips (optional — falls back to \"not stored\" when unset).",
      },
      {
        name: "Socket.IO",
        why: "Real-time events out to the dashboard: telemetry, camera frames, decisions, reactions.",
      },
    ].map(({ name, why }) => (
      <div key={name} className="flex gap-4 py-3 border-b border-[#f0f0f0] last:border-0">
        <span className="text-[14px] font-semibold text-[#0f0f0f] w-40 shrink-0">
          {name}
        </span>
        <span className="text-[14px] text-[#555] leading-relaxed">{why}</span>
      </div>
    ))}

    <H2>Dashboard (dashboard/)</H2>
    {[
      {
        name: "React + Vite",
        why: "Standalone frontend project — its own package.json, nothing hoisted from the server.",
      },
      {
        name: "Tailwind CSS",
        why: "Utility-first styling across every panel, including this docs section.",
      },
      {
        name: "Zustand",
        why: "Lightweight client state (page routing, session, live subsystem state).",
      },
      {
        name: "Socket.IO client",
        why: "Live camera feed, tracking visualization, and log/telemetry updates without polling.",
      },
      {
        name: "Dark/light theming",
        why: "state/ThemeContext.jsx — a persisted toggle in the top bar that respects OS preference on first load.",
      },
    ].map(({ name, why }) => (
      <div key={name} className="flex gap-4 py-3 border-b border-[#f0f0f0] last:border-0">
        <span className="text-[14px] font-semibold text-[#0f0f0f] w-40 shrink-0">
          {name}
        </span>
        <span className="text-[14px] text-[#555] leading-relaxed">{why}</span>
      </div>
    ))}
  </div>
);

const ApiPage = () => (
  <div>
    <H1>API Endpoints</H1>
    <p className="text-[15px] text-[#888] mb-8">
      Base path <code className="font-mono text-[13px]">/api</code>. Full
      route definitions live in{" "}
      <code className="font-mono text-[13px]">
        server/src/routes/*.routes.ts
      </code>
      , registered in <code className="font-mono text-[13px]">index.ts</code>.
    </p>
    <P>
      Command-related endpoints all return the shared{" "}
      <code className="font-mono text-[13px]">CommandResult</code> shape
      (see <code className="font-mono text-[13px]">packages/types.ts</code>
      ). Every route below requires an authenticated session except{" "}
      <code className="font-mono text-[13px]">/auth/register</code>,{" "}
      <code className="font-mono text-[13px]">/auth/login</code>,{" "}
      <code className="font-mono text-[13px]">/auth/forgot-password</code>,{" "}
      <code className="font-mono text-[13px]">/auth/reset-password</code>,{" "}
      <code className="font-mono text-[13px]">/auth/verify</code>, and{" "}
      <code className="font-mono text-[13px]">/system/health</code>.
    </P>

    <Divider />

    <RouteGroup title="Commands">
      <Route method="POST" path="/commands" />
      <Route method="POST" path="/commands/validate" />
      <Route method="POST" path="/commands/execute" />
      <Route method="POST" path="/commands/emergency-stop" />
      <Route method="GET" path="/commands" />
      <Route method="GET" path="/commands/:id" />
      <Route method="GET" path="/commands/pending" note="robot polling for queued commands" />
    </RouteGroup>

    <RouteGroup title="Servos & Gait">
      <Route method="GET" path="/servos" />
      <Route method="GET" path="/servos/:channel" />
      <Route method="POST" path="/servos/:channel/move|stop|center" />
      <Route method="POST" path="/servos/safe" note="ADMIN" />
      <Route method="POST" path="/gait/forward|backward|left|right|stop" />
    </RouteGroup>

    <RouteGroup title="Camera, Audio & Music">
      <Route method="POST" path="/camera/capture" />
      <Route method="POST" path="/camera/tracking/start|stop" />
      <Route method="POST" path="/audio/listen/start|stop" />
      <Route method="POST" path="/audio/speak" />
      <Route method="POST" path="/audio/stop" />
      <Route method="GET" path="/audio/state" />
      <Route method="GET / POST" path="/music" note="upload/list/play tracks, beat-synced dance" />
    </RouteGroup>

    <RouteGroup title="Tracking & Ultrasonic">
      <Route method="GET / POST" path="/tracking" note="eye-tracking state" />
      <Route method="GET" path="/ultrasonic" />
      <Route method="GET" path="/ultrasonic/status" />
      <Route method="POST" path="/ultrasonic/calibrate|enable|disable" note="ADMIN" />
    </RouteGroup>

    <RouteGroup title="Brain, Memory & Mental State">
      <Route method="POST" path="/brain/observe" />
      <Route method="POST" path="/brain/process" />
      <Route method="POST" path="/memory/search" />
      <Route method="POST" path="/memory/learn" />
      <Route method="GET" path="/memory/static|dynamic|conceptual" />
      <Route method="GET" path="/mental/state" />
      <Route method="GET" path="/mental/curiosity" />
      <Route method="POST" path="/mental/evaluate" />
    </RouteGroup>

    <RouteGroup title="Decisions & Reactions">
      <Route method="GET" path="/decisions" />
      <Route method="POST" path="/decisions/evaluate" />
      <Route method="GET" path="/reactions" />
      <Route method="POST" path="/reactions/execute|cancel" />
    </RouteGroup>

    <RouteGroup title="People & Objects">
      <Route method="GET / POST" path="/people" note="profiles, face registration, history" />
      <Route method="GET" path="/people/:id" />
      <Route method="GET" path="/people/:id/timeline" />
      <Route method="GET" path="/objects" />
    </RouteGroup>

    <RouteGroup title="Robot, Tasks & Scripts">
      <Route method="GET" path="/robot" />
      <Route method="GET" path="/robot/status" />
      <Route method="POST" path="/robot/connect|disconnect" note="ADMIN" />
      <Route method="GET / POST" path="/tasks" />
      <Route method="POST" path="/tasks/:id/cancel" />
      <Route method="POST" path="/scripts/compile" />
      <Route method="POST" path="/scripts/execute" note="Vision Script CRUD + run" />
    </RouteGroup>

    <RouteGroup title="Smart Devices, Settings & Conversation">
      <Route method="GET / POST" path="/smart-devices" note="registration/trigger" />
      <Route method="GET / POST" path="/settings" note="system settings" />
      <Route method="GET / POST" path="/conversation" note="conversation state" />
      <Route method="GET / POST" path="/restrictions" note="per-user restrictions" />
    </RouteGroup>

    <RouteGroup title="Telemetry & System">
      <Route method="GET" path="/telemetry" />
      <Route method="POST" path="/heartbeat" />
      <Route method="GET" path="/system/health" />
      <Route method="GET" path="/system/capabilities" />
    </RouteGroup>

    <Divider />
    <H2>Auth & admin</H2>
    <Block>{`POST /auth/register, /auth/login, /auth/logout
GET  /auth/me
POST /auth/refresh, /auth/forgot-password, /auth/reset-password, /auth/verify

GET   /users            (ADMIN)
PATCH /users/:id/role   (ADMIN)
PATCH /users/:id/status (ADMIN)

GET  /system/settings/compiler-enabled   (any authenticated user)
POST /system/settings/compiler-enabled   (ADMIN — toggles the compiler kill switch)`}</Block>
    <P>
      Roles are ordered <code className="font-mono text-[13px]">USER</code>{" "}
      {"<"} <code className="font-mono text-[13px]">TRUSTED</code> {"<"}{" "}
      <code className="font-mono text-[13px]">ADMIN</code>. Viewing
      telemetry, commands, brain, and memory only needs an authenticated
      session; moving servos or gait needs TRUSTED; toggling the compiler
      or managing users needs ADMIN. Emergency stop stays available to any
      authenticated role on purpose — safety should never be harder to
      trigger than normal movement.
    </P>
  </div>
);

const DatabasePage = () => (
  <div>
    <H1>Database</H1>
    <p className="text-[15px] text-[#888] mb-8">
      PostgreSQL, built for Neon. One file, one paste, done.
    </p>
    <P>
      Drizzle ORM (
      <code className="font-mono text-[13px]">
        server/src/database/schema.ts
      </code>
      ) is the source of truth.{" "}
      <code className="font-mono text-[13px]">database/schema.sql</code> is
      the exported, ready-to-run SQL equivalent — 48 tables, every index,
      and every foreign key, in the correct order, in one shot. It's been
      validated end-to-end against a real Postgres instance and is safe to
      run top to bottom exactly as written.
    </P>

    <H2>Set it up on Neon</H2>
    {[
      { step: "01", body: "Create a project at neon.tech (the free tier is fine)." },
      { step: "02", body: "Open your project's SQL Editor in the Neon console." },
      { step: "03", body: "Paste the entire contents of schema.sql and run it. No migration chain, nothing else needed." },
      { step: "04", body: "Copy your connection string from Neon (Dashboard → Connection Details) into DATABASE_URL in your .env." },
    ].map(({ step, body }) => (
      <div key={step} className="flex gap-4 py-2.5">
        <span className="text-[12px] font-mono text-[#bbb] pt-0.5 shrink-0">
          {step}
        </span>
        <p className="text-[14px] text-[#555] leading-relaxed">{body}</p>
      </div>
    ))}
    <P>
      Optionally, seed some starter data — servo records, a default gait
      config, static safety/identity memories, and the compiler-enabled
      flag:
    </P>
    <Block>{`npm run seed   # run from the repo root`}</Block>

    <Divider />
    <H2>Two kinds of users</H2>
    <div className="grid grid-cols-1 gap-3 my-4">
      {[
        {
          name: "Visitors",
          desc: "Create their own account from the dashboard's /register page (name, email, password + confirm) and log back in with just email + password at /login. Nothing to set up — this is the normal signup flow the app already serves.",
        },
        {
          name: "Admins",
          desc: "The people who run the dashboard's privileged pages. Not self-registered — POST /auth/register always creates a plain USER — so there's no way to sign up your way into an admin account. Admins are added straight into the database.",
        },
      ].map((p) => (
        <div key={p.name} className="border border-[#ebebeb] rounded-lg px-4 py-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[14px] font-semibold text-[#0f0f0f]">
              {p.name}
            </span>
          </div>
          <p className="text-[14px] text-[#666] leading-relaxed">{p.desc}</p>
        </div>
      ))}
    </div>

    <H2>Adding an admin</H2>
    <P>
      Each admin gets a row in{" "}
      <code className="font-mono text-[13px]">users</code> with{" "}
      <code className="font-mono text-[13px]">role = 'ADMIN'</code>, made
      directly in Neon's SQL Editor — no redeploy, no shared password, and
      no credential sitting in the repo.
    </P>
    <Block>{`node scripts/create-admin.js`}</Block>
    <P>
      It asks for the admin's name, email, and a password (input hidden
      while typing), hashes the password with the same bcrypt settings the
      app verifies against, and prints one{" "}
      <code className="font-mono text-[13px]">
        INSERT ... ON CONFLICT DO UPDATE
      </code>{" "}
      statement — paste that into Neon's SQL Editor and run it. Re-running
      the script for the same email rotates that admin's password instead
      of erroring on the duplicate.
    </P>
    <Block>{`-- demote to a normal account
UPDATE users SET role = 'USER' WHERE email = 'someone@company.com';

-- or deactivate entirely (blocks login, keeps their history/audit trail)
UPDATE users SET is_active = FALSE WHERE email = 'someone@company.com';`}</Block>

    <Divider />
    <H2>Schema highlights</H2>
    <P>
      48+ tables, including{" "}
      <code className="font-mono text-[13px]">person_faces</code> (pgvector
      embeddings for face matching) and{" "}
      <code className="font-mono text-[13px]">music_tracks</code>. Table
      relations live in{" "}
      <code className="font-mono text-[13px]">database/relations.ts</code>,
      the connection pool/client in{" "}
      <code className="font-mono text-[13px]">database/client.ts</code> and{" "}
      <code className="font-mono text-[13px]">config/database.ts</code>, and
      migration history in{" "}
      <code className="font-mono text-[13px]">
        database/migrations/0000...0006*.sql
      </code>
      .
    </P>

    <H3>Repositories (server/src/repositories/)</H3>
    <div className="flex flex-wrap gap-1.5 mb-4">
      {[
        "people.repository.ts",
        "personFaces.repository.ts (pgvector search)",
        "musicTracks.repository.ts",
        "mediaFiles.repository.ts",
        "tasks.repository.ts",
        "commands.repository.ts",
        "decisions.repository.ts",
        "memory.repository.ts",
        "objects.repository.ts",
        "observations.repository.ts",
        "people-observations.repository.ts",
        "reactions.repository.ts",
        "robot.repository.ts",
        "smartDevices.repository.ts",
        "speechEvents.repository.ts",
        "telemetry.repository.ts",
        "ultrasonic.repository.ts",
        "users.repository.ts",
        "visionFrameEvents.repository.ts",
        "adminRestrictions.repository.ts",
        "audio.repository.ts",
      ].map((r) => (
        <span
          key={r}
          className="text-[11.5px] font-mono text-[#0f0f0f] bg-[#f8f8f8] rounded px-1.5 py-0.5"
        >
          {r}
        </span>
      ))}
    </div>

    <Divider />
    <H2>Files</H2>
    {[
      {
        name: "database/schema.sql",
        why: "The entire schema — the file you actually need. 48 tables, 61 foreign keys, validated end-to-end, safe to run top to bottom.",
      },
      {
        name: "server/src/database/schema.ts",
        why: "The Drizzle schema — the actual source of truth. Edit this first if the schema changes.",
      },
      {
        name: "server/src/database/seed/",
        why: "Optional development seed scripts (users, servos, gait, ultrasonic, static memory). They live in server/ because they import the server's Drizzle client and bcryptjs directly.",
      },
      {
        name: "database/migrations/0000_init.sql",
        why: "Identical copy of schema.sql, kept only so drizzle-kit has a migrations folder to diff future changes against.",
      },
    ].map(({ name, why }) => (
      <div
        key={name}
        className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-3 border-b border-[#f0f0f0] last:border-0"
      >
        <span className="text-[13px] font-mono font-semibold text-[#0f0f0f] w-64 shrink-0">
          {name}
        </span>
        <span className="text-[14px] text-[#555] leading-relaxed">{why}</span>
      </div>
    ))}
    <P>
      All <code className="font-mono text-[13px]">CREATE TABLE</code>/
      <code className="font-mono text-[13px]">CREATE INDEX</code> statements
      use <code className="font-mono text-[13px]">IF NOT EXISTS</code>, so
      re-running the whole file after a schema change is always safe. Keep{" "}
      <code className="font-mono text-[13px]">schema.sql</code> and{" "}
      <code className="font-mono text-[13px]">schema.ts</code> in sync
      either way.
    </P>
  </div>
);

const SetupPage = () => (
  <div>
    <H1>Local Setup</H1>
    <p className="text-[15px] text-[#888] mb-8">
      Firmware, server, and dashboard are three independent projects —
      here's the server and dashboard running locally.
    </p>

    {[
      {
        step: "01",
        title: "Install dependencies",
        body: "Installs server/ and dashboard/ dependencies separately, and creates .env from .env.example.",
        code: `npm run setup`,
      },
      {
        step: "02",
        title: "Set up the database",
        body: "Paste database/schema.sql into Neon's SQL Editor, then copy the connection string into DATABASE_URL. See the Database page for the full walkthrough.",
        code: `DATABASE_URL=postgres://...`,
      },
      {
        step: "03",
        title: "Seed starter data (optional)",
        body: "Adds a handful of servo records, a default gait config, static safety/identity memories, and the compiler-enabled flag.",
        code: `npm run seed`,
      },
      {
        step: "04",
        title: "Run both dev servers",
        body: "Each of server/ and dashboard/ is fully self-contained — its own package.json, nothing hoisted — so either can run, build, or deploy on its own.",
        code: `npm run dev:server      # in one terminal\nnpm run dev:dashboard   # in another`,
      },
    ].map(({ step, title, body, code }) => (
      <div key={step} className="mb-9">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-[12px] font-mono text-[#bbb]">{step}</span>
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0f0f0f]">
            {title}
          </h2>
        </div>
        <P>{body}</P>
        <Block>{code}</Block>
      </div>
    ))}

    <Divider />
    <H2>Other required env vars</H2>
    <P>
      <code className="font-mono text-[13px]">JWT_SECRET</code> and{" "}
      <code className="font-mono text-[13px]">ROBOT_AUTH_SECRET</code>{" "}
      should be generated as random secrets locally.{" "}
      <code className="font-mono text-[13px]">GOOGLE_DRIVE_*</code>,{" "}
      <code className="font-mono text-[13px]">OPENROUTER_API_KEY</code>, and
      any TTS/STT provider keys (EdgeTTS/ElevenLabs/Groq) are optional —
      media storage falls back to "not stored," the memory chain works
      without the AI-fallback tier, and audio falls back to mock providers
      if these are unset.
    </P>

    <H2>Deploying</H2>
    <P>
      The backend deploys from the{" "}
      <code className="font-mono text-[13px]">server/</code> folder alone —
      no workspace linking, no sibling packages to build first. On Render:
      root directory <code className="font-mono text-[13px]">server</code>,
      build command{" "}
      <code className="font-mono text-[13px]">
        npm install && npm run build
      </code>
      , start command{" "}
      <code className="font-mono text-[13px]">node dist/index.js</code>,
      health check{" "}
      <code className="font-mono text-[13px]">/api/system/health</code>. A{" "}
      <code className="font-mono text-[13px]">Dockerfile</code> is included
      if you'd rather containerize it on any host.
    </P>
    <P>
      The dashboard deploys separately (Vercel, Netlify, or a Render static
      site) with root directory{" "}
      <code className="font-mono text-[13px]">dashboard</code>, build
      command{" "}
      <code className="font-mono text-[13px]">
        npm install && npm run build
      </code>
      , publish directory{" "}
      <code className="font-mono text-[13px]">dist</code>, and{" "}
      <code className="font-mono text-[13px]">VITE_API_URL</code> /{" "}
      <code className="font-mono text-[13px]">VITE_SOCKET_URL</code> pointed
      at the backend.
    </P>
    <P>
      For deeper health checks beyond the load-balancer ping, an
      authenticated{" "}
      <code className="font-mono text-[13px]">/api/system/health/full</code>{" "}
      runs a real per-subsystem sweep — database round trip, robot link,
      servos, ultrasonic, camera, audio, control mode, a live compiler
      self-test, AI fallback, and Google Drive — surfaced on the
      dashboard's Monitoring page.
    </P>
  </div>
);

const PAGES = {
  overview: OverviewPage,
  "how-it-works": HowItWorksPage,
  capabilities: CapabilitiesPage,
  "tech-stack": TechStackPage,
  api: ApiPage,
  database: DatabasePage,
  setup: SetupPage,
};

const Docs = () => {
  const [current, setCurrent] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const PageComponent = PAGES[current];
  const groups = [...new Set(NAV.map((n) => n.group))];

  return (
    <>
      <div className="min-h-screen cool bg-white text-[#1a1a1a] antialiased">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#ebebeb]">
          <div className="max-w-[1080px] mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-2xl">
                <img src="/images/logo/vision.png" className="w-10" />
              </span>
              <span className="text-[16px] font-semibold text-[#0f0f0f]">
                Vision
              </span>
              <span className="text-[11px] font-semibold text-[#888]">
                docs
              </span>
            </a>
            <button
              className="md:hidden text-[#888] hover:text-[#0f0f0f] transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M2 2l14 14M16 2L2 16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M2 4h14M2 9h14M2 14h14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </header>

        <div className="max-w-[1080px] mx-auto px-6 flex gap-0 relative">
          <aside
            className={`
          md:block md:sticky md:top-14 md:h-[calc(100vh-56px)] md:w-52 md:shrink-0
          ${menuOpen ? "block" : "hidden"}
          fixed top-14 left-0 right-0 z-30 bg-white border-b md:border-b-0 border-[#ebebeb]
          md:border-r md:border-r-[#ebebeb]
          py-8 md:pr-6 px-6 md:px-0 overflow-y-auto
        `}
          >
            {groups.map((group) => (
              <div key={group} className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#bbb] mb-2 px-0">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {NAV.filter((n) => n.group === group).map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          setCurrent(item.id);
                          setMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[14px] transition-colors ${
                          current === item.id
                            ? "bg-[#f0f0f0] text-[#0f0f0f] font-medium"
                            : "text-[#666] hover:text-[#0f0f0f] hover:bg-[#f8f8f8]"
                        }`}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>

          <main className="flex-1 min-w-0 py-12 md:pl-12 max-w-[640px]">
            <PageComponent />
            {/* Prev / Next Navigation */}
            <div className="flex justify-between mt-16 pt-8 border-t border-[#ebebeb]">
              {(() => {
                const idx = NAV.findIndex((n) => n.id === current);
                const prev = NAV[idx - 1];
                const next = NAV[idx + 1];
                return (
                  <>
                    {prev ? (
                      <button
                        onClick={() => setCurrent(prev.id)}
                        className="flex flex-col items-start text-left group"
                      >
                        <span className="text-[11px] text-[#bbb] uppercase tracking-wider mb-1">
                          Previous
                        </span>
                        <span className="text-[14px] text-[#555] group-hover:text-[#0f0f0f] transition-colors">
                          ← {prev.label}
                        </span>
                      </button>
                    ) : (
                      <div />
                    )}
                    {next ? (
                      <button
                        onClick={() => setCurrent(next.id)}
                        className="flex flex-col items-end text-right group"
                      >
                        <span className="text-[11px] text-[#bbb] uppercase tracking-wider mb-1">
                          Next
                        </span>
                        <span className="text-[14px] text-[#555] group-hover:text-[#0f0f0f] transition-colors">
                          {next.label} →
                        </span>
                      </button>
                    ) : (
                      <div />
                    )}
                  </>
                );
              })()}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default Docs;