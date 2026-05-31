import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { checkIsAdmin } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { toast } = useToast();
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Sign in with Supabase Auth
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (signInError) {
                throw new Error(signInError.message);
            }
            if (!data.user) {
                throw new Error('Login failed');
            }
            // Check suspension logic
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_suspended')
                .eq('id', data.user.id)
                .single();
            if (profile?.is_suspended) {
                await supabase.auth.signOut();
                throw new Error("Your account has been suspended.");
            }
            // Check if user is admin
            const isAdmin = await checkIsAdmin();
            if (!isAdmin) {
                // Sign out non-admin users
                await supabase.auth.signOut();
                setError('Access denied. This portal is for administrators only.');
                setLoading(false);
                return;
            }
            toast({
                title: 'Login successful',
                description: 'Welcome to the admin dashboard',
            });
            navigate('/admin/dashboard');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4", children: _jsxs(Card, { className: "w-full max-w-md shadow-2xl", children: [_jsxs(CardHeader, { className: "text-center space-y-4", children: [_jsx("div", { className: "mx-auto bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center", children: _jsx(Shield, { className: "w-8 h-8 text-white" }) }), _jsx(CardTitle, { className: "text-3xl font-bold", children: "Admin Portal" }), _jsx(CardDescription, { children: "Sign in with your administrator credentials" })] }), _jsx(CardContent, { children: _jsxs("form", { onSubmit: handleLogin, className: "space-y-6", children: [error && (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) })), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "email", children: "Email Address" }), _jsx(Input, { id: "email", type: "email", placeholder: "admin@example.com", value: email, onChange: (e) => setEmail(e.target.value), required: true, disabled: loading })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "password", children: "Password" }), _jsx(Input, { id: "password", type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: password, onChange: (e) => setPassword(e.target.value), required: true, disabled: loading })] }), _jsx(Button, { type: "submit", className: "w-full bg-indigo-600 hover:bg-indigo-700", disabled: loading, children: loading ? 'Signing in...' : 'Sign In' }), _jsx("div", { className: "text-center text-sm text-gray-600", children: _jsx("button", { type: "button", onClick: () => navigate('/'), className: "text-indigo-600 hover:text-indigo-700 font-medium", children: "\u2190 Back to Home" }) })] }) })] }) }));
};
export default AdminLogin;
