-- Add service_type enum
CREATE TYPE service_type AS ENUM ('operator_with_equipment', 'equipment_only', 'operator_only');

-- Add service_type column to job_requests
ALTER TABLE job_requests 
ADD COLUMN service_type service_type DEFAULT 'operator_with_equipment' NOT NULL;