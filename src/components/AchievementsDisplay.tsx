import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock } from "lucide-react";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  progress?: number;
  target?: number;
}

interface AchievementsDisplayProps {
  achievements: Achievement[];
}

export function AchievementsDisplay({ achievements }: AchievementsDisplayProps) {
  const earned = achievements.filter(a => a.earned).length;
  const total = achievements.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Achievements</span>
          <Badge variant="secondary">
            {earned}/{total}
          </Badge>
        </CardTitle>
        <CardDescription>
          Track your progress and unlock achievements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {achievements.map((achievement) => (
            <TooltipProvider key={achievement.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`relative p-4 border rounded-lg text-center transition-all ${
                      achievement.earned
                        ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
                        : 'bg-muted/30 border-muted hover:border-muted-foreground/20 opacity-60'
                    }`}
                  >
                    {!achievement.earned && (
                      <div className="absolute top-2 right-2">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <div className="text-4xl mb-2">{achievement.icon}</div>
                    <div className="text-sm font-semibold mb-1 line-clamp-1">
                      {achievement.title}
                    </div>
                    {!achievement.earned && achievement.progress !== undefined && achievement.target && (
                      <Progress 
                        value={(achievement.progress / achievement.target) * 100} 
                        className="h-1 mt-2"
                      />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-semibold">{achievement.title}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  {!achievement.earned && achievement.progress !== undefined && achievement.target && (
                    <p className="text-xs mt-1">
                      Progress: {achievement.progress}/{achievement.target}
                    </p>
                  )}
                  {achievement.earned && (
                    <Badge variant="secondary" className="mt-1">
                      ✓ Unlocked
                    </Badge>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
