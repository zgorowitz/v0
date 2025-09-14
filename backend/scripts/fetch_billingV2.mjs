import { createClient } from '../lib/supabase/script-client.js'
import { apiRequest } from '../lib/scripts/utils.js'

async function getTokens() {
  const supabase = createClient()
  const { data } = await supabase
    .from('meli_tokens')
    .select('meli_user_id, access_token')
  return data || []
}

function parseBillingDetail(detail, meliUserId) {
  return {
    meli_user_id: meliUserId,
    detail_id: detail.charge_info?.detail_id,
    legal_document_number: detail.charge_info?.legal_document_number,
    legal_document_status: detail.charge_info?.legal_document_status,
    legal_document_status_description: detail.charge_info?.legal_document_status_description,
    creation_date_time: detail.charge_info?.creation_date_time,
    detail_amount: detail.charge_info?.detail_amount,
    transaction_detail: detail.charge_info?.transaction_detail,
    debited_from_operation: detail.charge_info?.debited_from_operation,
    debited_from_operation_description: detail.charge_info?.debited_from_operation_description,
    status: detail.charge_info?.status,
    status_description: detail.charge_info?.status_description,
    charge_bonified_id: detail.charge_info?.charge_bonified_id,
    detail_type: detail.charge_info?.detail_type,
    detail_sub_type: detail.charge_info?.detail_sub_type,
    concept_type: detail.charge_info?.concept_type,
    charge_amount_without_discount: detail.discount_info?.charge_amount_without_discount,
    discount_amount: detail.discount_info?.discount_amount,
    discount_reason: detail.discount_info?.discount_reason,
    sales_info: JSON.stringify(detail.sales_info || []),
    shipping_id: detail.shipping_info?.shipping_id,
    pack_id: detail.shipping_info?.pack_id,
    receiver_shipping_cost: detail.shipping_info?.receiver_shipping_cost,
    items_info: JSON.stringify(detail.items_info || []),
    document_id: detail.document_info?.document_id,
    marketplace: detail.marketplace_info?.marketplace,
    currency_id: detail.currency_info?.currency_id,
    raw_response: JSON.stringify(detail)
  }
}

async function fetchBillingDetails() {
  const supabase = createClient()
  const tokens = await getTokens()
  
  for (const { meli_user_id, access_token } of tokens) {
    console.log(`Fetching billing details for user ${meli_user_id}`)
    
    try {
      const response = await apiRequest(
        `https://api.mercadolibre.com/billing/integration/periods/key/2025-06-01/group/ML/details?document_type=BILL&limit=1`,
        access_token
      )
      
      if (response?.results) {
        console.log(`Found ${response.results.length} billing details for user ${meli_user_id}`)
        
        for (const detail of response.results) {
          await supabase
            .from('ml_billing_details_v2')
            .upsert(parseBillingDetail(detail, meli_user_id))
        }
      }
    } catch (error) {
      console.error(`Error fetching billing details for user ${meli_user_id}:`, error)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchBillingDetails().catch(console.error)
}