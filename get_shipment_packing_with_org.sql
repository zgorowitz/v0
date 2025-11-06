-- RPC function to get shipment packing data with organization filtering
-- This joins shipment_packing with organization_users to filter by organization_id

CREATE OR REPLACE FUNCTION get_shipment_packing_with_org(
  p_organization_id UUID,
  p_shipment_id TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  shipment_id TEXT,
  packed_by_name TEXT,
  packed_by_email TEXT,
  created_at DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.shipment_id::TEXT,
    sp.packed_by_name,
    sp.packed_by_email,
    sp.created_at::DATE
  FROM shipment_packing sp
  JOIN organization_users ou ON sp.packed_by_user_id = ou.user_id
  WHERE
    ou.organization_id = p_organization_id
    AND (p_shipment_id IS NULL OR sp.shipment_id::TEXT = p_shipment_id)
    AND (
      p_date_from IS NULL
      OR p_date_to IS NULL
      OR (sp.created_at::DATE >= p_date_from AND sp.created_at::DATE <= p_date_to)
    )
  ORDER BY sp.created_at DESC;
END;
$$;
