-- Update warehouse coordinates for Kuwait pharmacies
-- Note: ST_MakePoint takes (longitude, latitude) order

UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(48.06402332944741, 28.80144955823426), 4326)
WHERE name ILIKE '%Al Nower%' OR name ILIKE '%Nower%';

UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(48.0974577235698, 29.173856863564005), 4326)
WHERE name ILIKE '%Al Sultan%' OR name ILIKE '%Sultan%';

UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(48.09514179712771, 29.17408032318127), 4326)
WHERE name ILIKE '%Son%' AND name NOT ILIKE '%Sultan%';

UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(48.09429116997421, 29.174470363378028), 4326)
WHERE name ILIKE 'May' OR name = 'May';

UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(48.09419202946435, 29.174191802039505), 4326)
WHERE name ILIKE '%Mays ST%' OR name ILIKE '%Mays%';

UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(48.08945603804315, 29.248840577770917), 4326)
WHERE name ILIKE 'Mas' OR name = 'Mas';

UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(48.08592651525166, 29.258726000859145), 4326)
WHERE name ILIKE '%Al Banay%' OR name ILIKE '%Banay%';

UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(48.045089741740625, 29.325126099682727), 4326)
WHERE name ILIKE '%Al Rabee%' OR name ILIKE '%Rabee%';

UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(48.01311120689418, 29.347049022512188), 4326)
WHERE name ILIKE '%Heba%';

UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(47.992319405731884, 29.312037935889943), 4326)
WHERE name ILIKE '%Bir%' AND name NOT ILIKE '%Rabee%';

UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(47.97451382762952, 29.291521448187375), 4326)
WHERE name ILIKE '%Hamza%';

UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(47.93093233653488, 29.258463042154247), 4326)
WHERE name ILIKE '%Al Madina%' OR name ILIKE '%Madina%';

-- Set default Kuwait City center for any remaining warehouses without location
UPDATE warehouses SET location = ST_SetSRID(ST_MakePoint(47.9774, 29.3759), 4326)
WHERE location IS NULL;

-- Verify updates
SELECT id, name, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude
FROM warehouses
ORDER BY name;
