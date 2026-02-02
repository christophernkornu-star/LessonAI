/**
 * Payment Service for LessonAI
 * Handles Mobile Money payments via Paystack (MTN, Telecel, AirtelTigo)
 */

import { supabase } from '@/integrations/supabase/client';

// Paystack public key from environment
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

export interface PaymentSettings {
  tokenPricePer1000: number;
  minimumCharge: number;
  platformFeePercent: number;
  freeTokensDaily: number;
  currency: string;
}

export interface UserPaymentProfile {
  id: string;
  userId: string;
  isPaymentExempt: boolean;
  exemptionReason?: string;
  walletBalance: number;
  totalSpent: number;
  totalTokensUsed: number;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  transactionReference: string;
  paystackReference?: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  phoneNumber?: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  tokensPurchased?: number;
  createdAt: string;
  completedAt?: string;
}

export interface MobileMoneyProvider {
  id: string;
  name: string;
  code: string;
  icon: string;
  prefixes: string[];
}

// Ghana Mobile Money Providers
export const MOBILE_MONEY_PROVIDERS: MobileMoneyProvider[] = [
  {
    id: 'mtn',
    name: 'MTN Mobile Money',
    code: 'mtn',
    icon: '📱',
    prefixes: ['024', '025', '053', '054', '055', '059'],
  },
  {
    id: 'telecel',
    name: 'Telecel Cash',
    code: 'vod', // Paystack uses 'vod' for Vodafone/Telecel
    icon: '📲',
    prefixes: ['020', '050'],
  },
  {
    id: 'airteltigo',
    name: 'AirtelTigo Money',
    code: 'atl',
    icon: '💳',
    prefixes: ['026', '027', '056', '057'],
  },
];

/**
 * Detect mobile money provider from phone number
 */
export function detectProvider(phoneNumber: string): MobileMoneyProvider | null {
  const cleaned = phoneNumber.replace(/\D/g, '');
  const prefix = cleaned.startsWith('233') 
    ? '0' + cleaned.slice(3, 5) 
    : cleaned.slice(0, 3);
  
  return MOBILE_MONEY_PROVIDERS.find(p => 
    p.prefixes.some(pre => prefix.startsWith(pre.slice(0, 3)))
  ) || null;
}

/**
 * Format phone number for Paystack (233XXXXXXXXX format)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('233')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return '233' + cleaned.slice(1);
  }
  return '233' + cleaned;
}

/**
 * Get payment settings from database
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  const { data, error } = await supabase
    .from('payment_settings')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching payment settings:', error);
    // Return defaults
    return {
      tokenPricePer1000: 0.0007,
      minimumCharge: 0.50,
      platformFeePercent: 30,
      freeTokensDaily: 0,
      currency: 'GHS',
    };
  }

  // Map database columns to PaymentSettings interface
  // Database columns: token_price_per_1000, minimum_charge, platform_fee_percent, free_daily_tokens, currency
  return {
    tokenPricePer1000: data.token_price_per_1000 || 0.0007,
    minimumCharge: data.minimum_charge || 0.50,
    platformFeePercent: data.platform_fee_percent || 30,
    freeTokensDaily: data.free_daily_tokens || 0,
    currency: data.currency || 'GHS',
  };
}

/**
 * Calculate cost for a given number of tokens
 */
export async function calculateCost(tokens: number): Promise<{ cost: number; breakdown: any }> {
  const settings = await getPaymentSettings();
  
  const baseCost = (tokens / 1000) * settings.tokenPricePer1000;
  const platformFee = baseCost * (settings.platformFeePercent / 100);
  let totalCost = baseCost + platformFee;
  
  // Apply minimum charge
  if (totalCost < settings.minimumCharge) {
    totalCost = settings.minimumCharge;
  }
  
  return {
    cost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
    breakdown: {
      tokens,
      baseCost: Math.round(baseCost * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      minimumCharge: settings.minimumCharge,
      currency: settings.currency,
    },
  };
}

/**
 * Estimate cost for lesson generation based on number of lessons
 */
export async function estimateLessonCost(numLessons: number = 1): Promise<{ cost: number; estimatedTokens: number }> {
  // Average tokens per lesson (from our observation)
  const tokensPerLesson = 2500;
  const baseTokens = 1500; // Overhead for prompt
  
  const estimatedTokens = baseTokens + (numLessons * tokensPerLesson);
  const { cost } = await calculateCost(estimatedTokens);
  
  return { cost, estimatedTokens };
}

/**
 * Get user's payment profile
 */
export async function getUserPaymentProfile(): Promise<UserPaymentProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch from profiles to check admin-controlled exemption status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_payment_exempt')
    .eq('id', user.id)
    .single();
    
  const isProfileExempt = (profile as any)?.is_payment_exempt === true;

  const { data, error } = await supabase
    .from('user_payment_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // Profile doesn't exist, create one
    if (error.code === 'PGRST116') {
      const { data: newProfile } = await supabase
        .from('user_payment_profiles')
        .insert({ user_id: user.id })
        .select()
        .single();
      
      if (newProfile) {
        return {
          id: newProfile.id,
          userId: newProfile.user_id,
          isPaymentExempt: isProfileExempt || newProfile.is_payment_exempt || false,
          exemptionReason: newProfile.exemption_reason,
          walletBalance: newProfile.wallet_balance || 0,
          totalSpent: newProfile.total_spent || 0,
          totalTokensUsed: newProfile.total_tokens_used || 0,
        };
      }
    }
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    isPaymentExempt: isProfileExempt || data.is_payment_exempt || false,
    exemptionReason: data.exemption_reason,
    walletBalance: data.wallet_balance || 0,
    totalSpent: data.total_spent || 0,
    totalTokensUsed: data.total_tokens_used || 0,
  };
}

/**
 * Check if user needs to pay for generation
 */
export async function checkPaymentRequired(): Promise<{ required: boolean; reason?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { required: true, reason: 'User not authenticated' };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin' || profile?.role === 'super_admin') {
    return { required: false, reason: 'Admin account' };
  }

  // Check if user is payment exempt
  const paymentProfile = await getUserPaymentProfile();
  if (paymentProfile?.isPaymentExempt) {
    return { required: false, reason: paymentProfile.exemptionReason || 'Payment exempt' };
  }

  return { required: true };
}

/**
 * Generate unique transaction reference
 */
function generateTransactionReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `LSNAI_${timestamp}_${random}`.toUpperCase();
}

/**
 * Initialize a payment transaction
 */
export async function initializePayment(
  amount: number,
  phoneNumber: string,
  provider: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; reference?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const transactionReference = generateTransactionReference();
  const formattedPhone = formatPhoneNumber(phoneNumber);

  // Create transaction record
  const { error: insertError } = await supabase
    .from('payment_transactions')
    .insert({
      user_id: user.id,
      paystack_reference: transactionReference,
      amount,
      transaction_type: 'topup',
      payment_method: 'mobile_money',
      payment_provider: provider,
      phone_number: formattedPhone,
      status: 'pending',
      metadata: metadata || {},
    });

  if (insertError) {
    console.error('Error creating transaction:', insertError);
    return { success: false, error: 'Failed to create transaction' };
  }

  return { success: true, reference: transactionReference };
}

/**
 * Process Mobile Money payment via Paystack
 */
export async function processMobileMoneyPayment(
  amount: number,
  phoneNumber: string,
  provider: MobileMoneyProvider,
  email: string,
  reference: string
): Promise<{ success: boolean; authorizationUrl?: string; error?: string }> {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Initialize Paystack charge
    const response = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`,
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Paystack uses pesewas
        currency: 'GHS',
        mobile_money: {
          phone: formattedPhone,
          provider: provider.code,
        },
        reference,
        metadata: {
          custom_fields: [
            { display_name: 'Service', variable_name: 'service', value: 'LessonAI Generation' }
          ]
        }
      }),
    });

    const data = await response.json();

    if (data.status && data.data) {
      // Update transaction with Paystack reference
      await supabase
        .from('payment_transactions')
        .update({ 
          paystack_reference: data.data.reference,
          status: data.data.status === 'success' ? 'success' : 'pending'
        })
        .eq('paystack_reference', reference);

      return { 
        success: true, 
        authorizationUrl: data.data.authorization_url 
      };
    }

    return { success: false, error: data.message || 'Payment initialization failed' };
  } catch (error) {
    console.error('Payment error:', error);
    return { success: false, error: 'Payment processing failed' };
  }
}

/**
 * Verify payment status
 */
export async function verifyPayment(reference: string): Promise<{ 
  success: boolean; 
  status?: string; 
  error?: string 
}> {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (data.status && data.data) {
      const status = data.data.status;
      
      // Update transaction status
      await supabase
        .from('payment_transactions')
        .update({ 
          status: status === 'success' ? 'success' : status === 'failed' ? 'failed' : 'pending',
        })
        .eq('paystack_reference', reference);

      // If successful, update user wallet
      if (status === 'success') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const amount = data.data.amount / 100; // Convert from pesewas
          // Get current balance and add
          const { data: profileData } = await supabase
            .from('user_payment_profiles')
            .select('wallet_balance')
            .eq('user_id', user.id)
            .single();
          
          const currentBalance = profileData?.wallet_balance || 0;
          await supabase
            .from('user_payment_profiles')
            .upsert({
              user_id: user.id,
              wallet_balance: currentBalance + amount,
            }, { onConflict: 'user_id' });
        }
      }

      return { success: status === 'success', status };
    }

    return { success: false, error: 'Verification failed' };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, error: 'Verification failed' };
  }
}

/**
 * Deduct cost from wallet or process payment
 */
export async function deductPayment(tokens: number, generationType: string = 'lesson_note', numLessons: number = 1): Promise<{
  success: boolean;
  cost?: number;
  error?: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  // Check if payment is required
  const { required } = await checkPaymentRequired();
  if (!required) {
    // Log usage but no charge
    await supabase.from('token_usage_log').insert({
      user_id: user.id,
      tokens_used: tokens,
      cost_charged: 0,
      generation_type: generationType,
      lesson_count: numLessons,
    });
    return { success: true, cost: 0 };
  }

  const { cost } = await calculateCost(tokens);

  // ATOMIC DEDUCTION via RPC
  // This prevents race conditions when multiple generations happen simultaneously
  const { data: result, error: rpcError } = await (supabase as any)
    .rpc('deduct_account_balance', {
      p_user_id: user.id,
      p_amount: cost
    });

  if (rpcError) {
      console.error("Payment RPC Error:", rpcError);
      return { success: false, error: 'Payment processing failed' };
  }

  // Check RPC result logic
  if (!result || !result.success) {
      return { 
          success: false, 
          error: result?.error || 'Insufficient balance or profile error', 
          cost 
      };
  }

  // Log usage (asynchronous, non-blocking)
  // We add total_tokens_used update separately or let it drift slightly as it's for stats
  supabase.from('token_usage_log').insert({
    user_id: user.id,
    tokens_used: tokens,
    cost_charged: cost,
    generation_type: generationType,
    lesson_count: numLessons,
  }).then(); // fire and forget log

  // Optionally update local token stats if needed
  (supabase as any).rpc('increment_token_usage', { p_user_id: user.id, p_tokens: tokens }).then(() => {}, () => {});

  return { success: true, cost };
}

// Helper RPC for stats (optional, ensures stats are accurate over time)
/* 
create or replace function increment_token_usage(p_user_id uuid, p_tokens int) returns void as $$
update user_payment_profiles set total_tokens_used = total_tokens_used + p_tokens where user_id = p_user_id;
$$ language sql security definer;
*/

/**
 * Get user's transaction history
 */
export async function getTransactionHistory(limit: number = 20): Promise<PaymentTransaction[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return data.map((t: any) => ({
    id: t.id,
    userId: t.user_id,
    transactionReference: t.transaction_reference,
    paystackReference: t.paystack_reference,
    amount: parseFloat(t.amount),
    currency: t.currency,
    paymentMethod: t.payment_method,
    phoneNumber: t.phone_number,
    status: t.status,
    tokensPurchased: t.tokens_purchased,
    createdAt: t.created_at,
    completedAt: t.completed_at,
  }));
}

// ============ ADMIN FUNCTIONS ============

/**
 * Set user payment exemption (Admin only)
 */
export async function setPaymentExemption(
  targetUserId: string,
  exempt: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if current user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return { success: false, error: 'Admin access required' };
  }

  // Update or create payment profile
  const { error } = await supabase
    .from('user_payment_profiles')
    .upsert({
      user_id: targetUserId,
      is_payment_exempt: exempt,
      exemption_reason: reason || null,
      exemption_granted_by: exempt ? user.id : null,
      exemption_granted_at: exempt ? new Date().toISOString() : null,
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error setting exemption:', error);
    return { success: false, error: 'Failed to update exemption' };
  }

  return { success: true };
}

/**
 * Get all users with payment profiles (Admin only)
 */
export async function getAllUserPaymentProfiles(): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return [];
  }

  // First get payment profiles
  const { data: paymentProfiles, error } = await supabase
    .from('user_payment_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payment profiles:', error);
    return [];
  }

  if (!paymentProfiles || paymentProfiles.length === 0) {
    return [];
  }

  // Then get user details from profiles table
  const userIds = paymentProfiles.map(p => p.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .in('id', userIds);

  // Merge the data
  const data = paymentProfiles.map(payment => ({
    ...payment,
    profiles: profiles?.find(p => p.id === payment.user_id) || null
  }));

  return data || [];
}

/**
 * Update payment settings (Admin only)
 */
export async function updatePaymentSettings(
  settings: Partial<{
    token_price_per_1000: number;
    platform_fee_percent: number;
    minimum_charge: number;
    free_daily_tokens: number;
  }>
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return { success: false, error: 'Admin access required' };
  }

  const { error } = await supabase
    .from('payment_settings')
    .update({ 
      ...settings,
      updated_at: new Date().toISOString()
    })
    .eq('id', 'default');

  if (error) {
    console.error('Error updating settings:', error);
    return { success: false, error: 'Failed to update settings' };
  }

  return { success: true };
}

/**
 * Add funds to user wallet (Admin only)
 */
export async function addFundsToWallet(
  targetUserId: string,
  amount: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return { success: false, error: 'Admin access required' };
  }

  // Get current balance
  const { data: paymentProfile } = await supabase
    .from('user_payment_profiles')
    .select('wallet_balance')
    .eq('user_id', targetUserId)
    .single();

  const currentBalance = paymentProfile?.wallet_balance || 0;

  // Update balance
  const { error } = await supabase
    .from('user_payment_profiles')
    .upsert({
      user_id: targetUserId,
      wallet_balance: currentBalance + amount,
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error adding funds:', error);
    return { success: false, error: 'Failed to add funds' };
  }

  // Log as transaction
  await supabase.from('payment_transactions').insert({
    user_id: targetUserId,
    paystack_reference: generateTransactionReference(),
    amount,
    transaction_type: 'admin_credit',
    payment_method: 'admin_credit',
    status: 'success',
    metadata: { reason, granted_by: user.id },
    description: reason,
  });

  return { success: true };
}
