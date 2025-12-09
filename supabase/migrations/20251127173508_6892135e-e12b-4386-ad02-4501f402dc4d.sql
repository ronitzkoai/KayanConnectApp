-- Create a global conversation for all users
INSERT INTO conversations (id, created_at, updated_at, last_message_at)
VALUES ('00000000-0000-0000-0000-000000000001', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Function to add new users to global conversation
CREATE OR REPLACE FUNCTION add_user_to_global_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add user to global conversation
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-add users to global chat when profile is created
CREATE TRIGGER on_profile_created_add_to_global_chat
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION add_user_to_global_chat();

-- Add all existing users to global conversation
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT '00000000-0000-0000-0000-000000000001', id
FROM profiles
ON CONFLICT (conversation_id, user_id) DO NOTHING;