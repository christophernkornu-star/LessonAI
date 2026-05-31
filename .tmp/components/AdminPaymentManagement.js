import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Admin Payment Management Component
 * Allows admins to manage user payment exemptions and view transactions
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Users, Settings, CreditCard, Wallet, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getAllUserPaymentProfiles, setPaymentExemption, addFundsToWallet, getPaymentSettings, updatePaymentSettings, } from '@/services/paymentService';
export function AdminPaymentManagement() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [settings, setSettings] = useState(null);
    // Dialog states
    const [selectedUser, setSelectedUser] = useState(null);
    const [exemptDialogOpen, setExemptDialogOpen] = useState(false);
    const [fundDialogOpen, setFundDialogOpen] = useState(false);
    const [exemptionReason, setExemptionReason] = useState('');
    const [fundAmount, setFundAmount] = useState(10);
    const [fundReason, setFundReason] = useState('');
    const [processing, setProcessing] = useState(false);
    useEffect(() => {
        loadData();
    }, []);
    useEffect(() => {
        // Filter users based on search query
        if (!searchQuery) {
            setFilteredUsers(users);
        }
        else {
            const query = searchQuery.toLowerCase();
            setFilteredUsers(users.filter(u => u.profiles?.email?.toLowerCase().includes(query) ||
                u.profiles?.full_name?.toLowerCase().includes(query)));
        }
    }, [searchQuery, users]);
    async function loadData() {
        setLoading(true);
        try {
            const [usersData, settingsData] = await Promise.all([
                getAllUserPaymentProfiles(),
                getPaymentSettings(),
            ]);
            setUsers(usersData);
            setFilteredUsers(usersData);
            setSettings(settingsData);
        }
        catch (error) {
            console.error('Error loading payment data:', error);
            toast.error('Failed to load payment data');
        }
        finally {
            setLoading(false);
        }
    }
    async function handleToggleExemption(user) {
        if (user.is_payment_exempt) {
            // Removing exemption - do directly
            setProcessing(true);
            const result = await setPaymentExemption(user.user_id, false);
            setProcessing(false);
            if (result.success) {
                toast.success('Payment exemption removed');
                loadData();
            }
            else {
                toast.error(result.error || 'Failed to update exemption');
            }
        }
        else {
            // Adding exemption - show dialog for reason
            setSelectedUser(user);
            setExemptionReason('');
            setExemptDialogOpen(true);
        }
    }
    async function handleConfirmExemption() {
        if (!selectedUser)
            return;
        setProcessing(true);
        const result = await setPaymentExemption(selectedUser.user_id, true, exemptionReason || 'Admin granted exemption');
        setProcessing(false);
        if (result.success) {
            toast.success('Payment exemption granted');
            setExemptDialogOpen(false);
            loadData();
        }
        else {
            toast.error(result.error || 'Failed to grant exemption');
        }
    }
    async function handleAddFunds() {
        if (!selectedUser || fundAmount <= 0)
            return;
        setProcessing(true);
        const result = await addFundsToWallet(selectedUser.user_id, fundAmount, fundReason || 'Admin credit');
        setProcessing(false);
        if (result.success) {
            toast.success(`Added GHS ${fundAmount.toFixed(2)} to wallet`);
            setFundDialogOpen(false);
            loadData();
        }
        else {
            toast.error(result.error || 'Failed to add funds');
        }
    }
    async function handleUpdateSetting(key, value) {
        const result = await updatePaymentSettings({ [key]: value });
        if (result.success) {
            toast.success('Setting updated');
            loadData();
        }
        else {
            toast.error(result.error || 'Failed to update setting');
        }
    }
    if (loading) {
        return (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin text-primary" }), _jsx("span", { className: "ml-3", children: "Loading payment management..." })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-2xl font-bold flex items-center gap-2", children: [_jsx(CreditCard, { className: "h-6 w-6" }), "Payment Management"] }), _jsx("p", { className: "text-muted-foreground", children: "Manage user payments and exemptions" })] }), _jsxs(Button, { onClick: loadData, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), "Refresh"] })] }), _jsxs(Tabs, { defaultValue: "users", children: [_jsxs(TabsList, { className: "w-full flex justify-start overflow-x-auto pb-4 mb-4 gap-2 bg-transparent p-0 border-b border-border/50 h-auto", children: [_jsxs(TabsTrigger, { value: "users", className: "flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm rounded-xl px-4 py-2.5 transition-all w-full sm:w-auto hover:bg-background/80 data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20", children: [_jsx(Users, { className: "h-4 w-4" }), "Users"] }), _jsxs(TabsTrigger, { value: "settings", className: "flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm rounded-xl px-4 py-2.5 transition-all w-full sm:w-auto hover:bg-background/80 data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20", children: [_jsx(Settings, { className: "h-4 w-4" }), "Pricing Settings"] })] }), _jsxs(TabsContent, { value: "users", className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "relative flex-1 max-w-sm", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Search by name or email...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "pl-10" })] }), _jsxs(Badge, { variant: "secondary", children: [filteredUsers.length, " users"] })] }), _jsx("div", { className: "flex flex-col gap-4", children: filteredUsers.length === 0 ? (_jsx("div", { className: "p-8 text-center bg-background/50 backdrop-blur-sm border border-secondary/20 shadow-sm rounded-2xl", children: _jsx("p", { className: "text-muted-foreground", children: "No users found." }) })) : (filteredUsers.map((user) => (_jsxs("div", { className: "group overflow-hidden rounded-2xl border border-secondary/20 bg-background/50 backdrop-blur-sm transition-all shadow-sm hover:shadow-md hover:border-primary/30 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6", children: [_jsxs("div", { className: "flex items-center gap-4 flex-1", children: [_jsx("div", { className: "h-12 w-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0", children: _jsx("span", { className: "text-lg font-bold text-primary", children: (user.profiles?.full_name || user.profiles?.email || 'U')[0].toUpperCase() }) }), _jsxs("div", { className: "overflow-hidden space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "font-bold text-base sm:text-lg text-foreground tracking-tight truncate", children: user.profiles?.full_name || 'Unknown User' }), user.profiles?.role === 'admin' && (_jsx(Badge, { variant: "default", className: "text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full", children: "Admin" })), user.is_payment_exempt && (_jsx(Badge, { className: "bg-green-500/15 text-green-700 border-0 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full", children: "Exempt" }))] }), _jsx("div", { className: "text-sm text-muted-foreground truncate w-full", title: user.profiles?.email, children: user.profiles?.email })] })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4 xl:gap-8 flex-1 max-w-full lg:max-w-xl self-start md:self-auto min-w-[200px]", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold", children: "Balance" }), _jsxs("span", { className: "font-bold text-sm tracking-tight text-foreground bg-primary/10 rounded-md px-2.5 py-1 inline-block w-max border border-primary/10", children: ["GHS ", parseFloat(user.wallet_balance).toFixed(2)] })] }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold", children: "Spent" }), _jsxs("span", { className: "font-semibold text-sm tracking-tight text-muted-foreground px-2.5 py-1", children: ["GHS ", parseFloat(user.total_spent).toFixed(2)] })] }), _jsxs("div", { className: "hidden md:flex flex-col", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold", children: "Tokens" }), _jsx("span", { className: "font-semibold text-sm tracking-tight text-muted-foreground px-2.5 py-1", children: user.total_tokens_used?.toLocaleString() || 0 })] })] }), _jsx("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-4 md:pt-0 border-t md:border-none border-secondary/20", children: _jsxs("div", { className: "flex items-center justify-between sm:justify-start w-full gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 bg-secondary/30 rounded-full px-3 py-1.5 border border-secondary/50", children: [_jsx(Label, { htmlFor: "exempt-" + user.id, className: "text-xs font-semibold cursor-pointer whitespace-nowrap", children: user.is_payment_exempt ? 'Payment Exempt' : 'Require Payment' }), _jsx(Switch, { id: "exempt-" + user.id, checked: user.is_payment_exempt, onCheckedChange: () => handleToggleExemption(user), disabled: processing, className: "data-[state=checked]:bg-green-600 scale-75 origin-left" })] }), _jsxs(Button, { variant: "default", size: "sm", className: "rounded-full shadow-sm transition-colors text-xs font-semibold h-8", onClick: () => {
                                                            setSelectedUser(user);
                                                            setFundAmount(10);
                                                            setFundReason('');
                                                            setFundDialogOpen(true);
                                                        }, children: [_jsx(Wallet, { className: "h-3.5 w-3.5 mr-1.5" }), "Add Funds"] })] }) })] }, user.id)))) })] }), _jsx(TabsContent, { value: "settings", className: "space-y-4", children: _jsxs(Card, { className: "group relative overflow-hidden rounded-2xl border border-secondary/20 bg-background/50 backdrop-blur-sm transition-all shadow-xl hover:shadow-2xl hover:border-primary/20", children: [_jsxs(CardHeader, { className: "pb-4", children: [_jsx(CardTitle, { className: "text-xl font-bold tracking-tight", children: "Pricing Configuration" }), _jsx(CardDescription, { children: "Configure token pricing and platform fees" })] }), _jsx(CardContent, { className: "space-y-6", children: settings && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Price per 1000 Tokens (GHS)" }), _jsx(Input, { type: "number", step: "0.0001", value: settings.tokenPricePer1000, onChange: (e) => {
                                                                    const value = parseFloat(e.target.value);
                                                                    setSettings({ ...settings, tokenPricePer1000: value });
                                                                }, onBlur: () => handleUpdateSetting('token_price_per_1000', settings.tokenPricePer1000) }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Base cost for AI token usage" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Platform Fee (%)" }), _jsx(Input, { type: "number", value: settings.platformFeePercent, onChange: (e) => {
                                                                    const value = parseFloat(e.target.value);
                                                                    setSettings({ ...settings, platformFeePercent: value });
                                                                }, onBlur: () => handleUpdateSetting('platform_fee_percent', settings.platformFeePercent) }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Profit margin on top of AI costs" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Minimum Charge (GHS)" }), _jsx(Input, { type: "number", step: "0.01", value: settings.minimumCharge, onChange: (e) => {
                                                                    const value = parseFloat(e.target.value);
                                                                    setSettings({ ...settings, minimumCharge: value });
                                                                }, onBlur: () => handleUpdateSetting('minimum_charge', settings.minimumCharge) }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Minimum amount per generation" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Free Daily Tokens" }), _jsx(Input, { type: "number", value: settings.freeTokensDaily, onChange: (e) => {
                                                                    const value = parseInt(e.target.value);
                                                                    setSettings({ ...settings, freeTokensDaily: value });
                                                                }, onBlur: () => handleUpdateSetting('free_daily_tokens', settings.freeTokensDaily) }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Free tokens per user per day (0 = none)" })] })] }), _jsxs("div", { className: "bg-muted/50 rounded-lg p-4 mt-6", children: [_jsx("h4", { className: "font-medium mb-3", children: "Cost Preview" }), _jsxs("div", { className: "grid grid-cols-3 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "1 Lesson (~4000 tokens)" }), _jsxs("p", { className: "font-mono font-bold", children: ["GHS ", Math.max(settings.minimumCharge, (4000 / 1000) * settings.tokenPricePer1000 * (1 + settings.platformFeePercent / 100)).toFixed(2)] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "3 Lessons (~10000 tokens)" }), _jsxs("p", { className: "font-mono font-bold", children: ["GHS ", Math.max(settings.minimumCharge, (10000 / 1000) * settings.tokenPricePer1000 * (1 + settings.platformFeePercent / 100)).toFixed(2)] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "5 Lessons (~15000 tokens)" }), _jsxs("p", { className: "font-mono font-bold", children: ["GHS ", Math.max(settings.minimumCharge, (15000 / 1000) * settings.tokenPricePer1000 * (1 + settings.platformFeePercent / 100)).toFixed(2)] })] })] })] })] })) })] }) })] }), _jsx(Dialog, { open: exemptDialogOpen, onOpenChange: setExemptDialogOpen, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Grant Payment Exemption" }), _jsx(DialogDescription, { children: "This user will not be charged for lesson generations." })] }), _jsxs("div", { className: "space-y-4 py-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "User" }), _jsx("p", { className: "text-sm", children: selectedUser?.profiles?.full_name || selectedUser?.profiles?.email })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "reason", children: "Reason for Exemption" }), _jsx(Textarea, { id: "reason", placeholder: "e.g., Beta tester, Partner school, etc.", value: exemptionReason, onChange: (e) => setExemptionReason(e.target.value) })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setExemptDialogOpen(false), children: "Cancel" }), _jsxs(Button, { onClick: handleConfirmExemption, disabled: processing, children: [processing ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : null, "Grant Exemption"] })] })] }) }), _jsx(Dialog, { open: fundDialogOpen, onOpenChange: setFundDialogOpen, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Add Funds to Wallet" }), _jsx(DialogDescription, { children: "Credit this user's wallet balance." })] }), _jsxs("div", { className: "space-y-4 py-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "User" }), _jsx("p", { className: "text-sm", children: selectedUser?.profiles?.full_name || selectedUser?.profiles?.email }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Current balance: GHS ", parseFloat(selectedUser?.wallet_balance || '0').toFixed(2)] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "amount", children: "Amount (GHS)" }), _jsx(Input, { id: "amount", type: "number", step: "0.01", value: fundAmount, onChange: (e) => setFundAmount(parseFloat(e.target.value)) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "fundReason", children: "Reason (optional)" }), _jsx(Textarea, { id: "fundReason", placeholder: "e.g., Promotional credit, Refund, etc.", value: fundReason, onChange: (e) => setFundReason(e.target.value) })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setFundDialogOpen(false), children: "Cancel" }), _jsxs(Button, { onClick: handleAddFunds, disabled: processing || fundAmount <= 0, children: [processing ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : null, "Add GHS ", fundAmount.toFixed(2)] })] })] }) })] }));
}
export default AdminPaymentManagement;
