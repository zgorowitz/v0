-- Dashboard SQL Views
-- This file contains SQL views for revenue analysis and dashboard functionality

-- 1. Date dimension view for pivoting
CREATE OR REPLACE VIEW date_dimension AS
SELECT 
    date_trunc('day', generate_series(
        '2020-01-01'::date,
        CURRENT_DATE + interval '1 year',
        '1 day'::interval
    )) AS date,
    EXTRACT(year FROM date_trunc('day', generate_series(
        '2020-01-01'::date,
        CURRENT_DATE + interval '1 year',
        '1 day'::interval
    ))) AS year,
    EXTRACT(month FROM date_trunc('day', generate_series(
        '2020-01-01'::date,
        CURRENT_DATE + interval '1 year',
        '1 day'::interval
    ))) AS month,
    EXTRACT(day FROM date_trunc('day', generate_series(
        '2020-01-01'::date,
        CURRENT_DATE + interval '1 year',
        '1 day'::interval
    ))) AS day,
    EXTRACT(dow FROM date_trunc('day', generate_series(
        '2020-01-01'::date,
        CURRENT_DATE + interval '1 year',
        '1 day'::interval
    ))) AS day_of_week,
    EXTRACT(week FROM date_trunc('day', generate_series(
        '2020-01-01'::date,
        CURRENT_DATE + interval '1 year',
        '1 day'::interval
    ))) AS week,
    EXTRACT(quarter FROM date_trunc('day', generate_series(
        '2020-01-01'::date,
        CURRENT_DATE + interval '1 year',
        '1 day'::interval
    ))) AS quarter,
    TO_CHAR(date_trunc('day', generate_series(
        '2020-01-01'::date,
        CURRENT_DATE + interval '1 year',
        '1 day'::interval
    )), 'Day') AS day_name,
    TO_CHAR(date_trunc('day', generate_series(
        '2020-01-01'::date,
        CURRENT_DATE + interval '1 year',
        '1 day'::interval
    )), 'Month') AS month_name;


CREATE OR REPLACE VIEW total_sales AS
SELECT 
    ma.organization_id,
    date_trunc('day', b.date_created) as date,
    count(distinct(a.order_id)) as total_orders,
    sum(a.quantity) as total_units,
    sum(a.unit_price) as total_sales,
    sum(a.full_unit_price - a.unit_price) as total_discount,
    sum(a.sale_fee) as total_fee
FROM ml_order_items_v2 a
JOIN ml_orders_v2 b ON a.order_id = b.id
JOIN ml_items_v2 c ON a.item_id = c.item_id
JOIN public.meli_accounts ma ON c.meli_user_id = ma.meli_user_id

WHERE b.fulfilled = 'true' 
    AND b.status = 'paid'
    -- No family_name filter - includes all data
GROUP BY organization_id, date_trunc('day', b.date_created);

-- =====================================================
-- VIEW 2: FAMILY DAILY SUMMARY VIEW  
-- Purpose: Powers the main table rows (parent rows)
-- Usage: GET /api/families?date=2024-01-15&page=1&limit=50
-- =====================================================

CREATE OR REPLACE VIEW family_sales AS
SELECT 
    ma.organization_id,
    c.family_name,
    date_trunc('day', b.date_created) as date,
    count(distinct(a.order_id)) as family_orders,
    sum(a.quantity) as family_units,
    sum(a.unit_price) as family_sales,
    sum(a.full_unit_price - a.unit_price) as family_discount,
    sum(a.sale_fee) as family_fee
FROM ml_order_items_v2 a
JOIN ml_orders_v2 b ON a.order_id = b.id
JOIN ml_items_v2 c ON a.item_id = c.item_id
JOIN public.meli_accounts ma ON c.meli_user_id = ma.meli_user_id
WHERE c.family_name IS NOT NULL
    AND b.fulfilled = 'true'
    AND b.status = 'paid'
GROUP BY ma.organization_id, c.family_name, date_trunc('day', b.date_created);

-- =====================================================
-- VIEW 3: ITEM DAILY SUMMARY VIEW
-- Purpose: Powers the expandable child rows  
-- Usage: GET /api/families/{family_name}/items?date=2024-01-15
-- =====================================================

CREATE OR REPLACE VIEW item_sales AS
SELECT 
    ma.organization_id,
    c.family_name,
    c.item_id,
    -- Add any other item metadata you need
    date_trunc('day', b.date_created) as date,
    count(distinct(a.order_id)) as item_orders,
    sum(a.quantity) as item_units,
    sum(a.unit_price) as item_sales,
    sum(a.full_unit_price - a.unit_price) as item_discount,
    sum(a.sale_fee) as item_fee
FROM ml_order_items_v2 a
JOIN ml_orders_v2 b ON a.order_id = b.id
JOIN ml_items_v2 c ON a.item_id = c.item_id
JOIN public.meli_accounts ma ON c.meli_user_id = ma.meli_user_id
WHERE c.family_name IS NOT NULL
    AND b.fulfilled = 'true'
    AND b.status = 'paid'
GROUP BY ma.organization_id, c.family_name, c.item_id, date_trunc('day', b.date_created);
