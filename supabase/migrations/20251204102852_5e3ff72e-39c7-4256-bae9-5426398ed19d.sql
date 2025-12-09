-- Add new work types to the enum
ALTER TYPE work_type ADD VALUE IF NOT EXISTS 'mini_excavator';
ALTER TYPE work_type ADD VALUE IF NOT EXISTS 'excavator';
ALTER TYPE work_type ADD VALUE IF NOT EXISTS 'mini_backhoe';
ALTER TYPE work_type ADD VALUE IF NOT EXISTS 'wheeled_backhoe';
ALTER TYPE work_type ADD VALUE IF NOT EXISTS 'telescopic_loader';
ALTER TYPE work_type ADD VALUE IF NOT EXISTS 'full_trailer';
ALTER TYPE work_type ADD VALUE IF NOT EXISTS 'bathtub';
ALTER TYPE work_type ADD VALUE IF NOT EXISTS 'double';
ALTER TYPE work_type ADD VALUE IF NOT EXISTS 'flatbed';