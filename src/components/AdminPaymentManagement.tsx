/**
 * Admin Payment Management Component
 * Allows admins to manage user payment exemptions and view transactions
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Users, Settings, CreditCard, Shield, Wallet, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllUserPaymentProfiles,
  setPaymentExemption,
  addFundsToWallet,
  getPaymentSettings,
  updatePaymentSettings,
  type PaymentSettings,
} from '@/services/paymentService';
import { supabase } from '@/integrations/supabase/client';

interface UserPaymentData {
  id: string;
  user_id: string;
  is_payment_exempt: boolean;
  exemption_reason?: string;
  wallet_balance: string;
  total_spent: string;
  total_tokens_used: number;
  profiles?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export function AdminPaymentManagement() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserPaymentData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserPaymentData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState<UserPaymentData | null>(null);
  const [exemptDialogOpen, setExemptDialogOpen] = useState(false);
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [exemptionReason, setExemptionReason] = useState('');
  const [fundAmount, setFundAmount] = useState<number>(10);
  const [fundReason, setFundReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Filter users based on search query
    if (!searchQuery) {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(users.filter(u => 
        u.profiles?.email?.toLowerCase().includes(query) ||
        u.profiles?.full_name?.toLowerCase().includes(query)
      ));
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
    } catch (error) {
      console.error('Error loading payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleExemption(user: UserPaymentData) {
    if (user.is_payment_exempt) {
      // Removing exemption - do directly
      setProcessing(true);
      const result = await setPaymentExemption(user.user_id, false);
      setProcessing(false);
      
      if (result.success) {
        toast.success('Payment exemption removed');
        loadData();
      } else {
        toast.error(result.error || 'Failed to update exemption');
      }
    } else {
      // Adding exemption - show dialog for reason
      setSelectedUser(user);
      setExemptionReason('');
      setExemptDialogOpen(true);
    }
  }

  async function handleConfirmExemption() {
    if (!selectedUser) return;

    setProcessing(true);
    const result = await setPaymentExemption(
      selectedUser.user_id,
      true,
      exemptionReason || 'Admin granted exemption'
    );
    setProcessing(false);

    if (result.success) {
      toast.success('Payment exemption granted');
      setExemptDialogOpen(false);
      loadData();
    } else {
      toast.error(result.error || 'Failed to grant exemption');
    }
  }

  async function handleAddFunds() {
    if (!selectedUser || fundAmount <= 0) return;

    setProcessing(true);
    const result = await addFundsToWallet(
      selectedUser.user_id,
      fundAmount,
      fundReason || 'Admin credit'
    );
    setProcessing(false);

    if (result.success) {
      toast.success(`Added GHS ${fundAmount.toFixed(2)} to wallet`);
      setFundDialogOpen(false);
      loadData();
    } else {
      toast.error(result.error || 'Failed to add funds');
    }
  }

  async function handleUpdateSetting(key: string, value: any) {
    const result = await updatePaymentSettings({ [key]: value });
    if (result.success) {
      toast.success('Setting updated');
      loadData();
    } else {
      toast.error(result.error || 'Failed to update setting');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3">Loading payment management...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Payment Management
          </h2>
          <p className="text-muted-foreground">Manage user payments and exemptions</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Pricing Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">{filteredUsers.length} users</Badge>
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Tokens Used</TableHead>
                    <TableHead>Exempt</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{user.profiles?.email}</p>
                          {user.profiles?.role && (
                            <Badge variant="outline" className="text-xs">
                              {user.profiles.role}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">GHS {parseFloat(user.wallet_balance).toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">GHS {parseFloat(user.total_spent).toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{user.total_tokens_used?.toLocaleString() || 0}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.is_payment_exempt}
                            onCheckedChange={() => handleToggleExemption(user)}
                            disabled={processing}
                          />
                          {user.is_payment_exempt && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              Exempt
                            </Badge>
                          )}
                        </div>
                        {user.exemption_reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {user.exemption_reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setFundAmount(10);
                            setFundReason('');
                            setFundDialogOpen(true);
                          }}
                        >
                          <Wallet className="h-4 w-4 mr-1" />
                          Add Funds
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Configuration</CardTitle>
              <CardDescription>Configure token pricing and platform fees</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price per 1000 Tokens (GHS)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={settings.tokenPricePer1000}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setSettings({ ...settings, tokenPricePer1000: value });
                        }}
                        onBlur={() => handleUpdateSetting('token_price_per_1000', {
                          amount: settings.tokenPricePer1000,
                          currency: 'GHS'
                        })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Base cost for AI token usage
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Platform Fee (%)</Label>
                      <Input
                        type="number"
                        value={settings.platformFeePercent}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setSettings({ ...settings, platformFeePercent: value });
                        }}
                        onBlur={() => handleUpdateSetting('platform_fee_percent', {
                          percent: settings.platformFeePercent
                        })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Profit margin on top of AI costs
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Minimum Charge (GHS)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.minimumCharge}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setSettings({ ...settings, minimumCharge: value });
                        }}
                        onBlur={() => handleUpdateSetting('minimum_charge', {
                          amount: settings.minimumCharge,
                          currency: 'GHS'
                        })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum amount per generation
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Free Daily Tokens</Label>
                      <Input
                        type="number"
                        value={settings.freeTokensDaily}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setSettings({ ...settings, freeTokensDaily: value });
                        }}
                        onBlur={() => handleUpdateSetting('free_tokens_daily', {
                          amount: settings.freeTokensDaily
                        })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Free tokens per user per day (0 = none)
                      </p>
                    </div>
                  </div>

                  {/* Cost Calculator Preview */}
                  <div className="bg-muted/50 rounded-lg p-4 mt-6">
                    <h4 className="font-medium mb-3">Cost Preview</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">1 Lesson (~4000 tokens)</p>
                        <p className="font-mono font-bold">
                          GHS {Math.max(
                            settings.minimumCharge,
                            (4000 / 1000) * settings.tokenPricePer1000 * (1 + settings.platformFeePercent / 100)
                          ).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">3 Lessons (~10000 tokens)</p>
                        <p className="font-mono font-bold">
                          GHS {Math.max(
                            settings.minimumCharge,
                            (10000 / 1000) * settings.tokenPricePer1000 * (1 + settings.platformFeePercent / 100)
                          ).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">5 Lessons (~15000 tokens)</p>
                        <p className="font-mono font-bold">
                          GHS {Math.max(
                            settings.minimumCharge,
                            (15000 / 1000) * settings.tokenPricePer1000 * (1 + settings.platformFeePercent / 100)
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Exemption Dialog */}
      <Dialog open={exemptDialogOpen} onOpenChange={setExemptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Payment Exemption</DialogTitle>
            <DialogDescription>
              This user will not be charged for lesson generations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User</Label>
              <p className="text-sm">
                {selectedUser?.profiles?.full_name || selectedUser?.profiles?.email}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Exemption</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Beta tester, Partner school, etc."
                value={exemptionReason}
                onChange={(e) => setExemptionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExemptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmExemption} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Grant Exemption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Funds Dialog */}
      <Dialog open={fundDialogOpen} onOpenChange={setFundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Funds to Wallet</DialogTitle>
            <DialogDescription>
              Credit this user's wallet balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User</Label>
              <p className="text-sm">
                {selectedUser?.profiles?.full_name || selectedUser?.profiles?.email}
              </p>
              <p className="text-xs text-muted-foreground">
                Current balance: GHS {parseFloat(selectedUser?.wallet_balance || '0').toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (GHS)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={fundAmount}
                onChange={(e) => setFundAmount(parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fundReason">Reason (optional)</Label>
              <Textarea
                id="fundReason"
                placeholder="e.g., Promotional credit, Refund, etc."
                value={fundReason}
                onChange={(e) => setFundReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFundDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFunds} disabled={processing || fundAmount <= 0}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add GHS {fundAmount.toFixed(2)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminPaymentManagement;
