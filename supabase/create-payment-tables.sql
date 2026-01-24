-- Payment System Tables for LessonAI
-- Supports Mobile Money payments in Ghana (MTN, Telecel, AirtelTigo)

-- 1. Payment Settings Table (for pricing configuration)
-- Single-row settings table keyed by a stable id ('default')
CREATE TABLE IF NOT EXISTS payment_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    token_price_per_1000 DECIMAL(10, 6) NOT NULL DEFAULT 0.0007,
    platform_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 30.00,
    minimum_charge DECIMAL(10, 2) NOT NULL DEFAULT 0.50,
    free_daily_tokens INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'GHS',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure the default row exists
INSERT INTO payment_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- 2. User Payment Profiles Table (tracks user payment status and exemptions)
CREATE TABLE IF NOT EXISTS user_payment_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    is_payment_exempt BOOLEAN DEFAULT FALSE,
    exemption_reason TEXT,
    exempted_by UUID REFERENCES auth.users(id),
    exempted_at TIMESTAMP WITH TIME ZONE,
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    total_tokens_used BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Transactions Table (records all payment transactions)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL, -- 'topup', 'admin_credit', 'generation_charge'
    amount DECIMAL(10, 2) NOT NULL,
    tokens_amount INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed', 'cancelled'
    payment_method TEXT,
    payment_provider TEXT,
    paystack_reference TEXT UNIQUE,
    phone_number TEXT,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Token Usage Log (tracks token usage per generation)
CREATE TABLE IF NOT EXISTS token_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tokens_used INTEGER NOT NULL,
    cost_charged DECIMAL(10, 2) NOT NULL,
    generation_type TEXT NOT NULL, -- 'lesson_note', 'assessment', 'scheme'
    lesson_count INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_payment_profiles_user_id ON user_payment_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_token_usage_log_user_id ON token_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_log_created_at ON token_usage_log(created_at);

-- 6. Enable RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_log ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies

-- Payment Settings: Only admins can modify, everyone can read
CREATE POLICY "Anyone can read payment settings" ON payment_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can modify payment settings" ON payment_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- User Payment Profiles: Users can read their own, admins can read/modify all
CREATE POLICY "Users can view own payment profile" ON user_payment_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment profiles" ON user_payment_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can modify payment profiles" ON user_payment_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can insert own payment profile" ON user_payment_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own balance" ON user_payment_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Payment Transactions: Users can view/create their own
CREATE POLICY "Users can view own transactions" ON payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" ON payment_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Token Usage Log: Users can view their own, admins can view all
CREATE POLICY "Users can view own token usage" ON token_usage_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can log own token usage" ON token_usage_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all token usage" ON token_usage_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- 8. Function to check if user needs to pay
CREATE OR REPLACE FUNCTION check_user_payment_required(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_exempt BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT role IN ('admin', 'super_admin') INTO v_is_admin
    FROM profiles WHERE id = p_user_id;
    
    IF v_is_admin THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is payment exempt
    SELECT is_payment_exempt INTO v_is_exempt
    FROM user_payment_profiles WHERE user_id = p_user_id;
    
    IF v_is_exempt IS TRUE THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- 9. Function to calculate cost for tokens
CREATE OR REPLACE FUNCTION calculate_token_cost(p_tokens INTEGER)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_price_per_1000 DECIMAL(10, 6);
    v_platform_fee DECIMAL(5, 2);
    v_minimum_charge DECIMAL(10, 2);
    v_base_cost DECIMAL(10, 2);
    v_total_cost DECIMAL(10, 2);
BEGIN
    -- Get pricing settings from the single default row
    SELECT token_price_per_1000, platform_fee_percent, minimum_charge
      INTO v_price_per_1000, v_platform_fee, v_minimum_charge
    FROM payment_settings
    WHERE id = 'default';
    
    -- Calculate base cost
    v_base_cost := (p_tokens::DECIMAL / 1000) * v_price_per_1000;
    
    -- Add platform fee
    v_total_cost := v_base_cost * (1 + (v_platform_fee / 100));
    
    -- Apply minimum charge
    IF v_total_cost < v_minimum_charge THEN
        v_total_cost := v_minimum_charge;
    END IF;
    
    RETURN ROUND(v_total_cost, 2);
END;
$$;

-- 10. Trigger to auto-create payment profile for new users
CREATE OR REPLACE FUNCTION create_payment_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_payment_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Create trigger on profiles table (since it's created after auth.users)
DROP TRIGGER IF EXISTS on_profile_created_payment ON profiles;
CREATE TRIGGER on_profile_created_payment
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_payment_profile_for_new_user();

-- 11. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON payment_settings TO authenticated;
GRANT ALL ON user_payment_profiles TO authenticated;
GRANT ALL ON payment_transactions TO authenticated;
GRANT ALL ON token_usage_log TO authenticated;

COMMENT ON TABLE payment_settings IS 'Global payment configuration settings';
COMMENT ON TABLE user_payment_profiles IS 'User payment status and exemptions';
COMMENT ON TABLE payment_transactions IS 'All payment transactions (Mobile Money, Card)';
COMMENT ON TABLE token_usage_log IS 'Log of token usage for cost tracking';
