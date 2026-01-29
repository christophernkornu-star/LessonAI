import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  checkIsAdmin,
  uploadResourceFile,
  getAllResourceFiles,
  deleteResourceFile,
  updateResourceFile,
  ResourceFile,
  getUserStats,
  getContentStats,
  getAIUsageStats,
} from '@/services/adminService';
import * as AnalyticsService from '@/services/analyticsService';
import { CurriculumService } from '@/services/curriculumService';
import { AdminPaymentManagement } from '@/components/AdminPaymentManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Edit,
  LogOut,
  FileCheck,
  BookOpen,
  FolderOpen,
  X,
  BarChart3,
  Users,
  Activity,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CreditCard,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
import { SimplePieChart } from '@/components/charts/SimplePieChart';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardSkeleton } from "@/components/LoadingSkeletons";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true); // Initial loading true
  const [files, setFiles] = useState<ResourceFile[]>([]);
  const [activeTab, setActiveTab] = useState('curriculum');
  const navigate = useNavigate();
  const { toast } = useToast();

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
          setLessonsBySubject(subjects.map((d: any) => ({ name: d.subject, value: d.count })));
          setLessonsByTemplate(templates.map((d: any) => ({ name: d.template_name, value: d.count })));
          setMonthlyTrends(trends.map((d: any) => ({ month: d.month, count: d.count })));
          setUserActivity(activity);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadGlobalCurriculumStats = async () => {
      try {
        const stats = await CurriculumService.getGlobalStats();
        setGlobalStats(stats);
      } catch (e) {
        console.error("Error loading global stats", e);
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

  if (loading) {
      return <DashboardSkeleton />;
  }

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Global Curriculum Stats
  const [globalStats, setGlobalStats] = useState<{ totalItems: number; uniqueSubjects: number; uniqueGrades: number } | null>(null);

  useEffect(() => {
    if (activeTab === 'curriculum') {
      CurriculumService.getGlobalStats().then(setGlobalStats);
    }
  }, [activeTab]);

  // Analytics state
  const [userStats, setUserStats] = useState<any>(null);
  const [contentStats, setContentStats] = useState<any>(null);
  const [aiStats, setAIStats] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [lessonsBySubject, setLessonsBySubject] = useState<any[]>([]);
  const [lessonsByTemplate, setLessonsByTemplate] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [userActivity, setUserActivity] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess();
    if (activeTab === 'analytics') {
      loadAnalytics();
    } else {
      loadFiles();
    }
  }, [activeTab]);

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
      setLessonsBySubject(subjects.map((d: any) => ({ name: d.subject, value: d.count })));
      setLessonsByTemplate(templates.map((d: any) => ({ name: d.template_name, value: d.count })));
      setMonthlyTrends(trends.map((d: any) => ({ month: d.month, count: d.count })));
      setUserActivity(activity);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoadingAnalytics(false);
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
      const fileType = activeTab as 'curriculum' | 'template' | 'resource';
      const data = await getAllResourceFiles(fileType);
      setFiles(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load files',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
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
      const fileType = activeTab as 'curriculum' | 'template' | 'resource';
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
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await deleteResourceFile(fileId);
      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });
      loadFiles();
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePublic = async (fileId: string, currentStatus: boolean) => {
    try {
      await updateResourceFile(fileId, { is_public: !currentStatus });
      toast({
        title: 'Success',
        description: `File ${!currentStatus ? 'published' : 'unpublished'}`,
      });
      loadFiles();
    } catch (error) {
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
        return <BookOpen className="w-5 h-5" />;
      case 'template':
        return <FileText className="w-5 h-5" />;
      case 'resource':
        return <FolderOpen className="w-5 h-5" />;
      default:
        return <FileCheck className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Curriculum</span>
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="resource" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Resources</span>
            </TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <AdminPaymentManagement />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            {loadingAnalytics ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* User Statistics */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Statistics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Total Users</CardDescription>
                        <CardTitle className="text-3xl">{userStats?.totalUsers || 0}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Active Users (30d)</CardDescription>
                        <CardTitle className="text-3xl">{userStats?.activeUsers || 0}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>New This Month</CardDescription>
                        <CardTitle className="text-3xl flex items-center gap-1">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          {userStats?.newUsersThisMonth || 0}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>User Roles</CardDescription>
                        <div className="space-y-1 mt-2">
                          {Object.entries(userStats?.usersByRole || {}).map(([role, count]) => (
                            <div key={role} className="flex justify-between text-sm">
                              <span className="capitalize">{role}:</span>
                              <Badge variant="secondary">{count as number}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardHeader>
                    </Card>
                  </div>
                </div>

                {/* Content Statistics */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Content Statistics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Total Lessons</CardDescription>
                        <CardTitle className="text-3xl">{contentStats?.totalLessons || 0}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Custom Templates</CardDescription>
                        <CardTitle className="text-3xl">{contentStats?.totalTemplates || 0}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Resource Library</CardDescription>
                        <CardTitle className="text-3xl">{contentStats?.totalResources || 0}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Lessons This Month</CardDescription>
                        <CardTitle className="text-3xl flex items-center gap-1">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          {contentStats?.lessonsThisMonth || 0}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>
                </div>

                {/* AI Usage Statistics */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    AI Usage & Costs
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Total Requests (30d)</CardDescription>
                        <CardTitle className="text-3xl">{aiStats?.totalRequests || 0}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Success Rate</CardDescription>
                        <CardTitle className="text-3xl text-green-600">
                          {aiStats?.totalRequests ? 
                            ((aiStats.successfulRequests / aiStats.totalRequests) * 100).toFixed(1) 
                            : 0}%
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Tokens Used</CardDescription>
                        <CardTitle className="text-3xl">
                          {(aiStats?.totalTokensUsed || 0).toLocaleString()}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Estimated Cost</CardDescription>
                        <CardTitle className="text-3xl">
                          ${(aiStats?.estimatedCost || 0).toFixed(2)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  {/* Requests by Type */}
                  {aiStats?.requestsByType && Object.keys(aiStats.requestsByType).length > 0 && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle>Requests by Type</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(aiStats.requestsByType).map(([type, count]) => (
                            <div key={type} className="flex justify-between items-center">
                              <span className="capitalize">{type}</span>
                              <Badge>{count as number}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Enhanced Visual Analytics */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Platform Analytics
                  </h3>
                  
                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {lessonsBySubject.length > 0 && (
                      <SimplePieChart
                        title="Lessons by Subject"
                        description="Distribution across all subjects"
                        data={lessonsBySubject}
                      />
                    )}
                    {lessonsByTemplate.length > 0 && (
                      <SimpleBarChart
                        title="Most Popular Templates"
                        description="Template usage count"
                        data={lessonsByTemplate.slice(0, 10)}
                        color="#06b6d4"
                      />
                    )}
                  </div>

                  {/* Monthly Trends */}
                  {monthlyTrends.length > 0 && (
                    <div className="mb-6">
                      <TrendLineChart
                        title="Lesson Creation Trends"
                        description="Monthly lesson generation over the last year"
                        data={monthlyTrends}
                        xAxisKey="month"
                        yAxisKey="count"
                        color="#8b5cf6"
                      />
                    </div>
                  )}

                  {/* User Activity Table */}
                  {userActivity.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Contributors</CardTitle>
                        <CardDescription>Most active users in the last 30 days</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead className="text-right">Total Lessons</TableHead>
                              <TableHead className="text-right">This Month</TableHead>
                              <TableHead>Last Active</TableHead>
                              <TableHead>Plan</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userActivity.map((user: any) => (
                              <TableRow key={user.user_id}>
                                <TableCell className="font-medium">{user.full_name}</TableCell>
                                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                <TableCell className="text-right">{user.total_lessons}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary">{user.lessons_this_month}</Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {user.last_generated !== 'Never' 
                                    ? new Date(user.last_generated).toLocaleDateString()
                                    : 'Never'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={user.subscription_tier === 'free' ? 'outline' : 'default'}>
                                    {user.subscription_tier}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Error Rate Card */}
                {aiStats && aiStats.failedRequests > 0 && (
                  <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                        Error Tracking
                      </CardTitle>
                      <CardDescription>AI generation failures in the last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Failed Requests</div>
                          <div className="text-2xl font-bold text-red-600">{aiStats.failedRequests}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Error Rate</div>
                          <div className="text-2xl font-bold text-red-600">
                            {aiStats.totalRequests 
                              ? ((aiStats.failedRequests / aiStats.totalRequests) * 100).toFixed(1)
                              : 0}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Success Rate</div>
                          <div className="text-2xl font-bold text-green-600">
                            {aiStats.totalRequests 
                              ? ((aiStats.successfulRequests / aiStats.totalRequests) * 100).toFixed(1)
                              : 0}%
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end">
                  <Button onClick={loadAnalytics} variant="outline">
                    Refresh Analytics
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Upload Form - Same for all tabs */}
          {activeTab === 'curriculum' && (
            <Card className="mb-8 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Upload className="w-5 h-5" />
                  Upload Global Curriculum Data (CSV)
                </CardTitle>
                <CardDescription>
                  Upload structured CSV data to populate the Lesson Generator dropdowns for ALL users.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={() => navigate('/curriculum-upload')}>
                    Go to Curriculum Import Tool
                  </Button>

                  {globalStats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-primary/10">
                      <div className="bg-background/50 p-4 rounded-lg border border-primary/10 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Total Records</p>
                        <p className="text-3xl font-bold text-primary">{globalStats.totalItems}</p>
                      </div>
                      <div className="bg-background/50 p-4 rounded-lg border border-primary/10 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Subjects Covered</p>
                        <p className="text-3xl font-bold text-primary">{globalStats.uniqueSubjects}</p>
                      </div>
                      <div className="bg-background/50 p-4 rounded-lg border border-primary/10 text-center">
                         <p className="text-sm text-muted-foreground mb-1">Class Levels</p>
                         <p className="text-3xl font-bold text-primary">{globalStats.uniqueGrades}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab !== 'analytics' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getFileIcon()}
                Upload {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} File
              </CardTitle>
              <CardDescription>
                Upload PDF or DOC files. Files can be made public or private.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFileUpload} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* File Upload */}
                  <div className="col-span-2">
                    <Label htmlFor="file">File (PDF, DOC, DOCX, CSV)</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <input
                        id="file"
                        type="file"
                        accept=".pdf,.doc,.docx,.csv,.xlsx,.xls,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        required
                        disabled={uploading}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      {uploadFile && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          {uploadFile.name}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => setUploadFile(null)}
                          />
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="col-span-2 md:col-span-1">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter file title"
                      required
                      disabled={uploading}
                    />
                  </div>

                  {/* Grade Level - Multiple Selection */}
                  <div className="col-span-2">
                    <Label>Class Levels (select multiple)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2 p-4 border rounded-md">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => {
                        const levelName = `Basic ${level}`;
                        return (
                          <div key={level} className="flex items-center space-x-2">
                            <Checkbox
                              id={`grade-${level}`}
                              checked={gradeLevels.includes(levelName)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setGradeLevels([...gradeLevels, levelName]);
                                } else {
                                  setGradeLevels(gradeLevels.filter(g => g !== levelName));
                                }
                              }}
                              disabled={uploading}
                            />
                            <label
                              htmlFor={`grade-${level}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {levelName}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    {gradeLevels.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selected: {gradeLevels.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Subject */}
                  <div className="col-span-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Mathematics, RME, Computing, Science"
                      disabled={uploading}
                    />
                  </div>

                  {/* Tags */}
                  <div className="col-span-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="algebra, geometry, fractions"
                      disabled={uploading}
                    />
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of the file content"
                      rows={3}
                      disabled={uploading}
                    />
                  </div>

                  {/* Public Toggle */}
                  <div className="col-span-2 flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="public">Make Public</Label>
                      <p className="text-sm text-gray-500">
                        Public files can be viewed and downloaded by all users
                      </p>
                    </div>
                    <Switch
                      id="public"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                      disabled={uploading}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={uploading} className="w-full md:w-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </form>
            </CardContent>
          </Card>
          )}

          {/* File List - Dynamic based on tab */}
          {activeTab !== 'analytics' && (
          <TabsContent value={activeTab} className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Files ({files.length})</CardTitle>
                <CardDescription>
                  Manage your {activeTab} files
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading files...</div>
                ) : files.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No files uploaded yet. Upload your first file above.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{file.title}</h3>
                              <Badge variant={file.is_public ? 'default' : 'secondary'}>
                                {file.is_public ? 'Public' : 'Private'}
                              </Badge>
                              <Badge variant="outline">{file.file_format.toUpperCase()}</Badge>
                            </div>
                            {file.description && (
                              <p className="text-gray-600 mb-2">{file.description}</p>
                            )}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              {file.grade_level && <span>Grade: {file.grade_level}</span>}
                              {file.subject && <span>Subject: {file.subject}</span>}
                              <span>Size: {formatFileSize(file.file_size)}</span>
                              <span>Downloads: {file.download_count}</span>
                              <span>
                                Uploaded: {new Date(file.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {file.tags && file.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {file.tags.map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(file.file_path, '_blank')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTogglePublic(file.id, file.is_public)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteFile(file.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
