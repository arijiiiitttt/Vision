-- Adds: admin_restrictions (voice/dashboard vetoes on a command type),
-- speech_events (conversation-arbitration / interruption log).
-- Fresh Neon setups don't need this — schema.sql already includes both
-- tables. Run this only against a database that was created before these
-- tables were added to schema.sql.

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
