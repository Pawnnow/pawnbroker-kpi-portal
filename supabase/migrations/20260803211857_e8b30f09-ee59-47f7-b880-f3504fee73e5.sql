UPDATE public.kpi_entries e
SET location_id = l.id
FROM public.locations l
WHERE e.location_id IS NULL
  AND l.user_id = e.user_id
  AND (SELECT count(*) FROM public.locations l2 WHERE l2.user_id = e.user_id) = 1;