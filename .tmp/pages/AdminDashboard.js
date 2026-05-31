import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { checkIsAdmin, uploadResourceFile, getAllResourceFiles, deleteResourceFile, updateResourceFile, getUserStats, getContentStats, getAIUsageStats, getAllUserLessonCounts, toggleUserSuspension, togglePaymentExemption, deleteUserAccount, getSystemSetting, updateSystemSetting, } from '@/services/adminService';
import * as AnalyticsService from '@/services/analyticsService';
import { CurriculumService } from '@/services/curriculumService';
import { AdminPaymentManagement } from '@/components/AdminPaymentManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Download, Trash2, Edit, LogOut, FileCheck, BookOpen, FolderOpen, X, BarChart3, Users, Activity, TrendingUp, DollarSign, AlertTriangle, CreditCard, } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
import { SimplePieChart } from '@/components/charts/SimplePieChart';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { DashboardSkeleton } from "@/components/LoadingSkeletons";
const AdminDashboard = () => {
    const [loading, setLoading] = useState(true); // Initial loading true
    const [files, setFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('curriculum');
    const navigate = useNavigate();
    const { toast } = useToast();
    // Upload form state
    const [uploadFile, setUploadFile] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [gradeLevels, setGradeLevels] = useState([]);
    const [subject, setSubject] = useState('');
    const [tags, setTags] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [uploading, setUploading] = useState(false);
    // Global Curriculum Stats
    const [globalStats, setGlobalStats] = useState(null);
    // Analytics state
    const [userStats, setUserStats] = useState(null);
    const [contentStats, setContentStats] = useState(null);
    const [aiStats, setAIStats] = useState(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    const [lessonsBySubject, setLessonsBySubject] = useState([]);
    const [lessonsByTemplate, setLessonsByTemplate] = useState([]);
    const [monthlyTrends, setMonthlyTrends] = useState([]);
    const [userActivity, setUserActivity] = useState([]);
    // Users Tab Data
    const [userLessonsData, setUserLessonsData] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [allowSignups, setAllowSignups] = useState(true);
    const loadUserLessons = async () => {
        setLoadingUsers(true);
        try {
            const [data, signupsEnabled] = await Promise.all([
                getAllUserLessonCounts(),
                getSystemSetting('allow_signups')
            ]);
            setUserLessonsData(data);
            setAllowSignups(signupsEnabled);
        }
        catch (error) {
            console.error("Error loading user lessons", error);
            toast({
                title: "Error",
                description: "Failed to load user data",
                variant: "destructive"
            });
        }
        finally {
            setLoadingUsers(false);
        }
    };
    const loadStats = async () => {
        try {
            if (activeTab === 'analytics') {
                const [users, content, ai, subjects, templates, trends, activity] = await Promise.all([
                    getUserStats(),
                    getContentStats(),
                    getAIUsageStats(30),
                    AnalyticsService.getLessonsBySubject(),
                    AnalyticsService.getLessonsByTemplate(),
                    AnalyticsService.getMonthlyTrends(undefined, 12),
                    AnalyticsService.getUserActivityData(10),
                ]);
                setUserStats(users);
                setContentStats(content);
                setAIStats(ai);
                setLessonsBySubject(subjects.map((d) => ({ name: d.subject, value: d.count })));
                setLessonsByTemplate(templates.map((d) => ({ name: d.template_name, value: d.count })));
                setMonthlyTrends(trends.map((d) => ({ month: d.month, count: d.count })));
                setUserActivity(activity);
            }
        }
        catch (error) {
            console.error("Error loading stats:", error);
        }
    };
    const loadGlobalCurriculumStats = async () => {
        try {
            const stats = await CurriculumService.getGlobalStats();
            setGlobalStats(stats);
        }
        catch (e) {
            console.error("Error loading global stats", e);
        }
    };
    const checkAdminAccess = async () => {
        const isAdmin = await checkIsAdmin();
        if (!isAdmin) {
            toast({
                title: 'Access Denied',
                description: 'You do not have administrator privileges',
                variant: 'destructive',
            });
            navigate('/');
        }
    };
    const loadFiles = async () => {
        setLoading(true);
        try {
            const fileType = activeTab;
            const data = await getAllResourceFiles(fileType);
            setFiles(data);
        }
        catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to load files',
                variant: 'destructive',
            });
        }
        finally {
            setLoading(false);
        }
    };
    const loadAnalytics = async () => {
        setLoadingAnalytics(true);
        try {
            const [users, content, ai, subjects, templates, trends, activity] = await Promise.all([
                getUserStats(),
                getContentStats(),
                getAIUsageStats(30),
                AnalyticsService.getLessonsBySubject(),
                AnalyticsService.getLessonsByTemplate(),
                AnalyticsService.getMonthlyTrends(undefined, 12),
                AnalyticsService.getUserActivityData(10),
            ]);
            setUserStats(users);
            setContentStats(content);
            setAIStats(ai);
            setLessonsBySubject(subjects.map((d) => ({ name: d.subject, value: d.count })));
            setLessonsByTemplate(templates.map((d) => ({ name: d.template_name, value: d.count })));
            setMonthlyTrends(trends.map((d) => ({ month: d.month, count: d.count })));
            setUserActivity(activity);
        }
        catch (error) {
            console.error("Error loading analytics:", error);
        }
        finally {
            setLoadingAnalytics(false);
        }
    };
    const handleToggleSignups = async (checked) => {
        try {
            await updateSystemSetting('allow_signups', checked);
            setAllowSignups(checked);
            toast({
                title: "Success",
                description: `Sign-ups ${checked ? 'enabled' : 'disabled'}`
            });
        }
        catch (error) {
            toast({
                title: "Error",
                description: "Failed to update signup setting",
                variant: "destructive"
            });
        }
    };
    const handleToggleExemption = async (userId, currentStatus, name) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'remove payment exemption for' : 'exempt from payment'} ${name}?`))
            return;
        try {
            await togglePaymentExemption(userId, !currentStatus);
            // Update local state
            setUserLessonsData(prev => prev.map(u => u.userId === userId ? { ...u, isPaymentExempt: !currentStatus } : u));
            toast({
                title: "Success",
                description: `Payment exemption ${currentStatus ? 'removed' : 'added'}`
            });
        }
        catch (error) {
            toast({
                title: "Error",
                description: "Failed to update exemption status",
                variant: "destructive"
            });
        }
    };
    const handleToggleSuspension = async (userId, currentStatus, name) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'activate' : 'suspend'} ${name}?`))
            return;
        try {
            await toggleUserSuspension(userId, !currentStatus);
            // Update local state
            setUserLessonsData(prev => prev.map(u => u.userId === userId ? { ...u, isSuspended: !currentStatus } : u));
            toast({
                title: "Success",
                description: `User ${currentStatus ? 'activated' : 'suspended'} successfully`
            });
        }
        catch (error) {
            toast({
                title: "Error",
                description: "Failed to update user status",
                variant: "destructive"
            });
        }
    };
    const handleDeleteUserAccount = async (userId, name) => {
        if (!confirm(`WARNING: Are you sure you want to permanently delete the account for ${name}? This action cannot be undone and will erase all their lesson plans and data.`))
            return;
        if (!confirm('FINAL WARNING: This user will be completely purged from the database. Click OK to proceed.'))
            return;
        try {
            await deleteUserAccount(userId);
            // Update local state
            setUserLessonsData(prev => prev.filter(u => u.userId !== userId));
            toast({
                title: "Account Deleted",
                description: `User ${name} has been permanently removed from the system.`
            });
        }
        catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete user account",
                variant: "destructive"
            });
        }
    };
    const verifyAdmin = async () => {
        setLoading(true);
        const isAdmin = await checkIsAdmin();
        if (!isAdmin) {
            navigate('/');
            return;
        }
        loadFiles();
        loadStats();
        loadGlobalCurriculumStats();
        setLoading(false);
    };
    useEffect(() => {
        verifyAdmin();
    }, [activeTab]);
    useEffect(() => {
        if (activeTab === 'curriculum') {
            CurriculumService.getGlobalStats().then(setGlobalStats);
        }
    }, [activeTab]);
    useEffect(() => {
        checkAdminAccess();
        if (activeTab === 'analytics') {
            loadAnalytics();
        }
        else if (activeTab === 'users') {
            loadUserLessons();
        }
        else {
            loadFiles();
        }
    }, [activeTab]);
    if (loading) {
        return _jsx(DashboardSkeleton, {});
    }
    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) {
            toast({
                title: 'Error',
                description: 'Please select a file to upload',
                variant: 'destructive',
            });
            return;
        }
        setUploading(true);
        try {
            const fileType = activeTab;
            const tagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
            // Join multiple grade levels with comma
            const gradeLevelString = gradeLevels.join(', ');
            await uploadResourceFile({
                file: uploadFile,
                fileType,
                title,
                description,
                gradeLevel: gradeLevelString,
                subject,
                tags: tagsArray,
                isPublic,
            });
            toast({
                title: 'Success',
                description: 'File uploaded successfully',
            });
            // Reset form
            setUploadFile(null);
            setTitle('');
            setDescription('');
            setGradeLevels([]);
            setSubject('');
            setTags('');
            setIsPublic(true);
            // Reload files
            loadFiles();
        }
        catch (error) {
            toast({
                title: 'Upload Failed',
                description: error instanceof Error ? error.message : 'Failed to upload file',
                variant: 'destructive',
            });
        }
        finally {
            setUploading(false);
        }
    };
    const handleDeleteFile = async (fileId) => {
        if (!confirm('Are you sure you want to delete this file?'))
            return;
        try {
            await deleteResourceFile(fileId);
            toast({
                title: 'Success',
                description: 'File deleted successfully',
            });
            loadFiles();
        }
        catch (error) {
            toast({
                title: 'Delete Failed',
                description: error instanceof Error ? error.message : 'Failed to delete file',
                variant: 'destructive',
            });
        }
    };
    const handleTogglePublic = async (fileId, currentStatus) => {
        try {
            await updateResourceFile(fileId, { is_public: !currentStatus });
            toast({
                title: 'Success',
                description: `File ${!currentStatus ? 'published' : 'unpublished'}`,
            });
            loadFiles();
        }
        catch (error) {
            toast({
                title: 'Update Failed',
                description: error instanceof Error ? error.message : 'Failed to update file',
                variant: 'destructive',
            });
        }
    };
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };
    const getFileIcon = () => {
        switch (activeTab) {
            case 'curriculum':
                return _jsx(BookOpen, { className: "w-5 h-5" });
            case 'template':
                return _jsx(FileText, { className: "w-5 h-5" });
            case 'resource':
                return _jsx(FolderOpen, { className: "w-5 h-5" });
            default:
                return _jsx(FileCheck, { className: "w-5 h-5" });
        }
    };
    const formatFileSize = (bytes) => {
        if (!bytes)
            return 'Unknown';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx("div", { className: "bg-white shadow", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Admin Dashboard" }), _jsxs(Button, { variant: "outline", onClick: handleLogout, children: [_jsx(LogOut, { className: "w-4 h-4 mr-2" }), "Logout"] })] }) }) }), _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: _jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, children: [_jsxs(TabsList, { className: "flex h-auto w-full max-w-full items-center justify-between gap-1 sm:gap-2 rounded-2xl bg-[#F8F9FA] p-1.5 sm:p-2 border border-transparent shadow-sm mb-8", children: [_jsxs(TabsTrigger, { value: "analytics", className: "flex flex-col items-center justify-center gap-1 h-auto flex-1 min-w-0 py-2 sm:py-3 px-1 sm:px-2 rounded-xl text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm outline-none transition-all border border-transparent data-[state=active]:border-slate-100 overflow-hidden", children: [_jsx(BarChart3, { className: "w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" }), _jsx("span", { className: "text-[9px] sm:text-xs font-medium tracking-wide truncate w-full text-center", children: "Overview" })] }), _jsxs(TabsTrigger, { value: "users", className: "flex flex-col items-center justify-center gap-1 h-auto flex-1 min-w-0 py-2 sm:py-3 px-1 sm:px-2 rounded-xl text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm outline-none transition-all border border-transparent data-[state=active]:border-slate-100 overflow-hidden", children: [_jsx(Users, { className: "w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" }), _jsx("span", { className: "text-[9px] sm:text-xs font-medium tracking-wide truncate w-full text-center", children: "Users" })] }), _jsxs(TabsTrigger, { value: "payments", className: "flex flex-col items-center justify-center gap-1 h-auto flex-1 min-w-0 py-2 sm:py-3 px-1 sm:px-2 rounded-xl text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm outline-none transition-all border border-transparent data-[state=active]:border-slate-100 overflow-hidden", children: [_jsx(CreditCard, { className: "w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" }), _jsx("span", { className: "text-[9px] sm:text-xs font-medium tracking-wide truncate w-full text-center", children: "Payments" })] }), _jsxs(TabsTrigger, { value: "curriculum", className: "flex flex-col items-center justify-center gap-1 h-auto flex-1 min-w-0 py-2 sm:py-3 px-1 sm:px-2 rounded-xl text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm outline-none transition-all border border-transparent data-[state=active]:border-slate-100 overflow-hidden", children: [_jsx(BookOpen, { className: "w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" }), _jsx("span", { className: "text-[9px] sm:text-xs font-medium tracking-wide truncate w-full text-center", children: "Curriculum" })] }), _jsxs(TabsTrigger, { value: "template", className: "flex flex-col items-center justify-center gap-1 h-auto flex-1 min-w-0 py-2 sm:py-3 px-1 sm:px-2 rounded-xl text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm outline-none transition-all border border-transparent data-[state=active]:border-slate-100 overflow-hidden", children: [_jsx(FileText, { className: "w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" }), _jsx("span", { className: "text-[9px] sm:text-xs font-medium tracking-wide truncate w-full text-center", children: "Templates" })] }), _jsxs(TabsTrigger, { value: "resource", className: "flex flex-col items-center justify-center gap-1 h-auto flex-1 min-w-0 py-2 sm:py-3 px-1 sm:px-2 rounded-xl text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm outline-none transition-all border border-transparent data-[state=active]:border-slate-100 overflow-hidden", children: [_jsx(FolderOpen, { className: "w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" }), _jsx("span", { className: "text-[9px] sm:text-xs font-medium tracking-wide truncate w-full text-center", children: "Resources" })] })] }), _jsx(TabsContent, { value: "payments", children: _jsx(AdminPaymentManagement, {}) }), _jsx(TabsContent, { value: "analytics", children: loadingAnalytics ? (_jsx("div", { className: "flex justify-center items-center h-64", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-primary" }) })) : (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-semibold mb-4 flex items-center gap-2", children: [_jsx(Users, { className: "h-5 w-5" }), "User Statistics"] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { children: _jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardDescription, { children: "Total Users" }), _jsx(CardTitle, { className: "text-3xl", children: userStats?.totalUsers || 0 })] }) }), _jsx(Card, { children: _jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardDescription, { children: "Active Users (30d)" }), _jsx(CardTitle, { className: "text-3xl", children: userStats?.activeUsers || 0 })] }) }), _jsx(Card, { children: _jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardDescription, { children: "New This Month" }), _jsxs(CardTitle, { className: "text-3xl flex items-center gap-1", children: [_jsx(TrendingUp, { className: "h-5 w-5 text-green-500" }), userStats?.newUsersThisMonth || 0] })] }) }), _jsx(Card, { children: _jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardDescription, { children: "User Roles" }), _jsx("div", { className: "space-y-1 mt-2", children: Object.entries(userStats?.usersByRole || {}).map(([role, count]) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("span", { className: "capitalize", children: [role, ":"] }), _jsx(Badge, { variant: "secondary", children: count })] }, role))) })] }) })] })] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-semibold mb-4 flex items-center gap-2", children: [_jsx(Activity, { className: "h-5 w-5" }), "Content Statistics"] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { children: _jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardDescription, { children: "Total Lessons" }), _jsx(CardTitle, { className: "text-3xl", children: contentStats?.totalLessons || 0 })] }) }), _jsx(Card, { children: _jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardDescription, { children: "Custom Templates" }), _jsx(CardTitle, { className: "text-3xl", children: contentStats?.totalTemplates || 0 })] }) }), _jsx(Card, { children: _jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardDescription, { children: "Resource Library" }), _jsx(CardTitle, { className: "text-3xl", children: contentStats?.totalResources || 0 })] }) }), _jsx(Card, { children: _jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardDescription, { children: "Lessons This Month" }), _jsxs(CardTitle, { className: "text-3xl flex items-center gap-1", children: [_jsx(TrendingUp, { className: "h-5 w-5 text-green-500" }), contentStats?.lessonsThisMonth || 0] })] }) })] })] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-semibold mb-4 flex items-center gap-2", children: [_jsx(DollarSign, { className: "h-5 w-5" }), "AI Usage & Costs"] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { children: _jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardDescription, { children: "Total Requests (30d)" }), _jsx(CardTitle, { className: "text-3xl", children: aiStats?.totalRequests || 0 })] }) }), _jsx(Card, { children: _jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardDescription, { children: "Success Rate" }), _jsxs(CardTitle, { className: "text-3xl text-green-600", children: [aiStats?.totalRequests ?
                                                                            ((aiStats.successfulRequests / aiStats.totalRequests) * 100).toFixed(1)
                                                                            : 0, "%"] })] }) }), _jsx(Card, { children: _jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardDescription, { children: "Tokens Used" }), _jsx(CardTitle, { className: "text-3xl", children: (aiStats?.totalTokensUsed || 0).toLocaleString() })] }) }), _jsx(Card, { children: _jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardDescription, { children: "Estimated Cost" }), _jsxs(CardTitle, { className: "text-3xl", children: ["$", (aiStats?.estimatedCost || 0).toFixed(2)] })] }) })] }), aiStats?.requestsByType && Object.keys(aiStats.requestsByType).length > 0 && (_jsxs(Card, { className: "mt-4", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Requests by Type" }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-2", children: Object.entries(aiStats.requestsByType).map(([type, count]) => (_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "capitalize", children: type }), _jsx(Badge, { children: count })] }, type))) }) })] }))] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-semibold mb-4 flex items-center gap-2", children: [_jsx(BarChart3, { className: "h-5 w-5" }), "Platform Analytics"] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6", children: [lessonsBySubject.length > 0 && (_jsx(SimplePieChart, { title: "Lessons by Subject", description: "Distribution across all subjects", data: lessonsBySubject })), lessonsByTemplate.length > 0 && (_jsx(SimpleBarChart, { title: "Most Popular Templates", description: "Template usage count", data: lessonsByTemplate.slice(0, 10), color: "#06b6d4" }))] }), monthlyTrends.length > 0 && (_jsx("div", { className: "mb-6", children: _jsx(TrendLineChart, { title: "Lesson Creation Trends", description: "Monthly lesson generation over the last year", data: monthlyTrends, xAxisKey: "month", yAxisKey: "count", color: "#8b5cf6" }) })), userActivity.length > 0 && (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Top Contributors" }), _jsx(CardDescription, { children: "Most active users in the last 30 days" })] }), _jsx(CardContent, { children: _jsx("div", { className: "flex flex-col gap-4", children: userLessonsData.map((user) => (_jsxs("div", { className: "group overflow-hidden rounded-2xl border border-secondary/20 bg-background/50 backdrop-blur-sm transition-all shadow-sm hover:shadow-md hover:border-primary/30 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6", children: [_jsxs("div", { className: "flex items-center gap-3 sm:gap-4 flex-1 min-w-0", children: [_jsx("div", { className: "h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0", children: _jsx("span", { className: "text-base sm:text-lg font-bold text-primary", children: (user.fullName || user.email || 'U')[0].toUpperCase() }) }), _jsxs("div", { className: "flex-1 min-w-0 space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("h3", { className: "font-semibold text-foreground text-sm sm:text-base truncate max-w-[200px] sm:max-w-xs", children: user.fullName || 'Unnamed User' }), _jsx(Badge, { variant: user.role === 'admin' ? 'default' : 'secondary', className: "rounded-md px-1.5 sm:px-2 py-0 sm:py-0.5 text-[10px] sm:text-xs shrink-0", children: user.role === 'admin' ? 'Admin' : 'User' })] }), _jsx("p", { className: "text-xs sm:text-sm text-muted-foreground truncate", title: user.email, children: user.email })] })] }), _jsxs("div", { className: "flex flex-wrap sm:flex-nowrap items-stretch sm:items-center justify-between lg:justify-end gap-3 sm:gap-4 bg-black/5 dark:bg-white/5 rounded-xl p-3 sm:p-4 border border-black/5 dark:border-white/5 w-full lg:w-auto", children: [_jsxs("div", { className: "flex items-center gap-4 sm:gap-6 flex-1 lg:flex-initial pr-2 sm:pr-4 border-r border-black/10 dark:border-white/10 shrink-0", children: [_jsxs("div", { className: "flex flex-col gap-1 items-start sm:items-center min-w-[60px]", children: [_jsx("span", { className: "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider", children: "Lessons" }), _jsx("span", { className: "font-bold text-base sm:text-lg text-primary leading-none", children: user.lessonCount })] }), _jsxs("div", { className: "flex flex-col gap-1 items-start sm:items-center min-w-[70px]", children: [_jsx("span", { className: "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider", children: "Status" }), _jsx(Badge, { variant: user.isSuspended ? "destructive" : "outline", className: "w-fit text-[10px] py-0", children: user.isSuspended ? "Suspended" : "Active" })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto basis-full sm:basis-auto", children: [_jsx(Button, { variant: user.isSuspended ? "default" : "destructive", size: "sm", className: "h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-4 transition-transform active:scale-95 w-full sm:w-auto", onClick: () => handleToggleSuspension(user.userId, user.isSuspended, user.fullName), children: user.isSuspended ? "Activate" : "Suspend" }), _jsx(Button, { variant: "destructive", size: "sm", className: "h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-4 transition-transform active:scale-95 w-full sm:w-auto", onClick: () => handleDeleteUserAccount(user.userId, user.fullName), children: "Delete" })] })] })] }, user.userId))) }) })] }))] }), aiStats && aiStats.failedRequests > 0 && (_jsxs(Card, { className: "border-red-200 bg-red-50 dark:bg-red-950/20", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2 text-red-600 dark:text-red-400", children: [_jsx(AlertTriangle, { className: "h-5 w-5" }), "Error Tracking"] }), _jsx(CardDescription, { children: "AI generation failures in the last 30 days" })] }), _jsx(CardContent, { children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-muted-foreground mb-1", children: "Failed Requests" }), _jsx("div", { className: "text-2xl font-bold text-red-600", children: aiStats.failedRequests })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-muted-foreground mb-1", children: "Error Rate" }), _jsxs("div", { className: "text-2xl font-bold text-red-600", children: [aiStats.totalRequests
                                                                            ? ((aiStats.failedRequests / aiStats.totalRequests) * 100).toFixed(1)
                                                                            : 0, "%"] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-muted-foreground mb-1", children: "Success Rate" }), _jsxs("div", { className: "text-2xl font-bold text-green-600", children: [aiStats.totalRequests
                                                                            ? ((aiStats.successfulRequests / aiStats.totalRequests) * 100).toFixed(1)
                                                                            : 0, "%"] })] })] }) })] })), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { onClick: loadAnalytics, variant: "outline", children: "Refresh Analytics" }) })] })) }), _jsx(TabsContent, { value: "users", children: loadingUsers ? (_jsx("div", { className: "flex justify-center items-center h-64", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-primary" }) })) : (_jsxs("div", { className: "space-y-8", children: [_jsx(Card, { children: _jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Switch, { checked: allowSignups, onCheckedChange: handleToggleSignups }), _jsx("span", { className: allowSignups ? "text-green-600" : "text-gray-500", children: allowSignups ? "New Sign-ups Enabled" : "New Sign-ups Disabled" })] }), _jsx(CardDescription, { children: "Control whether new users can create accounts on the platform." })] }) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsx("div", { className: "h-[400px]", children: _jsx(SimpleBarChart, { title: "Top Lesson Generators", description: "Users with the most lesson notes", data: userLessonsData.slice(0, 10).map(u => ({ name: u.fullName || u.email, value: u.lessonCount })), color: "#8884d8" }) }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "User Summary" }), _jsx(CardDescription, { children: "Overall user engagement statistics" })] }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center py-2 border-b", children: [_jsx("span", { children: "Total Users" }), _jsx("span", { className: "font-bold", children: userLessonsData.length })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b", children: [_jsx("span", { children: "Active Generators (1+ lessons)" }), _jsx("span", { className: "font-bold", children: userLessonsData.filter(u => u.lessonCount > 0).length })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b", children: [_jsx("span", { children: "Total Lessons Generated" }), _jsx("span", { className: "font-bold", children: userLessonsData.reduce((acc, curr) => acc + curr.lessonCount, 0) })] })] }) })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "All Users" }), _jsx(CardDescription, { children: "List of all registered users and their lesson generation counts" })] }), _jsx(CardContent, { children: _jsx("div", { className: "flex flex-col gap-4", children: userLessonsData.map((user) => (_jsxs("div", { className: "group overflow-hidden rounded-2xl border border-secondary/20 bg-background/50 backdrop-blur-sm transition-all shadow-sm hover:shadow-md hover:border-primary/30 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6", children: [_jsxs("div", { className: "flex items-center gap-3 sm:gap-4 flex-1 min-w-0", children: [_jsx("div", { className: "h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0", children: _jsx("span", { className: "text-base sm:text-lg font-bold text-primary", children: (user.fullName || user.email || 'U')[0].toUpperCase() }) }), _jsxs("div", { className: "flex-1 min-w-0 space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("h3", { className: "font-semibold text-foreground text-sm sm:text-base truncate max-w-[200px] sm:max-w-xs", children: user.fullName || 'Unnamed User' }), _jsx(Badge, { variant: user.role === 'admin' ? 'default' : 'secondary', className: "rounded-md px-1.5 sm:px-2 py-0 sm:py-0.5 text-[10px] sm:text-xs shrink-0", children: user.role === 'admin' ? 'Admin' : 'User' })] }), _jsx("p", { className: "text-xs sm:text-sm text-muted-foreground truncate", title: user.email, children: user.email })] })] }), _jsxs("div", { className: "flex flex-wrap sm:flex-nowrap items-stretch sm:items-center justify-between lg:justify-end gap-3 sm:gap-4 bg-black/5 dark:bg-white/5 rounded-xl p-3 sm:p-4 border border-black/5 dark:border-white/5 w-full lg:w-auto", children: [_jsxs("div", { className: "flex items-center gap-4 sm:gap-6 flex-1 lg:flex-initial pr-2 sm:pr-4 border-r border-black/10 dark:border-white/10 shrink-0", children: [_jsxs("div", { className: "flex flex-col gap-1 items-start sm:items-center min-w-[60px]", children: [_jsx("span", { className: "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider", children: "Lessons" }), _jsx("span", { className: "font-bold text-base sm:text-lg text-primary leading-none", children: user.lessonCount })] }), _jsxs("div", { className: "flex flex-col gap-1 items-start sm:items-center min-w-[70px]", children: [_jsx("span", { className: "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider", children: "Status" }), _jsx(Badge, { variant: user.isSuspended ? "destructive" : "outline", className: "w-fit text-[10px] py-0", children: user.isSuspended ? "Suspended" : "Active" })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto basis-full sm:basis-auto", children: [_jsx(Button, { variant: user.isSuspended ? "default" : "destructive", size: "sm", className: "h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-4 transition-transform active:scale-95 w-full sm:w-auto", onClick: () => handleToggleSuspension(user.userId, user.isSuspended, user.fullName), children: user.isSuspended ? "Activate" : "Suspend" }), _jsx(Button, { variant: "destructive", size: "sm", className: "h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-4 transition-transform active:scale-95 w-full sm:w-auto", onClick: () => handleDeleteUserAccount(user.userId, user.fullName), children: "Delete" })] })] })] }, user.userId))) }) })] })] })) }), activeTab === 'curriculum' && (_jsxs(Card, { className: "mb-8 border-primary/20 bg-primary/5", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2 text-primary", children: [_jsx(Upload, { className: "w-5 h-5" }), "Upload Global Curriculum Data (CSV)"] }), _jsx(CardDescription, { children: "Upload structured CSV data to populate the Lesson Generator dropdowns for ALL users." })] }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-4", children: [_jsx(Button, { onClick: () => navigate('/curriculum-upload'), children: "Go to Curriculum Import Tool" }), globalStats && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-primary/10", children: [_jsxs("div", { className: "bg-background/50 p-4 rounded-lg border border-primary/10 text-center", children: [_jsx("p", { className: "text-sm text-muted-foreground mb-1", children: "Total Records" }), _jsx("p", { className: "text-3xl font-bold text-primary", children: globalStats.totalItems })] }), _jsxs("div", { className: "bg-background/50 p-4 rounded-lg border border-primary/10 text-center", children: [_jsx("p", { className: "text-sm text-muted-foreground mb-1", children: "Subjects Covered" }), _jsx("p", { className: "text-3xl font-bold text-primary", children: globalStats.uniqueSubjects })] }), _jsxs("div", { className: "bg-background/50 p-4 rounded-lg border border-primary/10 text-center", children: [_jsx("p", { className: "text-sm text-muted-foreground mb-1", children: "Class Levels" }), _jsx("p", { className: "text-3xl font-bold text-primary", children: globalStats.uniqueGrades })] })] }))] }) })] })), !['analytics', 'users', 'payments'].includes(activeTab) && (_jsxs(Card, { className: "mb-8", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [getFileIcon(), "Upload ", activeTab.charAt(0).toUpperCase() + activeTab.slice(1), " File"] }), _jsx(CardDescription, { children: "Upload PDF or DOC files. Files can be made public or private." })] }), _jsx(CardContent, { children: _jsxs("form", { onSubmit: handleFileUpload, className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "col-span-2", children: [_jsx(Label, { htmlFor: "file", children: "File (PDF, DOC, DOCX, CSV)" }), _jsxs("div", { className: "mt-2 flex items-center gap-4", children: [_jsx("input", { id: "file", type: "file", accept: ".pdf,.doc,.docx,.csv,.xlsx,.xls,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", onChange: (e) => setUploadFile(e.target.files?.[0] || null), required: true, disabled: uploading, className: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" }), uploadFile && (_jsxs(Badge, { variant: "secondary", className: "flex items-center gap-1", children: [uploadFile.name, _jsx(X, { className: "w-3 h-3 cursor-pointer", onClick: () => setUploadFile(null) })] }))] })] }), _jsxs("div", { className: "col-span-2 md:col-span-1", children: [_jsx(Label, { htmlFor: "title", children: "Title *" }), _jsx(Input, { id: "title", value: title, onChange: (e) => setTitle(e.target.value), placeholder: "Enter file title", required: true, disabled: uploading })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Class Levels (select multiple)" }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-5 gap-3 mt-2 p-4 border rounded-md", children: Array.from({ length: 10 }, (_, i) => i + 1).map((level) => {
                                                                    const levelName = `Basic ${level}`;
                                                                    return (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Checkbox, { id: `grade-${level}`, checked: gradeLevels.includes(levelName), onCheckedChange: (checked) => {
                                                                                    if (checked) {
                                                                                        setGradeLevels([...gradeLevels, levelName]);
                                                                                    }
                                                                                    else {
                                                                                        setGradeLevels(gradeLevels.filter(g => g !== levelName));
                                                                                    }
                                                                                }, disabled: uploading }), _jsx("label", { htmlFor: `grade-${level}`, className: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer", children: levelName })] }, level));
                                                                }) }), gradeLevels.length > 0 && (_jsxs("p", { className: "text-sm text-muted-foreground mt-2", children: ["Selected: ", gradeLevels.join(', ')] }))] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { htmlFor: "subject", children: "Subject" }), _jsx(Input, { id: "subject", value: subject, onChange: (e) => setSubject(e.target.value), placeholder: "e.g., Mathematics, RME, Computing, Science", disabled: uploading })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { htmlFor: "tags", children: "Tags (comma-separated)" }), _jsx(Input, { id: "tags", value: tags, onChange: (e) => setTags(e.target.value), placeholder: "algebra, geometry, fractions", disabled: uploading })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { htmlFor: "description", children: "Description" }), _jsx(Textarea, { id: "description", value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Brief description of the file content", rows: 3, disabled: uploading })] }), _jsxs("div", { className: "col-span-2 flex items-center justify-between p-4 border rounded-lg", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "public", children: "Make Public" }), _jsx("p", { className: "text-sm text-gray-500", children: "Public files can be viewed and downloaded by all users" })] }), _jsx(Switch, { id: "public", checked: isPublic, onCheckedChange: setIsPublic, disabled: uploading })] })] }), _jsxs(Button, { type: "submit", disabled: uploading, className: "w-full md:w-auto", children: [_jsx(Upload, { className: "w-4 h-4 mr-2" }), uploading ? 'Uploading...' : 'Upload File'] })] }) })] })), !['analytics', 'users', 'payments'].includes(activeTab) && (_jsx(TabsContent, { value: activeTab, className: "mt-0", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { children: ["Uploaded Files (", files.length, ")"] }), _jsxs(CardDescription, { children: ["Manage your ", activeTab, " files"] })] }), _jsx(CardContent, { children: loading ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "Loading files..." })) : files.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No files uploaded yet. Upload your first file above." })) : (_jsx("div", { className: "space-y-4", children: files.map((file) => (_jsx("div", { className: "border rounded-lg p-4 hover:bg-gray-50 transition-colors", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("h3", { className: "font-semibold text-lg", children: file.title }), _jsx(Badge, { variant: file.is_public ? 'default' : 'secondary', children: file.is_public ? 'Public' : 'Private' }), _jsx(Badge, { variant: "outline", children: file.file_format.toUpperCase() })] }), file.description && (_jsx("p", { className: "text-gray-600 mb-2", children: file.description })), _jsxs("div", { className: "flex flex-wrap gap-4 text-sm text-gray-500", children: [file.grade_level && _jsxs("span", { children: ["Grade: ", file.grade_level] }), file.subject && _jsxs("span", { children: ["Subject: ", file.subject] }), _jsxs("span", { children: ["Size: ", formatFileSize(file.file_size)] }), _jsxs("span", { children: ["Downloads: ", file.download_count] }), _jsxs("span", { children: ["Uploaded: ", new Date(file.created_at).toLocaleDateString()] })] }), file.tags && file.tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mt-2", children: file.tags.map((tag, idx) => (_jsx(Badge, { variant: "outline", className: "text-xs", children: tag }, idx))) }))] }), _jsxs("div", { className: "flex gap-2 ml-4", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => window.open(file.file_path, '_blank'), children: _jsx(Download, { className: "w-4 h-4" }) }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => handleTogglePublic(file.id, file.is_public), children: _jsx(Edit, { className: "w-4 h-4" }) }), _jsx(Button, { size: "sm", variant: "destructive", onClick: () => handleDeleteFile(file.id), children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }) }, file.id))) })) })] }) }))] }) })] }));
};
export default AdminDashboard;
