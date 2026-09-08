INSERT INTO public.kpi_field_config (field_name, field_label, category, is_visible, display_order, is_required, column_group)
VALUES ('dollar_pawns_redeemed_principal', '$ Pawns Redeemed (Principal)', 'Pawn Performance', false, 990, false, 'pawn_performance')
ON CONFLICT (field_name) DO NOTHING;