-- Add message type column (user vs system)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'user';

-- Message read tracking
CREATE TABLE IF NOT EXISTS chat_message_reads (
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  group_id uuid REFERENCES chat_groups(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, read_at);
