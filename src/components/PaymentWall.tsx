/**
 * Payment Wall Component
 * Shows before lesson generation if payment is required
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, Phone, CreditCard, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  estimateLessonCost,
  getUserPaymentProfile,
  checkPaymentRequired,
  MOBILE_MONEY_PROVIDERS,
  detectProvider,
  formatPhoneNumber,
  initializePayment,
  type MobileMoneyProvider,
  type UserPaymentProfile,
} from '@/services/paymentService';

interface PaymentWallProps {
  numLessons: number;
  onPaymentComplete: () => void;
  onCancel: () => void;
}

export function PaymentWall({ numLessons, onPaymentComplete, onCancel }: PaymentWallProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(true);
  const [exemptReason, setExemptReason] = useState<string>();
  const [profile, setProfile] = useState<UserPaymentProfile | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [estimatedTokens, setEstimatedTokens] = useState<number>(0);

  // Payment form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(5); // Default GHS 5

  useEffect(() => {
    loadPaymentInfo();
  }, [numLessons]);

  async function loadPaymentInfo() {
    setLoading(true);
    try {
      // Check if payment is required
      const { required, reason } = await checkPaymentRequired();
      setPaymentRequired(required);
      setExemptReason(reason);

      if (!required) {
        // User is exempt, proceed directly
        setLoading(false);
        return;
      }

      // Get user's payment profile
      const userProfile = await getUserPaymentProfile();
      setProfile(userProfile);

      // Estimate cost
      const { cost, estimatedTokens: tokens } = await estimateLessonCost(numLessons);
      setEstimatedCost(cost);
      setEstimatedTokens(tokens);

      // Set default top-up amount
      if (userProfile && userProfile.walletBalance < cost) {
        const needed = cost - userProfile.walletBalance;
        setTopUpAmount(Math.ceil(needed)); // Round up to nearest cedi
      }
    } catch (error) {
      console.error('Error loading payment info:', error);
      toast.error('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  }

  // Auto-detect provider from phone number
  useEffect(() => {
    if (phoneNumber.length >= 3) {
      const detected = detectProvider(phoneNumber);
      if (detected) {
        setSelectedProvider(detected);
      }
    }
  }, [phoneNumber]);

  const hasSufficientBalance = profile && profile.walletBalance >= estimatedCost;

  async function handlePayWithWallet() {
    if (!hasSufficientBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    // Proceed with generation - payment will be deducted during generation
    onPaymentComplete();
  }

  async function handleMobileMoneyPayment() {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (!selectedProvider) {
      toast.error('Could not detect mobile money provider. Please check your phone number.');
      return;
    }

    setProcessing(true);
    try {
      // Initialize payment
      const result = await initializePayment(
        topUpAmount,
        phoneNumber,
        selectedProvider.code,
        { numLessons, estimatedTokens }
      );

      if (result.success && result.reference) {
        // For mobile money, user needs to approve on their phone
        toast.success(
          `Payment request sent to ${formatPhoneNumber(phoneNumber)}. Please approve on your phone.`,
          { duration: 10000 }
        );
        
        // In a real implementation, you would poll for payment status
        // or use Paystack webhooks. For now, we'll show instructions.
        toast.info('After approving payment, click "I have paid" to continue.');
        
      } else {
        toast.error(result.error || 'Payment initialization failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  // If not loading and payment not required, auto-proceed
  useEffect(() => {
    if (!loading && !paymentRequired) {
      onPaymentComplete();
    }
  }, [loading, paymentRequired]);

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading payment info...</span>
        </CardContent>
      </Card>
    );
  }

  if (!paymentRequired) {
    return null; // Will auto-proceed via useEffect
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <CardTitle>Payment Required</CardTitle>
          </div>
          <CardDescription>
            Complete payment to generate your lesson note{numLessons > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Cost Estimate */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lessons to generate:</span>
              <Badge variant="secondary">{numLessons}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Estimated tokens:</span>
              <span className="text-sm">~{estimatedTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2 mt-2">
              <span className="font-medium">Estimated Cost:</span>
              <span className="text-lg font-bold text-primary">GHS {estimatedCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Wallet Balance */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              <span>Wallet Balance:</span>
            </div>
            <span className={`font-bold ${hasSufficientBalance ? 'text-green-600' : 'text-red-500'}`}>
              GHS {profile?.walletBalance?.toFixed(2) || '0.00'}
            </span>
          </div>

          {/* Pay with Wallet Button (if sufficient) */}
          {hasSufficientBalance && (
            <Button 
              className="w-full" 
              size="lg"
              onClick={handlePayWithWallet}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Pay GHS {estimatedCost.toFixed(2)} from Wallet
            </Button>
          )}

          {/* Top Up Section */}
          {!hasSufficientBalance && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">
                  Insufficient balance. Top up to continue.
                </span>
              </div>

              {/* Top Up Amount */}
              <div className="space-y-2">
                <Label>Top Up Amount (GHS)</Label>
                <div className="flex gap-2">
                  {[2, 5, 10, 20].map((amount) => (
                    <Button
                      key={amount}
                      variant={topUpAmount === amount ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTopUpAmount(amount)}
                    >
                      {amount}
                    </Button>
                  ))}
                  <Input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(Number(e.target.value))}
                    className="w-20"
                    min={1}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Money Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="024 XXX XXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {selectedProvider && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Detected: {selectedProvider.name}
                  </p>
                )}
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>Select Provider</Label>
                <RadioGroup
                  value={selectedProvider?.id || ''}
                  onValueChange={(value) => {
                    const provider = MOBILE_MONEY_PROVIDERS.find(p => p.id === value);
                    setSelectedProvider(provider || null);
                  }}
                  className="grid grid-cols-3 gap-2"
                >
                  {MOBILE_MONEY_PROVIDERS.map((provider) => (
                    <div key={provider.id}>
                      <RadioGroupItem
                        value={provider.id}
                        id={provider.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={provider.id}
                        className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <span className="text-2xl mb-1">{provider.icon}</span>
                        <span className="text-xs text-center">{provider.name.split(' ')[0]}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Pay Button */}
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleMobileMoneyPayment}
                disabled={processing || !phoneNumber || !selectedProvider}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Top Up GHS {topUpAmount.toFixed(2)}
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <Info className="h-3 w-3" />
                You'll receive a prompt on your phone to approve payment
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          {!hasSufficientBalance && (
            <Button 
              variant="outline" 
              onClick={loadPaymentInfo}
            >
              Refresh Balance
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default PaymentWall;
