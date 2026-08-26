CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS robots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL DEFAULT 'Vision',
  firmware_version VARCHAR(32),
  hardware_version VARCHAR(32),
  status VARCHAR(32) NOT NULL DEFAULT 'OFFLINE',
  ip_address VARCHAR(64),
  last_heartbeat TIMESTAMP,
  wifi_rssi INTEGER,
  free_heap INTEGER,
  uptime_seconds INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128),
  category VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN',
  trust_score REAL NOT NULL DEFAULT 0,
  relationship_score REAL NOT NULL DEFAULT 0,
  face_identifier VARCHAR(256),
  visit_count INTEGER NOT NULL DEFAULT 0,
  first_seen TIMESTAMP DEFAULT now(),
  last_seen TIMESTAMP DEFAULT now(),
  preferences JSONB,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS people_category_idx ON people(category);
CREATE INDEX IF NOT EXISTS people_face_idx ON people(face_identifier);
CREATE INDEX IF NOT EXISTS people_last_seen_idx ON people(last_seen);

CREATE TABLE IF NOT EXISTS person_faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id),
  embedding JSONB,
  media_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS person_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id),
  key VARCHAR(128) NOT NULL,
  value JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id),
  robot_id UUID REFERENCES robots(id),
  transcript JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  media_type VARCHAR(32) NOT NULL DEFAULT 'IMAGE',
  mime_type VARCHAR(64),
  filename VARCHAR(256),
  google_drive_file_id VARCHAR(256),
  google_drive_url TEXT,
  file_size INTEGER,
  checksum VARCHAR(128),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  person_id UUID REFERENCES people(id),
  observation_type VARCHAR(32) NOT NULL,
  description TEXT,
  confidence REAL,
  source VARCHAR(32),
  media_id UUID REFERENCES media_files(id),
  features JSONB,
  context JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS observations_created_at_idx ON observations(created_at);
CREATE INDEX IF NOT EXISTS observations_type_idx ON observations(observation_type);

CREATE TABLE IF NOT EXISTS objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,
  category VARCHAR(64),
  description TEXT,
  confidence REAL,
  first_seen TIMESTAMP DEFAULT now(),
  last_seen TIMESTAMP DEFAULT now(),
  observation_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS object_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES objects(id),
  observation_id UUID NOT NULL REFERENCES observations(id),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS object_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES objects(id),
  shape VARCHAR(64),
  primary_colour VARCHAR(32),
  secondary_colour VARCHAR(32),
  estimated_size VARCHAR(32),
  texture VARCHAR(64),
  aspect_ratio REAL,
  dimensions JSONB,
  visual_features JSONB,
  semantic_features JSONB
);

CREATE TABLE IF NOT EXISTS static_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_key VARCHAR(128) NOT NULL UNIQUE,
  memory_type VARCHAR(64) NOT NULL,
  title VARCHAR(256) NOT NULL,
  content TEXT NOT NULL,
  importance REAL NOT NULL DEFAULT 0.5,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dynamic_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  person_id UUID REFERENCES people(id),
  observation_id UUID REFERENCES observations(id),
  memory_type VARCHAR(64),
  title VARCHAR(256) NOT NULL,
  content TEXT NOT NULL,
  source VARCHAR(32) NOT NULL,
  confidence REAL NOT NULL,
  importance REAL NOT NULL DEFAULT 0.5,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED',
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dynamic_memories_confidence_idx ON dynamic_memories(confidence);
CREATE INDEX IF NOT EXISTS dynamic_memories_created_at_idx ON dynamic_memories(created_at);
CREATE INDEX IF NOT EXISTS dynamic_memories_verification_idx ON dynamic_memories(verification_status);

CREATE TABLE IF NOT EXISTS conceptual_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID REFERENCES objects(id),
  observation_id UUID REFERENCES observations(id),
  concept_name VARCHAR(128) NOT NULL,
  concept_category VARCHAR(64),
  description TEXT,
  confidence REAL,
  feature_vector JSONB,
  semantic_vector JSONB,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conceptual_memories_concept_name_idx ON conceptual_memories(concept_name);

CREATE TABLE IF NOT EXISTS similarity_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES observations(id),
  candidate_type VARCHAR(32),
  candidate_id UUID,
  candidate_name VARCHAR(128),
  total_score REAL,
  shape_score REAL,
  colour_score REAL,
  size_score REAL,
  appearance_score REAL,
  context_score REAL,
  feature_score REAL,
  semantic_score REAL,
  matching_features JSONB,
  conflicting_features JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS similarity_results_observation_idx ON similarity_results(observation_id);
CREATE INDEX IF NOT EXISTS similarity_results_total_score_idx ON similarity_results(total_score);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  person_id UUID REFERENCES people(id),
  task_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  priority INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  input JSONB,
  result JSONB,
  error TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_robot_idx ON tasks(robot_id);

CREATE TABLE IF NOT EXISTS robot_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  mood VARCHAR(32),
  energy INTEGER,
  curiosity INTEGER,
  friendliness INTEGER,
  alertness INTEGER,
  confidence INTEGER,
  current_intent VARCHAR(64),
  current_person_id UUID REFERENCES people(id),
  current_task_id UUID REFERENCES tasks(id),
  state JSONB,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mood_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  mood VARCHAR(32),
  snapshot JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  observation_id UUID REFERENCES observations(id),
  state VARCHAR(32),
  speech TEXT,
  gestures JSONB,
  reason TEXT,
  confidence REAL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS command_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  task_id UUID REFERENCES tasks(id),
  source VARCHAR(32) NOT NULL,
  command_type VARCHAR(64) NOT NULL,
  command JSONB,
  status VARCHAR(32) NOT NULL,
  validation_result JSONB,
  execution_result JSONB,
  error JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  executed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS command_history_robot_idx ON command_history(robot_id);
CREATE INDEX IF NOT EXISTS command_history_created_at_idx ON command_history(created_at);
CREATE INDEX IF NOT EXISTS command_history_status_idx ON command_history(status);

CREATE TABLE IF NOT EXISTS telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  wifi_rssi INTEGER,
  free_heap INTEGER,
  uptime_seconds INTEGER,
  camera_status VARCHAR(16),
  pca9685_status VARCHAR(16),
  servo_positions JSONB,
  tracking_state VARCHAR(32),
  gait_state VARCHAR(32),
  mock_mode BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS telemetry_robot_idx ON telemetry(robot_id);
CREATE INDEX IF NOT EXISTS telemetry_created_at_idx ON telemetry(created_at);

CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(16) NOT NULL,
  message TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS system_logs_level_idx ON system_logs(level);
CREATE INDEX IF NOT EXISTS system_logs_created_at_idx ON system_logs(created_at);

CREATE TABLE IF NOT EXISTS pi_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128),
  source TEXT NOT NULL,
  created_by VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compiler_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES pi_scripts(id),
  source TEXT,
  tokens JSONB,
  ast JSONB,
  diagnostics JSONB,
  ir JSONB,
  status VARCHAR(32),
  execution_result JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  task_id UUID REFERENCES tasks(id),
  provider VARCHAR(32) NOT NULL DEFAULT 'openrouter',
  model VARCHAR(128),
  purpose VARCHAR(64),
  input_summary TEXT,
  output_summary TEXT,
  confidence REAL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms INTEGER,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS safety_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  event_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL,
  description TEXT,
  sensor_data JSONB,
  action_taken TEXT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servo_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  servo_id VARCHAR(64),
  name VARCHAR(128) NOT NULL,
  channel INTEGER NOT NULL,
  servo_type VARCHAR(16) NOT NULL,
  purpose VARCHAR(64) NOT NULL,
  min_angle INTEGER,
  max_angle INTEGER,
  center_angle INTEGER,
  neutral_pwm INTEGER,
  min_pwm INTEGER,
  max_pwm INTEGER,
  default_speed INTEGER,
  direction_inverted BOOLEAN NOT NULL DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gait_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  name VARCHAR(64) NOT NULL,
  gait_type VARCHAR(32) NOT NULL,
  step_duration INTEGER NOT NULL DEFAULT 400,
  default_speed INTEGER NOT NULL DEFAULT 60,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gait_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gait_configuration_id UUID NOT NULL REFERENCES gait_configurations(id),
  phase_number INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  left_rotation_speed INTEGER NOT NULL,
  left_rotation_direction VARCHAR(16) NOT NULL,
  left_joint_angle INTEGER NOT NULL,
  right_rotation_speed INTEGER NOT NULL,
  right_rotation_direction VARCHAR(16) NOT NULL,
  right_joint_angle INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hardware_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  capability VARCHAR(64) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================
-- AUTH — users, sessions, verification/reset tokens, audit log
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,
  email VARCHAR(256) NOT NULL UNIQUE,
  password_hash VARCHAR(256) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'USER',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(128) NOT NULL,
  user_agent VARCHAR(256),
  ip_address VARCHAR(64),
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(128) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(128) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event VARCHAR(64) NOT NULL,
  ip_address VARCHAR(64),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_event_idx ON audit_logs(event);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================
-- ADMIN RESTRICTIONS — "Vision, don't do that" vetoes
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_type VARCHAR(64) NOT NULL,
  scoped_person_id UUID REFERENCES people(id),
  reason VARCHAR(256),
  created_by_user_id UUID REFERENCES users(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  lifted_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS admin_restrictions_command_type_idx ON admin_restrictions(command_type);
CREATE INDEX IF NOT EXISTS admin_restrictions_active_idx ON admin_restrictions(active);

-- ============================================================
-- SPEECH EVENTS — conversation arbitration / interruption log
-- ============================================================
CREATE TABLE IF NOT EXISTS speech_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  person_id UUID REFERENCES people(id),
  event_type VARCHAR(32) NOT NULL,
  transcript TEXT,
  was_admin BOOLEAN NOT NULL DEFAULT FALSE,
  responded_with TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS speech_events_person_idx ON speech_events(person_id);
CREATE INDEX IF NOT EXISTS speech_events_event_type_idx ON speech_events(event_type);
CREATE INDEX IF NOT EXISTS speech_events_created_at_idx ON speech_events(created_at);


CREATE TABLE IF NOT EXISTS ultrasonic_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  distance_mm REAL,
  raw_distance_mm REAL,
  filtered_distance_mm REAL,
  confidence REAL,
  status VARCHAR(16),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ultrasonic_readings_robot_idx ON ultrasonic_readings(robot_id);
CREATE INDEX IF NOT EXISTS ultrasonic_readings_created_at_idx ON ultrasonic_readings(created_at);
CREATE INDEX IF NOT EXISTS ultrasonic_readings_status_idx ON ultrasonic_readings(status);

CREATE TABLE IF NOT EXISTS ultrasonic_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  safe_distance_mm INTEGER NOT NULL DEFAULT 600,
  warning_distance_mm INTEGER NOT NULL DEFAULT 300,
  stop_distance_mm INTEGER NOT NULL DEFAULT 150,
  emergency_distance_mm INTEGER NOT NULL DEFAULT 50,
  filter_window INTEGER NOT NULL DEFAULT 5,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  person_id UUID REFERENCES people(id),
  direction VARCHAR(16),
  google_drive_file_id VARCHAR(256),
  google_drive_url TEXT,
  duration_ms INTEGER,
  checksum VARCHAR(128),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS speech_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_file_id UUID REFERENCES audio_files(id),
  transcript TEXT,
  confidence REAL,
  language VARCHAR(16),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  person_id UUID REFERENCES people(id),
  transcription_id UUID REFERENCES speech_transcriptions(id),
  intent VARCHAR(64),
  response TEXT,
  authorized BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS person_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id),
  robot_id UUID REFERENCES robots(id),
  media_id UUID REFERENCES media_files(id),
  talked_to BOOLEAN NOT NULL DEFAULT FALSE,
  confidence REAL,
  context JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS person_observations_person_idx ON person_observations(person_id);
CREATE INDEX IF NOT EXISTS person_observations_created_at_idx ON person_observations(created_at);

CREATE TABLE IF NOT EXISTS person_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id),
  robot_id UUID REFERENCES robots(id),
  voice_interaction_id UUID REFERENCES voice_interactions(id),
  summary TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mental_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  state VARCHAR(32) NOT NULL,
  curiosity INTEGER,
  uncertainty INTEGER,
  confidence INTEGER,
  attention_target VARCHAR(128),
  current_goal VARCHAR(128),
  context JSONB,
  exploration_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mental_states_robot_idx ON mental_states(robot_id);
CREATE INDEX IF NOT EXISTS mental_states_created_at_idx ON mental_states(created_at);

CREATE TABLE IF NOT EXISTS curiosity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  trigger VARCHAR(64),
  novelty_score REAL,
  action VARCHAR(32),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  observation_id UUID REFERENCES observations(id),
  decision VARCHAR(64) NOT NULL,
  confidence REAL,
  reason TEXT,
  alternatives JSONB,
  safety_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS decisions_robot_idx ON decisions(robot_id);
CREATE INDEX IF NOT EXISTS decisions_created_at_idx ON decisions(created_at);

CREATE TABLE IF NOT EXISTS emotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES robots(id),
  emotion VARCHAR(32) NOT NULL,
  intensity INTEGER,
  trigger VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_memory_id UUID NOT NULL,
  target_memory_id UUID NOT NULL,
  relationship VARCHAR(64),
  similarity_score REAL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_request_id UUID REFERENCES ai_requests(id),
  content TEXT,
  confidence REAL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
