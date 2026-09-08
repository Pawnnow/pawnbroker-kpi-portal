// Ported verbatim from PawnMate_KPI_Extractor_v9_9_1.html (categories, thresholds, fallback
// column lists). Do not hand-edit values here without cross-checking the original tool —
// these encode a lot of validated, real-world PawnMate schema knowledge.

// Artifact-value filter: PawnMate writes this sentinel into inventory_value running-balance
// fields during outage/overflow events. Any value at or above this is discarded, not summed.
export const PLACEHOLDER_THRESHOLD = 99000000;

// ─── PRODUCT CATEGORY MAP ────────────────────────────────────────────────────
export const NAME_TO_CAT: Record<string, string> = {
  'jewelry':'JEWELRY','jewellery':'JEWELRY','jewelry and watches':'JEWELRY',
  'fine jewelry':'JEWELRY','gold and silver':'JEWELRY','gold & silver':'JEWELRY',
  'jewelry scrap':'JEWELRY_SCRAP','jewellery scrap':'JEWELRY_SCRAP','scrap jewelry':'JEWELRY_SCRAP',
  'scrap jewellery':'JEWELRY_SCRAP','scrap':'JEWELRY_SCRAP',
  'firearms':'FIREARMS','guns':'FIREARMS','firearm':'FIREARMS',
  'guns and ammo':'FIREARMS','guns & ammo':'FIREARMS',
  'electronics':'ELECTRONICS','electronic':'ELECTRONICS',
  'cell phones':'CELL_PHONES','cell phone':'CELL_PHONES','phones':'CELL_PHONES',
  'mobile phones':'CELL_PHONES','smartphones':'CELL_PHONES','smart phones':'CELL_PHONES',
  'computers':'COMPUTERS','computer':'COMPUTERS','computers and tablets':'COMPUTERS',
  'computers & tablets':'COMPUTERS','laptops':'COMPUTERS',
  'coins':'COINS','coin':'COINS','coins and currency':'COINS','coins & currency':'COINS',
  'currency':'COINS','numismatics':'COINS',
  'tools':'TOOLS','tool':'TOOLS','power tools':'TOOLS','hand tools':'TOOLS',
  'music gear':'MUSIC_GEAR','musical instruments':'MUSIC_GEAR','instruments':'MUSIC_GEAR',
  'music instruments':'MUSIC_GEAR','music':'MUSIC_GEAR',
  'games':'GAMES','game':'GAMES','board games':'GAMES',
  'gaming consoles':'GAMING_CONSOLES','gaming console':'GAMING_CONSOLES',
  'video games':'GAMING_CONSOLES','video game':'GAMING_CONSOLES',
  'gaming':'GAMING_CONSOLES','game consoles':'GAMING_CONSOLES',
  'sporting goods':'SPORTING_GOODS','sporting good':'SPORTING_GOODS','sports':'SPORTING_GOODS',
  'sports equipment':'SPORTING_GOODS',
  'collectibles':'COLLECTIBLES','collectible':'COLLECTIBLES','memorabilia':'COLLECTIBLES',
  'watches':'WATCHES','watch':'WATCHES','timepieces':'WATCHES',
  'camera optics':'CAMERA_OPTICS','cameras':'CAMERA_OPTICS','camera':'CAMERA_OPTICS',
  'cameras and optics':'CAMERA_OPTICS','cameras & optics':'CAMERA_OPTICS','optics':'CAMERA_OPTICS',
  'apparel':'APPAREL','clothing':'APPAREL','clothes':'APPAREL',
  'appliances':'APPLIANCES','appliance':'APPLIANCES','small appliances':'APPLIANCES',
  'house wares':'HOUSE_WARES','housewares':'HOUSE_WARES','home goods':'HOUSE_WARES',
  'household':'HOUSE_WARES','household items':'HOUSE_WARES',
  'lawn garden':'LAWN_GARDEN','lawn and garden':'LAWN_GARDEN','lawn & garden':'LAWN_GARDEN',
  'movies music':'MOVIES_MUSIC','movies and music':'MOVIES_MUSIC','movies & music':'MOVIES_MUSIC',
  'media':'MOVIES_MUSIC','dvd':'MOVIES_MUSIC','movies':'MOVIES_MUSIC',
  'bicycles':'BICYCLES','bicycle':'BICYCLES','bikes':'BICYCLES','bike':'BICYCLES',
  'automotive':'AUTOMOTIVE','auto':'AUTOMOTIVE','auto parts':'AUTOMOTIVE',
  'vehicles':'VEHICLES','vehicle':'VEHICLES','cars':'VEHICLES','motorcycles':'VEHICLES',
  'outdoor equipment':'LAWN_GARDEN','outdoor':'LAWN_GARDEN',
  'toys collectables':'TOYS_COLLECTABLES','toys and collectables':'TOYS_COLLECTABLES',
  'toys & collectables':'TOYS_COLLECTABLES','toys':'TOYS_COLLECTABLES',
  'drone':'DRONE','drones':'DRONE',
  'marine equipment':'MARINE_EQUIPMENT','marine':'MARINE_EQUIPMENT',
  'metal detector':'METAL_DETECTOR','metal detectors':'METAL_DETECTOR',
  'firearms accessories':'FIREARMS_ACCESSORIES','firearm accessories':'FIREARMS_ACCESSORIES',
  'gun accessories':'FIREARMS_ACCESSORIES',
  'gaming accessories':'GAMING_ACCESSORIES','game accessories':'GAMING_ACCESSORIES',
  'furniture':'FURNITURE',
  'personal care':'PERSONAL_CARE',
  'office equipment':'OFFICE_EQUIPMENT',
  'art':'ART','arts':'ART','fine art':'ART',
  'antiques':'ANTIQUES','antique':'ANTIQUES',
  'jewelry non precious metals':'JEWELRY','jewellery non precious metals':'JEWELRY',
  'non precious metals':'JEWELRY','precious metals':'JEWELRY',
  'cellphone repair':'OTHER','cell phone repair':'OTHER','phone repair':'OTHER',
  'child accessory':'OTHER','child accessories':'OTHER',
};

export const CHILD_OVERRIDES: Record<number, string> = {
  1076:'DRONE',1017:'ART',1046:'TOYS_COLLECTABLES',
  1488:'FIREARMS_ACCESSORIES',1489:'FIREARMS_ACCESSORIES',1490:'FIREARMS_ACCESSORIES',
  1491:'FIREARMS_ACCESSORIES',1492:'FIREARMS_ACCESSORIES',1493:'FIREARMS_ACCESSORIES',
  1494:'FIREARMS_ACCESSORIES',1495:'FIREARMS_ACCESSORIES',1496:'FIREARMS_ACCESSORIES',
  1497:'FIREARMS_ACCESSORIES',1498:'FIREARMS_ACCESSORIES',1499:'FIREARMS_ACCESSORIES',
  1500:'FIREARMS_ACCESSORIES',1501:'FIREARMS_ACCESSORIES',1502:'FIREARMS_ACCESSORIES',
  1503:'FIREARMS_ACCESSORIES',1504:'FIREARMS_ACCESSORIES',1505:'FIREARMS_ACCESSORIES',
  1506:'FIREARMS_ACCESSORIES',1520:'FIREARMS_ACCESSORIES',1521:'FIREARMS_ACCESSORIES',
  1522:'FIREARMS_ACCESSORIES',1523:'FIREARMS_ACCESSORIES',1524:'FIREARMS_ACCESSORIES',
  1525:'FIREARMS_ACCESSORIES',1526:'FIREARMS_ACCESSORIES',1527:'FIREARMS_ACCESSORIES',
  1528:'FIREARMS_ACCESSORIES',1529:'FIREARMS_ACCESSORIES',
  1470:'MARINE_EQUIPMENT',1471:'MARINE_EQUIPMENT',1472:'MARINE_EQUIPMENT',
  1473:'MARINE_EQUIPMENT',1474:'MARINE_EQUIPMENT',1475:'MARINE_EQUIPMENT',
  1476:'MARINE_EQUIPMENT',1477:'MARINE_EQUIPMENT',1478:'MARINE_EQUIPMENT',
  1517:'METAL_DETECTOR',
  1121:'GAMING_ACCESSORIES',1122:'GAMING_ACCESSORIES',1123:'GAMING_ACCESSORIES',
  1124:'GAMING_ACCESSORIES',1125:'GAMING_ACCESSORIES',1126:'GAMING_ACCESSORIES',
  1127:'GAMING_ACCESSORIES',1128:'GAMING_ACCESSORIES',1129:'GAMING_ACCESSORIES',
  1130:'GAMING_ACCESSORIES',1131:'GAMING_ACCESSORIES',1132:'GAMING_ACCESSORIES',
  2046:'GAMING_ACCESSORIES',2048:'GAMING_ACCESSORIES',2205:'GAMING_ACCESSORIES',
  2279:'GAMING_ACCESSORIES',
  2124:'WATCHES',2125:'WATCHES',
  1023:'ANTIQUES',1030:'ANTIQUES',1028:'ANTIQUES',1018:'ANTIQUES',
  2235:'FURNITURE',2221:'FURNITURE',2258:'FURNITURE',2325:'FURNITURE',2326:'FURNITURE',
  1011:'PERSONAL_CARE',2250:'PERSONAL_CARE',
  38:'OFFICE_EQUIPMENT',39:'OFFICE_EQUIPMENT',
};

export function normalizeCatName(name: string | null | undefined): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export const CATEGORIES_ORDERED = [
  'ART','ANTIQUES','APPAREL','APPLIANCES','AUTOMOTIVE','BICYCLES','CAMERA_OPTICS',
  'CELL_PHONES','COINS','COLLECTIBLES','COMPUTERS','DRONE','ELECTRONICS','FIREARMS',
  'FIREARMS_ACCESSORIES','FURNITURE','GAMES','GAMING_ACCESSORIES','GAMING_CONSOLES',
  'HOUSE_WARES','JEWELRY','JEWELRY_SCRAP','LAWN_GARDEN','MARINE_EQUIPMENT',
  'METAL_DETECTOR','MOVIES_MUSIC','MUSIC_GEAR','OFFICE_EQUIPMENT','OTHER',
  'PERSONAL_CARE','SPORTING_GOODS','TOOLS','TOYS_COLLECTABLES','VEHICLES','WATCHES','TOTAL'
];

// ─── FALLBACK TABLE SCHEMAS ──────────────────────────────────────────────────
// Used only if a table's own .sql schema file is missing or fails to parse from
// the backup. Live .sql-derived schemas always take precedence (see schemaLoader.ts).
export const FALLBACK_PAWN_COLS: string[] = ['pawn_id','old_pawn_id','original_pawn_id','old_original_pawn_id','previous_pawn_id','old_previous_pawn_id','cid','employee_id','created_date','expired_date','safe_until_date','late_notice_sent','loan_time_units','loan_days','accrual_days','sub_total','interest_due','interest_accruals','interest_template_id','accrual_int_for_daily','fee_1','fee_2','fee_3','fee_4','fee_5','fee_6','fee_7','fee_8','fee_9','fee_10','amount_due','original_principal','current_principal','current_interest_due','current_loan_days','fee_template_id','current_fee_1','current_fee_2','current_fee_3','current_fee_4','current_fee_5','current_fee_6','current_fee_7','current_fee_8','current_fee_9','current_fee_10','current_amount_due','periods_paid','paid_until_date','upfront_fee_1','upfront_fee_2','upfront_fee_3','upfront_fee_4','upfront_fee_5','upfront_fee_6','upfront_fee_7','upfront_fee_8','upfront_fee_9','upfront_fee_10','mla_loan','mla_certificate_id','active','pawn_buyin_status_id','previous_pawn_buyin_status_id','buy_out_pawn_date','buy_out_pawn','buy_out_total','payment_type_id','complete','contain_extension','contain_on_hold','generated','location_id','old_location_id','split_items','void','update_feb4','original_created_date','original_periods_paid','original_paid_until_date','original_safe_until_date','safe_until_date_updates','sms_sent','sms_reply','stored_on_premises','cubic_dimensions','ignore_anomaly','pawn_loan_to_appraisal_percentage','migration_notes','disposition_date','previous_disposition_date','beneficiary','partial_interest_paid','partial_fee_1','partial_fee_2','partial_fee_3','partial_fee_4','partial_fee_5','partial_fee_6','partial_fee_7','partial_fee_8','partial_fee_9','partial_fee_10','update_error'];
export const FALLBACK_EXT_COLS: string[] = ['extension_id','extension_type','pawn_id','old_pawn_id','original_pawn_id','add_extension_days','expected_interest_payment','extension_pay','discount','hold_paid','fee_1','fee_2','fee_3','fee_4','fee_5','fee_6','fee_7','fee_8','fee_9','fee_10','principal_adjustment','active','new_expired_date','extension_date','previous_created_date','current_principal','current_interest_due','current_amount_due','interest_payment_note','cid','void','void_id','employee_id','location_id'];
export const FALLBACK_BUYIN_COLS: string[] = ['buyin_id','old_buyin_id','cid','trade_id','vendor_id','employee_id','order_date','expired_date','payment_type_id','trade_adjustment','total_amount','pawn_buyin_status_id','active','complete','location_id','old_location_id','source','void','migration_notes'];
export const FALLBACK_TD_COLS: string[] = ['transaction_detail_id','transaction_id','transaction_type_id','id','amount','checks','printed_item_id','void','transaction_source','cust_gender','cust_age','cust_race','cust_occupation_type_id','cust_zip_code','cust_lat','cust_lng','cust_cid','cust_location_id','cust_timestamp','report_id','trade_id','loyalty_points'];
export const FALLBACK_T_COLS: string[] = ['transaction_id','employee_id','till_id','manager_id','cid','sub_total','discount','tax','other','grand_total','cash','debit','credit','gift_card','checks','e_payment','finance','store_credit','mobile_payment','points_payment','points_payment_void_balance','loyalty_conversion_points','loyalty_conversion_dollars','change_returned','comment','location_id','start_time','referral_id','transaction_source','mobile_transaction_cost','mobile_transaction_percentage','pm_transaction_cost','pm_transaction_percentage','fee_1','fee_2','fee_3','fee_4','fee_5','fee_6','fee_7','fee_8','fee_9','fee_10','printed_item_id','timestamp'];
export const FALLBACK_SO_COLS: string[] = ['sales_order_id','old_sales_order_id','created_date','employee_id','payment_type_id','sub_total','total_warranty_paid','warranty_sales_tax','total_discount','tax_total','grand_total','layaway','layaway_due_date','layaway_duration_type','layaway_days','require_layaway_payment','layaway_periods','amount_due','original_layaway_balance','round_layaway_pmt_up','credit_sale','tax_code_id','location_id','cid','active','cancelled_layaway','pro_rate_layaway_tax','on_sales_report','layaway_completed_date','next_layaway_payment_date','marketplace_id','marketplace_order_id','transaction_source','referral_id','wholesale','void','migration_notes'];
export const FALLBACK_SOD_COLS: string[] = ['sales_order_detail_id','sales_order_id','inventory_id','trade_id','qty','total_qty_returned','last_qty_returned','original_sold_price','sold_price','sub_total','discount','trade_amount','tax_code_id','cost_of_goods','restock_fee','make','model','serial_number','notes','description','manually_added_inventory','returned_item','warranty_paid','warranty_duration','warranty_expiry','firearm_released','consignment_paid','fee_1','fee_2','fee_3','fee_4','fee_5','fee_6','fee_7','fee_8','fee_9','fee_10','wholesale','campaign_id','coupon_id','department_id_lwy','loyalty_points'];
export const FALLBACK_LAY_COLS: string[] = ['layaway_id','sales_order_id','payment_date','payment','layaway_fee','payment_type','current_balance','pro_rate_layaway_tax','employee_id','comment','transaction_detail_id','void','transaction_source','mobile_disposition','notification_employee_id','notification_timestamp'];
export const FALLBACK_SCRAP_COLS: string[] = ['scrap_detail_id','refiner_id','refinery_number','scrap_qty','sent_timestamp','sent_employee_id','sent_weight','sent_amount','sold_weight','sold_amount','sold_timestamp','sold_employee_id','location_id'];
export const FALLBACK_PICKED_UP_COLS: string[] = ['picked_up_id','pawn_id','picked_up_date','expected_interest_payment','interest_paid','discount','hold_paid','fee_1','fee_2','fee_3','fee_4','fee_5','fee_6','fee_7','fee_8','fee_9','fee_10','interest_payment_note','void','void_id','employee_id','cid','location_id','retrieved','retrieved_timestamp','retrieved_employee_id','transaction_source','mobile_disposition','transaction_details_id','notification_employee_id','notification_timestamp','tax_code_id','taxable_amount','tax_collected'];
export const FALLBACK_PBAV_COLS: string[] = ['log_id','location_id','pawn_buyin_status_id','count','value','timestamp'];
export const FALLBACK_INV_COLS: string[] = ['inventory_id','old_inventory_id','barcode','rfid_tag','rfid_print_serial','old_category_name','priced_out','sellable','bulk_item','scrap_bin_id','source_id','jewellery_id','firearm_id','product_type_id','product_type_id_2','product_type_id_3','make','model','serial_number','upc_code','note','department_id','metal_type_id','purity','grams','weight_type','carats','description','description_retail','selling_price','min_selling_price','total_qty_bought','total_cost_of_goods','average_cogs','msrp','appraised_value','vendor_id','firearm_seller_cid','scrap_detail_id','condition_id','employee_id','date_added','employee_id_update','update_timestamp','picture_count','original_sellable_date','tax_code_id','show_popup','popup_message','void','migration_notes','pending_batch_number','fastbound_item_id','fastbound_acquisition_id','fastbound_disposition_id','fastbound_item_number','fastbound_acquisition_date','fastbound_transaction_type'];
export const FALLBACK_INVVAL_COLS: string[] = ['inventory_value_id','location_id','sellable_value','pulled_non_sellable','non_sellable_value','scrap_bin_value','non_sellable_pawn_value','non_sellable_pawn_count','non_sellable_buyin_value','non_sellable_buyin_count','new_inventory_value','cur_layaway_count','cur_layaway_balance','cur_layaway_cost','pawn_count','pawn_value','extension_count','extension_value','buyin_count','buyin_value','add_count','add_value','principal_value','redeem_count','redeem_value','interest_charges','current_pawn_count','current_pawn_value','taxable_sales_count','taxable_sales_value','non_taxable_sales_count','non_taxable_sales_value','returns_count','returns_value','layaway_payment_count','layaway_payment_value','layaway_deposit_value','tax_liability','tax_refunds','cogs','returned_cogs','gross_profit','check_count','check_amount','check_income','ret_check_payment','cashed_checks','pawn_expired_count','pawn_item_count','pawn_item_value','buy_expired_count','buy_item_count','buy_item_value','pull_pawn_count','pull_pawn_total','pull_buy_count','pull_buy_total','conf_pawn_count','conf_pawn_total','conf_buy_count','conf_buy_total','back_in_ext_count','back_in_ext_total','back_in_red_count','back_in_red_total','back_in_other_count','back_in_other_total','back_in_buyin_count','back_in_buyin_total','till_value','vault_value','timestamp'];
export const FALLBACK_PT_COLS: string[] = ['product_type_id','parent_id','product_name','old_product_name','product_code','make_code','model_code','active','days_to_expire','required_make','required_model','required_serial_number','required_upc','required_note','required_department','bwi_class','receipt_code','image_file','qty_for_sale','min_age','min_age_buys','min_age_retail','sticker_type','firearm_type','firearm_3310_type','exclude_points','pawn_alert_message','buyin_alert_message','retail_alert_message','tax_code_id'];
export const FALLBACK_REPAIR_PAY_COLS: string[] = ['repair_payment_id','repair_order_id','repair_payment_type','repair_payment','repair_payment_tax','pro_rate_repair_tax','repair_payment_note','employee_id','location_id','timestamp','transaction_detail_id','cid','void'];
export const FALLBACK_INVSTOCK_COLS: string[] = ['inventory_id','location_id','inventory_state_id','qty','reorder_level','max_reorder_level','old_inventory_id'];
export const FALLBACK_VOID_COLS: string[] = ['void_id','void_type_id','transaction_id','original_id','employee_id','location_id','void_amount','void_comment','timestamp'];
export const FALLBACK_VOID_TYPE_COLS: string[] = ['void_type_id','void_type','active'];
export const FALLBACK_USERS_COLS: string[] = ['user_id','username','password','pin','emp_id','emp_city','pin_on','created','updated','dob','deleted','first_name','middle_name','last_name','last_active','last_ip','last_query','user_status','email','phone','rows','gender','admin','manager','login_location','access_ip','print_ip','userscol','till_id','max_pawn','max_redemption','max_buy','max_retail_discount_rate','developer','user_agent','role_id','buyer_commission_rate','seller_commission_rate','listing_commission_rate','process_commission_rate','buyer_commission_rate_int','seller_commission_rate_int','punchin_required','default_language','terminal_id','magtek_ip','checkout_display','auth_active','auth_active_sms','date_hired','date_terminated','ai_main_prompt','ai_jewelry','ai_diamond','ai_firearm','ai_city','ai_state','ai_country','ai_language'];
