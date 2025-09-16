# Database Schema Documentation
## MercadoLibre Multi-Seller Platform

### System Overview
Multi-seller e-commerce platform integrating with MercadoLibre APIs. Each organization represents a different seller with their MercadoLibre accounts, providing warehouse management tools and analytics dashboards.

---

## 1. USER & ORGANIZATION MANAGEMENT

### `organizations`
Core organization/seller entities
```sql
id                    uuid PRIMARY KEY
created_at           timestamp with time zone
admin_user_id        uuid → auth.users(id)
default_meli_user_id bigint
```

### `organization_users`
User membership in organizations
```sql
id                    uuid PRIMARY KEY
organization_id       uuid → organizations(id)
user_id              uuid UNIQUE → auth.users(id)
role                 user_role (manager, etc.)
invited_at           timestamp with time zone
joined_at            timestamp with time zone
invited_by           uuid → auth.users(id)
current_meli_user_id bigint
```

### `allowed_emails`
Email whitelist for organization access
```sql
id              uuid PRIMARY KEY
organization_id uuid → organizations(id)
email           text UNIQUE
role            user_role (default: manager)
added_by        uuid → auth.users(id)
added_at        timestamp with time zone
```

---

## 2. MERCADOLIBRE AUTHENTICATION & ACCOUNTS

### `meli_tokens`
OAuth tokens for MercadoLibre API access
```sql
organization_id uuid → organizations(id)
meli_user_id    bigint PRIMARY KEY
access_token    text
refresh_token   text
token_type      text (default: Bearer)
expires_at      bigint
updated_at      timestamp with time zone
is_default      boolean
```

### `meli_accounts`
MercadoLibre account details
```sql
id                   uuid PRIMARY KEY
organization_id      uuid → organizations(id)
meli_user_id        bigint
nickname            text
permalink           text
thumbnail_url       text
first_name          text
last_name           text
country_id          text
site_id             text
user_type           text
seller_level_id     text
power_seller_status text
created_at          timestamp with time zone
```

---

## 3. PRODUCT CATALOG MANAGEMENT

### `meli_categories`
MercadoLibre category hierarchy
```sql
category_id         varchar PRIMARY KEY
name               varchar
parent_category_id varchar → meli_categories(category_id)
total_items        integer (default: 0)
created_at         timestamp with time zone
level              integer (hierarchy depth)
```

### `meli_attributes`
Category-specific attributes
```sql
category_id              varchar → meli_categories(category_id)
attribute_id            varchar
attribute_name          varchar
is_required             boolean
is_catalog_required     boolean
is_conditional_required boolean
is_variation_attribute  boolean
allows_variations       boolean
is_hidden              boolean
is_multivalued         boolean
value_type             varchar (string|number|boolean|list|number_unit)
hierarchy              varchar
PRIMARY KEY (category_id, attribute_id)
```

---

## 4. PRODUCT ITEMS

### V1 Tables (Legacy/MVP)

#### `meli_items`
Basic item information
```sql
id                 varchar PRIMARY KEY
meli_user_id      bigint → meli_tokens(meli_user_id)
title             text
category_id       varchar → meli_categories(category_id)
price             numeric
condition         varchar
available_quantity integer
sold_quantity     integer
thumbnail         varchar
permalink         varchar
listing_type      varchar
status            varchar
created_at        timestamp with time zone
updated_at        timestamp with time zone
family_name       text
user_product_id   varchar
```

#### `meli_variations`
Product variations
```sql
id                 integer PRIMARY KEY
item_id           varchar → meli_items(id)
variation_id      varchar
price             numeric
available_quantity integer
sold_quantity     integer
picture_url       varchar
attributes        jsonb
created_at        timestamp with time zone
updated_at        timestamp with time zone
seller_sku        text
user_product_id   varchar UNIQUE
```

### V2 Tables (Current Implementation)

#### `ml_items_v2`
Comprehensive item data
```sql
item_id                      text PRIMARY KEY
user_product_id             text
site_id                     text
title                       text
subtitle                    text
seller_id                   bigint
category_id                 text
official_store_id           bigint
price                       numeric
base_price                  numeric
original_price              numeric
inventory_id                text
currency_id                 text
initial_quantity            integer
available_quantity          integer
sold_quantity               integer
sale_terms                  jsonb
buying_mode                 text
listing_type_id             text
start_time                  timestamp without time zone
stop_time                   timestamp without time zone
end_time                    timestamp without time zone
expiration_time             timestamp without time zone
condition                   text
permalink                   text
thumbnail_id                text
thumbnail                   text
secure_thumbnail            text
pictures                    jsonb
video_id                    text
descriptions                jsonb
accepts_mercadopago         boolean
non_mercado_pago_payment_methods jsonb
shipping                    jsonb
international_delivery_mode text
seller_address              jsonb
seller_contact              jsonb
location                    jsonb
geolocation                 jsonb
coverage_areas              jsonb
attributes                  jsonb
warnings                    jsonb
listing_source              text
variations                  jsonb
status                      text
sub_status                  jsonb
tags                        jsonb
warranty                    text
catalog_product_id          text
domain_id                   text
seller_custom_field         text
parent_item_id              text
differential_pricing        jsonb
deal_ids                    jsonb
automatic_relist            boolean
date_created                timestamp without time zone
last_updated                timestamp without time zone
health                      text
catalog_listing             boolean
item_relations              jsonb
channels                    jsonb
meli_user_id               bigint
family_name                text
```

---

## 5. ORDER MANAGEMENT

### V1 Tables (Legacy)

#### `meli_orders`
Order information
```sql
id                        bigint PRIMARY KEY
meli_user_id             bigint → meli_tokens(meli_user_id)
status                   varchar
status_detail           varchar
buying_mode              varchar
fulfilled                boolean
total_amount             numeric
paid_amount              numeric
shipping_cost            numeric
currency_id              varchar
buyer_id                 bigint
seller_id                bigint
date_created             timestamp with time zone
date_closed              timestamp with time zone
date_last_updated        timestamp with time zone
payments                 jsonb
shipping_id              bigint
shipping                 jsonb
feedback                 jsonb
mediations               jsonb
coupon                   jsonb
taxes                    jsonb
tags                     text[]
comments                 text
pack_id                  bigint
created_at               timestamp with time zone
updated_at               timestamp with time zone
order_request            jsonb
manufacturing_ending_date timestamp with time zone
last_updated             timestamp with time zone
```

#### `meli_order_items`
Order line items
```sql
id                        integer PRIMARY KEY
order_id                 bigint → meli_orders(id)
item_id                  varchar
variation_id             varchar
quantity                 integer
unit_price               numeric
full_unit_price          numeric
sale_fee                 numeric
currency_id              varchar
listing_type_id          varchar
warranty                 text
manufacturing_days       integer
variation_attributes     jsonb
created_at               timestamp with time zone
updated_at               timestamp with time zone
seller_custom_field      text
condition                varchar
category_id              varchar
title                    text
seller_sku               text
differential_pricing_id  bigint
base_currency_id         varchar
base_exchange_rate       numeric
```

### V2 Tables (Current Implementation)

#### `ml_orders_v2`
Enhanced order structure
```sql
id                       bigint PRIMARY KEY
meli_user_id            bigint
date_created            timestamp with time zone
last_updated            timestamp with time zone
date_closed             timestamp with time zone
pack_id                 bigint
fulfilled               boolean
buying_mode             text
shipping_cost           numeric
total_amount            numeric
paid_amount             numeric
currency_id             text
status                  text
status_detail           text
manufacturing_ending_date timestamp with time zone
mediations              jsonb
shipping                numeric
tags                    jsonb
internal_tags           jsonb
static_tags             jsonb
feedback                jsonb
context                 jsonb
buyer                   jsonb
taxes                   jsonb
cancel_detail           jsonb
order_request           jsonb
created_at              timestamp with time zone
updated_at              timestamp with time zone
```

#### `ml_order_items_v2`
Enhanced order items
```sql
id                          bigint PRIMARY KEY
order_id                   bigint → ml_orders_v2(id)
meli_user_id              bigint
item_id                   text
title                     text
category_id               text
variation_id              text
seller_custom_field       text
warranty                  text
condition                 text
seller_sku                text
global_price              numeric
net_weight                numeric
user_product_id           text
release_date              timestamp with time zone
quantity                  integer
picked_quantity           integer
unit_price                numeric
full_unit_price           numeric
full_unit_price_currency_id text
currency_id               text
manufacturing_days        integer
sale_fee                  numeric
listing_type_id           text
base_exchange_rate        numeric
base_currency_id          text
element_id                text
compat_id                 text
kit_instance_id           text
variation_attributes      jsonb
requested_quantity        jsonb
discounts                 jsonb
bundle                    jsonb
stock                     jsonb
created_at                timestamp with time zone
updated_at                timestamp with time zone
```

#### `ml_order_payments_v2`
Payment details
```sql
id                          bigint PRIMARY KEY
order_id                   bigint → ml_orders_v2(id)
meli_user_id              bigint
reason                    text
status                    varchar
card_id                   varchar
site_id                   varchar
payer_id                  bigint
collector_id              bigint
coupon_id                 varchar
issuer_id                 varchar
currency_id               varchar
status_code               varchar
date_created              timestamp with time zone
installments              integer
payment_type              varchar
taxes_amount              numeric
coupon_amount             numeric
date_approved             timestamp with time zone
shipping_cost             numeric
status_detail             varchar
activation_uri            text
operation_type            varchar
deferred_period           varchar
overpaid_amount           numeric
available_actions         jsonb
payment_method_id         varchar
total_paid_amount         numeric
authorization_code        varchar
date_last_modified        timestamp with time zone
installment_amount        numeric
transaction_amount        numeric
transaction_order_id      varchar
atm_transfer_reference    jsonb
transaction_amount_refunded numeric
created_at                timestamp with time zone
```

---

## 6. WAREHOUSE OPERATIONS

### `meli_shipment_status`
Shipment tracking
```sql
id                          bigint PRIMARY KEY
status                     text
substatus                  text
tracking_number            text
tracking_method            text
date_created               timestamp with time zone
last_updated               timestamp with time zone
declared_value             numeric
logistic_mode              text
logistic_type              text
logistic_direction         text
priority_class_id          text
origin_node                text
origin_sender_id           bigint
origin_type                text
origin_address             jsonb
destination_receiver_id    bigint
destination_receiver_name  text
destination_receiver_phone text
destination_type           text
destination_address        jsonb
source_site_id             text
source_market_place        text
tags                       jsonb
items_types                jsonb
lead_time                  jsonb
dimensions                 jsonb
snapshot_packing           jsonb
sibling                    jsonb
external_reference         text
quotation                  jsonb
created_at                 timestamp with time zone
updated_at                 timestamp with time zone
meli_user_id              bigint → meli_tokens(meli_user_id)
```

### `shipment_packing`
Packing process tracking
```sql
id                uuid PRIMARY KEY
shipment_id       bigint UNIQUE
packed_by_user_id uuid → auth.users(id)
packed_by_name    text
packed_by_email   text
created_at        timestamp with time zone
```

### `scan_sessions`
Label scanning sessions
```sql
id           uuid PRIMARY KEY
shipment_id  bigint
user_id      uuid → auth.users(id)
name         text
email        text
created_at   timestamp with time zone
```

---

## 7. ANALYTICS & REPORTING

### `ml_item_visits_v2`
Item visit analytics
```sql
item_id       text
date_from     timestamp without time zone
date_to       timestamp without time zone
total_visits  integer
visits_detail jsonb
meli_user_id  bigint
created_at    timestamp without time zone
PRIMARY KEY (date_to, item_id, date_from)
```

### `ml_billing_details_v2`
Billing and fee information
```sql
id                                   bigint PRIMARY KEY
meli_user_id                        bigint
detail_id                           bigint
legal_document_number               varchar
legal_document_status               varchar
legal_document_status_description   text
creation_date_time                  timestamp with time zone
detail_amount                       numeric
transaction_detail                  text
debited_from_operation              varchar
debited_from_operation_description  varchar
status                              varchar
status_description                  text
charge_bonified_id                  bigint
detail_type                         varchar
detail_sub_type                     varchar
concept_type                        varchar
charge_amount_without_discount      numeric
discount_amount                     numeric
discount_reason                     text
sales_info                          jsonb
shipping_id                         varchar
pack_id                             varchar
receiver_shipping_cost              numeric
items_info                          jsonb
document_id                         bigint
marketplace                         varchar
currency_id                         varchar
raw_response                        jsonb
created_at                          timestamp with time zone
updated_at                          timestamp with time zone
```

### `meli_order_notes`
Order communication logs
```sql
id                 text PRIMARY KEY
order_id           bigint → meli_orders(id)
meli_user_id      bigint
note              text
date_created      timestamp with time zone
date_last_updated timestamp with time zone
```

---

## 8. CUSTOM BUSINESS DATA

### `cogs`
Cost of Goods Sold tracking
```sql
item_id           text PRIMARY KEY
title             text
thumbnail         text
meli_user_id     bigint
organization_id   uuid
available_quantity integer
status            text
permalink         text
price             numeric
currency_id       text
cogs              numeric
tags              text[]
notes             text
```

### `filter_items`
Filtered item management
```sql
item_id       text
title         text
organization_id uuid
thumbnail     text
```

---

## 9. ADVERTISING (Partial Implementation)

### `meli_advertisers`
Advertising account information
```sql
advertiser_id bigint PRIMARY KEY
name          varchar
account_name  varchar
site_id       varchar
meli_user_id  varchar
```

---

## Data Types Reference

### Custom Types
- `user_role`: Enum for user permissions (manager, etc.)

### Common Patterns
- **Timestamps**: Most tables use `timestamp with time zone` for consistency
- **IDs**: Mix of `uuid` (internal) and `bigint` (MercadoLibre IDs)
- **JSON Storage**: `jsonb` for flexible API response data
- **Soft References**: Some foreign keys reference external APIs (no constraints)

### Indexing Considerations
- Primary keys automatically indexed
- Foreign key columns should be indexed
- Timestamp columns for date range queries
- Text columns for search functionality