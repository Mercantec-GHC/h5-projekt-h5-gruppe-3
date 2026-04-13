CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,

  email TEXT NOT NULL UNIQUE,

  password_hash TEXT NOT NULL,

  role TEXT NOT NULL DEFAULT 'member',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


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