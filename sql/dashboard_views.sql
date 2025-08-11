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

-- 2. Revenue per item per day view
CREATE OR REPLACE VIEW revenue_per_item_daily AS
WITH item_revenue AS (
    SELECT 
        oi.item_id,
        oi.seller_sku,
        oi.title as item_title,
        oi.category_id,
        mc.name as category_name,
        DATE(o.date_created) as order_date,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.unit_price * oi.quantity) as gross_revenue,
        SUM(oi.sale_fee) as total_fees,
        SUM(oi.unit_price * oi.quantity - oi.sale_fee) as net_revenue,
        COUNT(DISTINCT o.id) as order_count,
        AVG(oi.unit_price) as avg_unit_price,
        o.meli_user_id,
        ma.nickname as account_name,
        mt.organization_id
    FROM meli_order_items oi
    JOIN meli_orders o ON oi.order_id = o.id
    LEFT JOIN meli_categories mc ON oi.category_id = mc.category_id
    LEFT JOIN meli_accounts ma ON o.meli_user_id = ma.meli_user_id
    LEFT JOIN meli_tokens mt ON o.meli_user_id = mt.meli_user_id
    WHERE o.status IN ('paid', 'shipped', 'delivered')
        AND o.date_created IS NOT NULL
    GROUP BY 
        oi.item_id, 
        oi.seller_sku, 
        oi.title, 
        oi.category_id, 
        mc.name,
        DATE(o.date_created),
        o.meli_user_id,
        ma.nickname,
        mt.organization_id
)
SELECT 
    ir.*,
    CASE 
        WHEN ir.gross_revenue > 0 
        THEN ROUND((ir.total_fees / ir.gross_revenue) * 100, 2)
        ELSE 0 
    END as fee_percentage,
    CASE 
        WHEN ir.total_quantity > 0 
        THEN ROUND(ir.gross_revenue / ir.total_quantity, 2)
        ELSE 0 
    END as revenue_per_unit
FROM item_revenue ir
ORDER BY ir.order_date DESC, ir.gross_revenue DESC;

-- 3. Revenue per category per day view
CREATE OR REPLACE VIEW revenue_per_category_daily AS
WITH category_revenue AS (
    SELECT 
        COALESCE(oi.category_id, 'UNKNOWN') as category_id,
        COALESCE(mc.name, 'Unknown Category') as category_name,
        DATE(o.date_created) as order_date,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.unit_price * oi.quantity) as gross_revenue,
        SUM(oi.sale_fee) as total_fees,
        SUM(oi.unit_price * oi.quantity - oi.sale_fee) as net_revenue,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT oi.item_id) as unique_items,
        AVG(oi.unit_price) as avg_unit_price,
        o.meli_user_id,
        ma.nickname as account_name,
        mt.organization_id
    FROM meli_order_items oi
    JOIN meli_orders o ON oi.order_id = o.id
    LEFT JOIN meli_categories mc ON oi.category_id = mc.category_id
    LEFT JOIN meli_accounts ma ON o.meli_user_id = ma.meli_user_id
    LEFT JOIN meli_tokens mt ON o.meli_user_id = mt.meli_user_id
    WHERE o.status IN ('paid', 'shipped', 'delivered')
        AND o.date_created IS NOT NULL
    GROUP BY 
        COALESCE(oi.category_id, 'UNKNOWN'),
        COALESCE(mc.name, 'Unknown Category'),
        DATE(o.date_created),
        o.meli_user_id,
        ma.nickname,
        mt.organization_id
)
SELECT 
    cr.*,
    CASE 
        WHEN cr.gross_revenue > 0 
        THEN ROUND((cr.total_fees / cr.gross_revenue) * 100, 2)
        ELSE 0 
    END as fee_percentage,
    CASE 
        WHEN cr.total_quantity > 0 
        THEN ROUND(cr.gross_revenue / cr.total_quantity, 2)
        ELSE 0 
    END as revenue_per_unit,
    CASE 
        WHEN cr.unique_items > 0 
        THEN ROUND(cr.gross_revenue / cr.unique_items, 2)
        ELSE 0 
    END as revenue_per_item
FROM category_revenue cr
ORDER BY cr.order_date DESC, cr.gross_revenue DESC;

-- 4. Dashboard summary view - Category performance with date aggregations
CREATE OR REPLACE VIEW dashboard_category_summary AS
SELECT 
    rcd.category_id,
    rcd.category_name,
    rcd.organization_id,
    rcd.account_name,
    
    -- Current period (last 30 days)
    SUM(CASE 
        WHEN rcd.order_date >= CURRENT_DATE - INTERVAL '30 days' 
        THEN rcd.gross_revenue 
        ELSE 0 
    END) as revenue_last_30_days,
    
    SUM(CASE 
        WHEN rcd.order_date >= CURRENT_DATE - INTERVAL '30 days' 
        THEN rcd.total_quantity 
        ELSE 0 
    END) as quantity_last_30_days,
    
    -- Previous period (31-60 days ago) for comparison
    SUM(CASE 
        WHEN rcd.order_date >= CURRENT_DATE - INTERVAL '60 days' 
        AND rcd.order_date < CURRENT_DATE - INTERVAL '30 days'
        THEN rcd.gross_revenue 
        ELSE 0 
    END) as revenue_prev_30_days,
    
    -- This week
    SUM(CASE 
        WHEN rcd.order_date >= date_trunc('week', CURRENT_DATE) 
        THEN rcd.gross_revenue 
        ELSE 0 
    END) as revenue_this_week,
    
    -- This month
    SUM(CASE 
        WHEN rcd.order_date >= date_trunc('month', CURRENT_DATE) 
        THEN rcd.gross_revenue 
        ELSE 0 
    END) as revenue_this_month,
    
    -- All time totals
    SUM(rcd.gross_revenue) as total_revenue,
    SUM(rcd.total_quantity) as total_quantity,
    SUM(rcd.total_fees) as total_fees,
    SUM(rcd.net_revenue) as total_net_revenue,
    
    -- Performance metrics
    AVG(rcd.fee_percentage) as avg_fee_percentage,
    COUNT(DISTINCT rcd.order_date) as active_days,
    MIN(rcd.order_date) as first_sale_date,
    MAX(rcd.order_date) as last_sale_date
    
FROM revenue_per_category_daily rcd
WHERE rcd.order_date >= CURRENT_DATE - INTERVAL '1 year' -- Limit to last year for performance
GROUP BY 
    rcd.category_id,
    rcd.category_name,
    rcd.organization_id,
    rcd.account_name
HAVING SUM(rcd.gross_revenue) > 0 -- Only categories with sales
ORDER BY revenue_last_30_days DESC;

-- 5. Dashboard item summary view
CREATE OR REPLACE VIEW dashboard_item_summary AS
SELECT 
    rid.item_id,
    rid.seller_sku,
    rid.item_title,
    rid.category_id,
    rid.category_name,
    rid.organization_id,
    rid.account_name,
    
    -- Current period (last 30 days)
    SUM(CASE 
        WHEN rid.order_date >= CURRENT_DATE - INTERVAL '30 days' 
        THEN rid.gross_revenue 
        ELSE 0 
    END) as revenue_last_30_days,
    
    SUM(CASE 
        WHEN rid.order_date >= CURRENT_DATE - INTERVAL '30 days' 
        THEN rid.total_quantity 
        ELSE 0 
    END) as quantity_last_30_days,
    
    -- This week
    SUM(CASE 
        WHEN rid.order_date >= date_trunc('week', CURRENT_DATE) 
        THEN rid.gross_revenue 
        ELSE 0 
    END) as revenue_this_week,
    
    -- This month  
    SUM(CASE 
        WHEN rid.order_date >= date_trunc('month', CURRENT_DATE) 
        THEN rid.gross_revenue 
        ELSE 0 
    END) as revenue_this_month,
    
    -- All time totals
    SUM(rid.gross_revenue) as total_revenue,
    SUM(rid.total_quantity) as total_quantity,
    SUM(rid.total_fees) as total_fees,
    SUM(rid.net_revenue) as total_net_revenue,
    
    -- Performance metrics
    AVG(rid.avg_unit_price) as avg_unit_price,
    AVG(rid.fee_percentage) as avg_fee_percentage,
    COUNT(DISTINCT rid.order_date) as active_days,
    MIN(rid.order_date) as first_sale_date,
    MAX(rid.order_date) as last_sale_date
    
FROM revenue_per_item_daily rid
WHERE rid.order_date >= CURRENT_DATE - INTERVAL '1 year' -- Limit to last year for performance
GROUP BY 
    rid.item_id,
    rid.seller_sku,
    rid.item_title,
    rid.category_id,
    rid.category_name,
    rid.organization_id,
    rid.account_name
HAVING SUM(rid.gross_revenue) > 0 -- Only items with sales
ORDER BY revenue_last_30_days DESC;

-- Usage Examples:
-- 
-- Get category performance for last 30 days:
-- SELECT * FROM dashboard_category_summary 
-- WHERE revenue_last_30_days > 0 
-- ORDER BY revenue_last_30_days DESC;
--
-- Get top performing items this month:
-- SELECT * FROM dashboard_item_summary 
-- WHERE revenue_this_month > 0 
-- ORDER BY revenue_this_month DESC 
-- LIMIT 20;
--
-- Get revenue by category for specific date range:
-- SELECT * FROM revenue_per_category_daily 
-- WHERE order_date BETWEEN '2024-01-01' AND '2024-01-31'
-- AND organization_id = 'your-org-id';