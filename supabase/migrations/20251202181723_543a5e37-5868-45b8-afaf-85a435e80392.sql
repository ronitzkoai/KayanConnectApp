-- Fix conversation_participants RLS policy that causes infinite recursion
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

-- Create a new policy that doesn't cause recursion
CREATE POLICY "Users can view participants in their conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (user_id = auth.uid() OR conversation_id IN (
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
));

-- Clean up duplicate user roles (keep the first one created)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.id > b.id
  AND a.user_id = b.user_id;