-- ====================================================================
-- Farm Data Management System — PostgreSQL Database Schema
-- Specification Compliant (Section 8, 27, 28, 29)
-- Database: farm
-- ====================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Trigger Function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger Function: Enforce Closed Flock Immutability (Section 6, 7, 58)
CREATE OR REPLACE FUNCTION enforce_closed_flock_protection()
RETURNS TRIGGER AS $$
DECLARE
    flock_curr_status VARCHAR;
BEGIN
    SELECT status INTO flock_curr_status FROM flocks WHERE id = NEW.flock_id;
    IF flock_curr_status = 'closed' THEN
        RAISE EXCEPTION 'FLOCK_CLOSED: Cannot record or modify operations for a closed flock.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- TABLE DEFINITIONS
-- ====================================================================

-- Table 1: farms
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_farms_updated_at
BEFORE UPDATE ON farms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Table 2: flocks
CREATE TABLE IF NOT EXISTS flocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    flock_code VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    start_date DATE NOT NULL,
    initial_birds INTEGER NOT NULL CHECK (initial_birds > 0),
    egg_tracking_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_flocks_farm_code ON flocks(farm_id, flock_code);
CREATE INDEX IF NOT EXISTS idx_flocks_status ON flocks(status);
CREATE INDEX IF NOT EXISTS idx_flocks_farm_id ON flocks(farm_id);

CREATE TRIGGER set_flocks_updated_at
BEFORE UPDATE ON flocks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Table 3: bird_daily_records
CREATE TABLE IF NOT EXISTS bird_daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    mortality INTEGER DEFAULT 0 NOT NULL CHECK (mortality >= 0),
    light_hours NUMERIC(4, 2) CHECK (light_hours >= 0 AND light_hours <= 24),
    max_temperature NUMERIC(5, 2),
    min_temperature NUMERIC(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bird_flock_date ON bird_daily_records(flock_id, date);
CREATE INDEX IF NOT EXISTS idx_bird_flock_id ON bird_daily_records(flock_id);
CREATE INDEX IF NOT EXISTS idx_bird_date ON bird_daily_records(date);

CREATE TRIGGER set_bird_updated_at
BEFORE UPDATE ON bird_daily_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_bird_closed_flock
BEFORE INSERT OR UPDATE ON bird_daily_records
FOR EACH ROW
EXECUTE FUNCTION enforce_closed_flock_protection();

-- Table 4: feed_daily_records
CREATE TABLE IF NOT EXISTS feed_daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    arrival_bags INTEGER DEFAULT 0 NOT NULL CHECK (arrival_bags >= 0),
    used_bags INTEGER DEFAULT 0 NOT NULL CHECK (used_bags >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_flock_date ON feed_daily_records(flock_id, date);
CREATE INDEX IF NOT EXISTS idx_feed_flock_id ON feed_daily_records(flock_id);
CREATE INDEX IF NOT EXISTS idx_feed_date ON feed_daily_records(date);

CREATE TRIGGER set_feed_updated_at
BEFORE UPDATE ON feed_daily_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_feed_closed_flock
BEFORE INSERT OR UPDATE ON feed_daily_records
FOR EACH ROW
EXECUTE FUNCTION enforce_closed_flock_protection();

-- Table 5: egg_daily_records
CREATE TABLE IF NOT EXISTS egg_daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    production_peti INTEGER DEFAULT 0 NOT NULL CHECK (production_peti >= 0),
    production_trays INTEGER DEFAULT 0 NOT NULL CHECK (production_trays >= 0 AND production_trays < 12),
    sold_peti INTEGER DEFAULT 0 NOT NULL CHECK (sold_peti >= 0),
    sold_trays INTEGER DEFAULT 0 NOT NULL CHECK (sold_trays >= 0 AND sold_trays < 12),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_egg_flock_date ON egg_daily_records(flock_id, date);
CREATE INDEX IF NOT EXISTS idx_egg_flock_id ON egg_daily_records(flock_id);
CREATE INDEX IF NOT EXISTS idx_egg_date ON egg_daily_records(date);

CREATE TRIGGER set_egg_updated_at
BEFORE UPDATE ON egg_daily_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_egg_closed_flock
BEFORE INSERT OR UPDATE ON egg_daily_records
FOR EACH ROW
EXECUTE FUNCTION enforce_closed_flock_protection();

-- Table 6: egg_usage_records
CREATE TABLE IF NOT EXISTS egg_usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('gift-use', 'conveyor-waste', 'mess-use', 'store-waste')),
    peti INTEGER DEFAULT 0 NOT NULL CHECK (peti >= 0),
    trays INTEGER DEFAULT 0 NOT NULL CHECK (trays >= 0 AND trays < 12),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_egg_usage_flock_date ON egg_usage_records(flock_id, date);
CREATE INDEX IF NOT EXISTS idx_egg_usage_flock_id ON egg_usage_records(flock_id);

CREATE TRIGGER set_egg_usage_updated_at
BEFORE UPDATE ON egg_usage_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_egg_usage_closed_flock
BEFORE INSERT OR UPDATE ON egg_usage_records
FOR EACH ROW
EXECUTE FUNCTION enforce_closed_flock_protection();

-- Table 7: diesel_daily_records
CREATE TABLE IF NOT EXISTS diesel_daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    arrival_liters NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (arrival_liters >= 0),
    used_liters NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (used_liters >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_diesel_flock_date ON diesel_daily_records(flock_id, date);
CREATE INDEX IF NOT EXISTS idx_diesel_flock_id ON diesel_daily_records(flock_id);
CREATE INDEX IF NOT EXISTS idx_diesel_date ON diesel_daily_records(date);

CREATE TRIGGER set_diesel_updated_at
BEFORE UPDATE ON diesel_daily_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_diesel_closed_flock
BEFORE INSERT OR UPDATE ON diesel_daily_records
FOR EACH ROW
EXECUTE FUNCTION enforce_closed_flock_protection();

-- Table 8: weight_records
CREATE TABLE IF NOT EXISTS weight_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight NUMERIC(8, 2) NOT NULL CHECK (weight > 0),
    uniformity NUMERIC(5, 2) NOT NULL CHECK (uniformity >= 0 AND uniformity <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_flock_date ON weight_records(flock_id, date);
CREATE INDEX IF NOT EXISTS idx_weight_flock_id ON weight_records(flock_id);
CREATE INDEX IF NOT EXISTS idx_weight_date ON weight_records(date);

CREATE TRIGGER set_weight_updated_at
BEFORE UPDATE ON weight_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_weight_closed_flock
BEFORE INSERT OR UPDATE ON weight_records
FOR EACH ROW
EXECUTE FUNCTION enforce_closed_flock_protection();

-- Table 9: medicines master
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_medicines_farm_id ON medicines(farm_id);

CREATE TRIGGER set_medicines_updated_at
BEFORE UPDATE ON medicines
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Table 10: medicine_daily_records
CREATE TABLE IF NOT EXISTS medicine_daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(20) DEFAULT 'water' NOT NULL CHECK (type IN ('water', 'medicine')),
    water_liters NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (water_liters >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_medicine_flock_date ON medicine_daily_records(flock_id, date);
CREATE INDEX IF NOT EXISTS idx_medicine_flock_id ON medicine_daily_records(flock_id);
CREATE INDEX IF NOT EXISTS idx_medicine_date ON medicine_daily_records(date);

CREATE TRIGGER set_medicine_daily_updated_at
BEFORE UPDATE ON medicine_daily_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_medicine_closed_flock
BEFORE INSERT OR UPDATE ON medicine_daily_records
FOR EACH ROW
EXECUTE FUNCTION enforce_closed_flock_protection();

-- Table 11: medicine_entries (many-to-one with medicine_daily_records)
CREATE TABLE IF NOT EXISTS medicine_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_record_id UUID NOT NULL REFERENCES medicine_daily_records(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    dosage_per_liter NUMERIC(10, 2) CHECK (dosage_per_liter >= 0)
);

CREATE INDEX IF NOT EXISTS idx_entries_daily_record ON medicine_entries(daily_record_id);
CREATE INDEX IF NOT EXISTS idx_entries_medicine_id ON medicine_entries(medicine_id);

-- Table 12: vaccination_records
CREATE TABLE IF NOT EXISTS vaccination_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    vaccine_name VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vaccines_flock_date ON vaccination_records(flock_id, date);
CREATE INDEX IF NOT EXISTS idx_vaccines_flock_id ON vaccination_records(flock_id);

CREATE TRIGGER set_vaccination_updated_at
BEFORE UPDATE ON vaccination_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_vaccine_closed_flock
BEFORE INSERT OR UPDATE ON vaccination_records
FOR EACH ROW
EXECUTE FUNCTION enforce_closed_flock_protection();
