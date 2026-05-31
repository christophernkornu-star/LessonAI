import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Payment Wall Component
 * Shows before lesson generation if payment is required
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, Phone, CreditCard, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { estimateLessonCost, getUserPaymentProfile, checkPaymentRequired, MOBILE_MONEY_PROVIDERS, detectProvider, formatPhoneNumber, initializePayment, } from '@/services/paymentService';
export function PaymentWall({ numLessons, onPaymentComplete, onCancel }) {
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [paymentRequired, setPaymentRequired] = useState(true);
    const [exemptReason, setExemptReason] = useState();
    const [profile, setProfile] = useState(null);
    const [estimatedCost, setEstimatedCost] = useState(0);
    const [estimatedTokens, setEstimatedTokens] = useState(0);
    // Payment form state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [topUpAmount, setTopUpAmount] = useState(5); // Default GHS 5
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
        }
        catch (error) {
            console.error('Error loading payment info:', error);
            toast.error('Failed to load payment information');
        }
        finally {
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
            const result = await initializePayment(topUpAmount, phoneNumber, selectedProvider.code, { numLessons, estimatedTokens });
            if (result.success && result.reference) {
                // For mobile money, user needs to approve on their phone
                toast.success(`Payment request sent to ${formatPhoneNumber(phoneNumber)}. Please approve on your phone.`, { duration: 10000 });
                // In a real implementation, you would poll for payment status
                // or use Paystack webhooks. For now, we'll show instructions.
                toast.info('After approving payment, click "I have paid" to continue.');
            }
            else {
                toast.error(result.error || 'Payment initialization failed');
            }
        }
        catch (error) {
            console.error('Payment error:', error);
            toast.error('Payment processing failed. Please try again.');
        }
        finally {
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
        return (_jsx(Card, { className: "w-full max-w-md mx-auto", children: _jsxs(CardContent, { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin text-primary" }), _jsx("span", { className: "ml-3 text-muted-foreground", children: "Loading payment info..." })] }) }));
    }
    if (!paymentRequired) {
        return null; // Will auto-proceed via useEffect
    }
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200", children: _jsxs(Card, { className: "w-full max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl", children: [_jsxs(CardHeader, { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Wallet, { className: "h-6 w-6 text-primary" }), _jsx(CardTitle, { children: "Payment Required" })] }), _jsxs(CardDescription, { children: ["Complete payment to generate your lesson note", numLessons > 1 ? 's' : ''] })] }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "bg-muted/50 rounded-lg p-4 space-y-2", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: "Lessons to generate:" }), _jsx(Badge, { variant: "secondary", children: numLessons })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: "Estimated tokens:" }), _jsxs("span", { className: "text-sm", children: ["~", estimatedTokens.toLocaleString()] })] }), _jsxs("div", { className: "flex justify-between items-center border-t pt-2 mt-2", children: [_jsx("span", { className: "font-medium", children: "Estimated Cost:" }), _jsxs("span", { className: "text-lg font-bold text-primary", children: ["GHS ", estimatedCost.toFixed(2)] })] })] }), _jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Wallet, { className: "h-5 w-5 text-muted-foreground" }), _jsx("span", { children: "Wallet Balance:" })] }), _jsxs("span", { className: `font-bold ${hasSufficientBalance ? 'text-green-600' : 'text-red-500'}`, children: ["GHS ", profile?.walletBalance?.toFixed(2) || '0.00'] })] }), hasSufficientBalance && (_jsxs(Button, { className: "w-full", size: "lg", onClick: handlePayWithWallet, children: [_jsx(CheckCircle2, { className: "mr-2 h-5 w-5" }), "Pay GHS ", estimatedCost.toFixed(2), " from Wallet"] })), !hasSufficientBalance && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-amber-600", children: [_jsx(AlertCircle, { className: "h-5 w-5" }), _jsx("span", { className: "text-sm", children: "Insufficient balance. Top up to continue." })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Top Up Amount (GHS)" }), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [[2, 5, 10, 20].map((amount) => (_jsx(Button, { variant: topUpAmount === amount ? 'default' : 'outline', size: "sm", onClick: () => setTopUpAmount(amount), children: amount }, amount))), _jsx(Input, { type: "number", value: topUpAmount, onChange: (e) => setTopUpAmount(Number(e.target.value)), className: "w-20", min: 1 })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "phone", children: "Mobile Money Number" }), _jsxs("div", { className: "relative", children: [_jsx(Phone, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { id: "phone", type: "tel", placeholder: "024 XXX XXXX", value: phoneNumber, onChange: (e) => setPhoneNumber(e.target.value), className: "pl-10" })] }), selectedProvider && (_jsxs("p", { className: "text-sm text-green-600 flex items-center gap-1", children: [_jsx(CheckCircle2, { className: "h-4 w-4" }), "Detected: ", selectedProvider.name] }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Select Provider" }), _jsx(RadioGroup, { value: selectedProvider?.id || '', onValueChange: (value) => {
                                                const provider = MOBILE_MONEY_PROVIDERS.find(p => p.id === value);
                                                setSelectedProvider(provider || null);
                                            }, className: "grid grid-cols-3 gap-2", children: MOBILE_MONEY_PROVIDERS.map((provider) => (_jsxs("div", { children: [_jsx(RadioGroupItem, { value: provider.id, id: provider.id, className: "peer sr-only" }), _jsxs(Label, { htmlFor: provider.id, className: "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer", children: [_jsx("span", { className: "text-2xl mb-1", children: provider.icon }), _jsx("span", { className: "text-xs text-center", children: provider.name.split(' ')[0] })] })] }, provider.id))) })] }), _jsx(Button, { className: "w-full", size: "lg", onClick: handleMobileMoneyPayment, disabled: processing || !phoneNumber || !selectedProvider, children: processing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-5 w-5 animate-spin" }), "Processing..."] })) : (_jsxs(_Fragment, { children: [_jsx(CreditCard, { className: "mr-2 h-5 w-5" }), "Top Up GHS ", topUpAmount.toFixed(2)] })) }), _jsxs("p", { className: "text-xs text-muted-foreground text-center flex items-center justify-center gap-1", children: [_jsx(Info, { className: "h-3 w-3" }), "You'll receive a prompt on your phone to approve payment"] })] }))] }), _jsxs(CardFooter, { className: "flex justify-between", children: [_jsx(Button, { variant: "ghost", onClick: onCancel, children: "Cancel" }), !hasSufficientBalance && (_jsx(Button, { variant: "outline", onClick: loadPaymentInfo, children: "Refresh Balance" }))] })] }) }));
}
export default PaymentWall;
