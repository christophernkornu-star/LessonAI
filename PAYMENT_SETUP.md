# Payment System Setup Guide

This guide explains how to set up and configure the payment system for LessonAI.

## Overview

The payment system supports:
- **Mobile Money**: MTN Mobile Money, Telecel Cash (formerly Vodafone Cash), AirtelTigo Money
- **Wallet-based payments**: Users top up their wallet and pay per generation
- **Admin exemptions**: Admins can exempt specific users from payment
- **Token-based pricing**: Cost is calculated based on AI tokens used

## Prerequisites

1. **Paystack Account**: Sign up at [https://paystack.com](https://paystack.com)
2. **Supabase Database**: Ensure your Supabase instance is running

## Setup Steps

### Step 1: Run Database Migration

Execute the SQL script to create payment tables:

```bash
# Using Supabase CLI
supabase db push

# Or manually run:
# supabase/create-payment-tables.sql
```

If you see a browser console error like:

`POST https://<project>.supabase.co/rest/v1/token_usage_log 404 (Not Found)`

it means the `token_usage_log` table does not exist yet in your Supabase project. Run the migration in the Supabase SQL Editor to create the payment tables.

**Supabase Dashboard (recommended):**

1. Open Supabase → your project → **SQL Editor**
2. Paste the full contents of `supabase/create-payment-tables.sql`
3. Click **Run**
4. Refresh your app

The migration creates:
- `payment_settings` - Global pricing configuration
- `user_payment_profiles` - User wallet and exemption status
- `payment_transactions` - Transaction history
- `token_usage_log` - Token usage tracking

### Step 2: Configure Paystack

1. Log in to your Paystack Dashboard
2. Go to **Settings > API Keys & Webhooks**
3. Copy your **Public Key** and **Secret Key**

### Step 3: Add Environment Variables

Add these to your `.env` file:

```env
# Paystack API Keys
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important**: Use test keys during development, switch to live keys for production.

### Step 4: Configure Pricing (Admin Dashboard)

1. Log in as an admin
2. Go to **Admin Dashboard > Payments**
3. Configure the pricing settings:

| Setting | Default | Description |
|---------|---------|-------------|
| Token Price per 1000 | GHS 0.0007 | Base cost per 1000 AI tokens |
| Platform Fee | 30% | Profit margin on top of AI costs |
| Minimum Charge | GHS 0.50 | Minimum amount per generation |
| Free Daily Tokens | 0 | Free tokens per user per day |

### Step 5: Test the System

1. Create a test user account
2. Try to generate a lesson note
3. The payment wall should appear
4. Test with a mobile money number

## Pricing Calculation

The cost for generating lessons is calculated as:

```
Base Cost = (tokens_used / 1000) × token_price
Platform Fee = Base Cost × platform_fee_percent
Total = max(Base Cost + Platform Fee, Minimum Charge)
```

**Example** (with default settings):
- 1 Lesson (~4000 tokens): 
  - Base: (4000/1000) × 0.0007 = GHS 0.0028
  - With 30% fee: 0.0028 × 1.3 = GHS 0.0036
  - After minimum: **GHS 0.50** (minimum applies)

- 5 Lessons (~15000 tokens):
  - Base: (15000/1000) × 0.0007 = GHS 0.0105
  - With 30% fee: 0.0105 × 1.3 = GHS 0.0137
  - After minimum: **GHS 0.50** (minimum still applies)

To achieve ~GHS 0.70 per normal lesson, adjust settings:
- Token Price: GHS 0.10 per 1000 tokens
- Platform Fee: 50%
- This gives: (4000/1000) × 0.10 × 1.5 = **GHS 0.60**
- Or set Minimum Charge to GHS 0.70

## Admin Features

### Exempting Users from Payment

1. Go to **Admin Dashboard > Payments**
2. Find the user in the Users table
3. Toggle the "Exempt" switch
4. Provide a reason (e.g., "Beta tester", "Partner school")

Exempt users can generate lessons without paying.

### Adding Funds to User Wallets

Admins can manually credit user wallets:
1. Go to **Admin Dashboard > Payments**
2. Click "Add Funds" for a user
3. Enter the amount and reason
4. The credit appears immediately

### Viewing Transaction History

All transactions are logged and visible in the admin dashboard, including:
- Mobile money top-ups
- Admin credits
- Generation deductions

## Mobile Money Integration

### Supported Providers

| Provider | Code | Phone Prefixes |
|----------|------|----------------|
| MTN Mobile Money | mtn | 024, 025, 053, 054, 055, 059 |
| Telecel Cash | vod | 020, 050 |
| AirtelTigo Money | atl | 026, 027, 056, 057 |

### Payment Flow

1. User enters phone number
2. System auto-detects provider
3. User selects top-up amount
4. Paystack sends USSD prompt to phone
5. User approves on their phone
6. Wallet is credited
7. User can proceed with generation

## Webhook Configuration (Production)

For production, set up Paystack webhooks to automatically update payment status:

1. In Paystack Dashboard, go to **Settings > Webhooks**
2. Add webhook URL: `https://your-domain.com/api/paystack/webhook`
3. Select events: `charge.success`, `transfer.success`, `transfer.failed`
4. Create a webhook handler in your Supabase Edge Functions

## Troubleshooting

### "Payment initialization failed"
- Check Paystack API keys are correct
- Ensure the phone number is valid (10 digits, valid prefix)
- Check network connectivity

### "Insufficient balance"
- User needs to top up their wallet
- Admin can credit the wallet manually

### Mobile Money prompt not received
- Verify phone number is correct
- Check if Paystack sandbox supports the provider
- In test mode, use Paystack test numbers

### Payment marked as pending
- Mobile money payments may take up to 30 seconds
- User may not have approved on their phone
- Check Paystack dashboard for status

## Security Notes

1. **Never expose SECRET_KEY** in frontend code
2. **Validate all payments** server-side before crediting
3. **Use webhooks** for reliable payment confirmation
4. **Log all transactions** for audit purposes
5. **Rate limit** payment endpoints to prevent abuse

## Files Structure

```
src/
├── services/
│   └── paymentService.ts       # Payment logic and API calls
├── components/
│   ├── PaymentWall.tsx         # Payment modal for users
│   └── AdminPaymentManagement.tsx  # Admin payment UI
└── pages/
    ├── ImprovedGenerator.tsx   # Integrated payment check
    └── AdminDashboard.tsx      # Payment tab added

supabase/
└── create-payment-tables.sql   # Database migration
```

## Support

For issues with:
- **Paystack Integration**: Contact Paystack support
- **Mobile Money**: Contact the respective provider
- **App Issues**: Check browser console for errors
