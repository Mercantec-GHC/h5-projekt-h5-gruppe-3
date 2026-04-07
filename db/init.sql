CREATE TABLE IF NOT EXISTS measurements (
  id SERIAL PRIMARY KEY,

  device_id TEXT NOT NULL,

  lux DOUBLE PRECISION NOT NULL,

  sun_phase TEXT NOT NULL, 
  -- dawn, day, dusk, night

  solar_angle DOUBLE PRECISION NOT NULL, 
  -- solens højde i grader (kan være negativ)

  status TEXT NOT NULL, 
  -- fx: 'too_dark', 'ok', 'too_bright'

  recommendation TEXT,
  -- fx: 'Tænd lys', 'Dæmp lys'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);