-- Add policy to allow workers to complete jobs they accepted
CREATE POLICY "Workers can complete their accepted jobs" 
ON job_requests FOR UPDATE
USING (
  status = 'accepted'::job_status 
  AND accepted_by IN (
    SELECT id FROM worker_profiles WHERE user_id = auth.uid()
  )
  AND has_role(auth.uid(), 'worker'::app_role)
);