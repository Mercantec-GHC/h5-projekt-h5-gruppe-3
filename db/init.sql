CREATE TABLE IF NOT EXISTS measurements (
  id SERIAL PRIMARY KEY,

  device_id TEXT NOT NULL,

  lux DOUBLE PRECISION NOT NULL,

  time_of_day TEXT NOT NULL, -- day, evening, night

  status TEXT NOT NULL, 
  -- fx: 'too_dark', 'ok', 'too_bright'

  recommendation TEXT,
  -- fx: 'Tænd lys', 'Dæmp lys'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
