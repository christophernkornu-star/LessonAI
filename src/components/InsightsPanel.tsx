import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, TrendingUp, Target, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InsightsProps {
  insights: string[];
  quickActions?: QuickAction[];
}

interface QuickAction {
  label: string;
  action: () => void;
  variant?: "default" | "secondary" | "outline";
}

export function InsightsPanel({ insights, quickActions }: InsightsProps) {
  const navigate = useNavigate();

  const getIcon = (index: number) => {
    const icons = [Lightbulb, TrendingUp, Target, Sparkles];
    const Icon = icons[index % icons.length];
    return <Icon className="h-4 w-4" />;
  };

  if (insights.length === 0 && (!quickActions || quickActions.length === 0)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Insights & Recommendations
        </CardTitle>
        <CardDescription>
          Personalized suggestions to enhance your lesson planning
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <Alert key={index}>
                <div className="flex items-start gap-2">
                  {getIcon(index)}
                  <AlertDescription className="flex-1">{insight}</AlertDescription>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {quickActions && quickActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || "outline"}
                  size="sm"
                  onClick={action.action}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
