-- Create unified table for item COGS and tags management
-- Run this SQL in your Supabase SQL editor

-- Drop existing objects if they exist (for clean setup)
DROP TABLE IF EXISTS cogs CASCADE;

-- Create the unified table by selecting from ml_items_v2 and joining with meli_accounts
CREATE TABLE cogs AS
SELECT
    mi.item_id,
    mi.title,
    mi.thumbnail,
    mi.meli_user_id,
    ma.organization_id,  -- from meli_accounts join

    -- Additional ML item fields
    mi.available_quantity,
    mi.status,
    mi.permalink,
    mi.price,
    mi.currency_id,

    -- COGS management fields (default values)
    0::DECIMAL(10,2) as cogs,
    ARRAY[]::TEXT[] as tags,
    ''::TEXT as notes

FROM ml_items_v2 mi
JOIN meli_accounts ma ON mi.meli_user_id = ma.meli_user_id;

-- Add constraints and indexes after creation
ALTER TABLE cogs
    ADD PRIMARY KEY (item_id),
    ADD CONSTRAINT unique_org_item UNIQUE(organization_id, item_id),
    ALTER COLUMN organization_id SET NOT NULL,
    ALTER COLUMN item_id SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX idx_cogs_org_id ON cogs(organization_id);
CREATE INDEX idx_cogs_item_id ON cogs(item_id);
CREATE INDEX idx_cogs_tags ON cogs USING GIN(tags);
