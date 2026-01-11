import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeatmapData {
  date: string;
  count: number;
}

interface HeatmapCalendarProps {
  title: string;
  description?: string;
  data: HeatmapData[];
  maxCount?: number;
}

export function HeatmapCalendar({ title, description, data, maxCount }: HeatmapCalendarProps) {
  // Generate last 12 weeks of dates
  const weeks = 12;
  const days = weeks * 7;
  const today = new Date();
  
  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date);
  }

  // Create a map for quick lookup
  const dataMap = new Map(
    data.map(d => [d.date, d.count])
  );

  // Find max count for color scaling
  const max = maxCount || Math.max(...data.map(d => d.count), 1);

  // Get color intensity based on count
  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    const intensity = Math.min(Math.floor((count / max) * 4) + 1, 4);
    const colors = [
      'bg-green-200 dark:bg-green-900',
      'bg-green-300 dark:bg-green-700',
      'bg-green-400 dark:bg-green-600',
      'bg-green-500 dark:bg-green-500',
    ];
    return colors[intensity - 1];
  };

  // Group dates by week
  const weekGroups: Date[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    weekGroups.push(dates.slice(i, i + 7));
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Month labels */}
            <div className="flex mb-2">
              <div className="w-8"></div>
              <div className="flex-1 flex gap-1">
                {weekGroups.map((week, weekIndex) => {
                  const firstDay = week[0];
                  const showMonth = firstDay.getDate() <= 7;
                  return (
                    <div key={weekIndex} className="flex-1 text-xs text-muted-foreground">
                      {showMonth && monthLabels[firstDay.getMonth()]}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day rows */}
            <div className="flex gap-2">
              {/* Day labels */}
              <div className="flex flex-col gap-1">
                {dayLabels.map((label, index) => (
                  <div key={index} className="h-3 text-xs text-muted-foreground flex items-center">
                    {index % 2 === 1 ? label : ''}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="flex gap-1">
                {weekGroups.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((date, dayIndex) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const count = dataMap.get(dateStr) || 0;
                      const isFuture = date > today;

                      return (
                        <TooltipProvider key={dayIndex}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`w-3 h-3 rounded-sm ${
                                  isFuture 
                                    ? 'bg-gray-50 dark:bg-gray-900 opacity-50' 
                                    : getColor(count)
                                } hover:ring-2 hover:ring-primary transition-all cursor-pointer`}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {date.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </p>
                              <p className="text-xs font-semibold">
                                {count} lesson{count !== 1 ? 's' : ''}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800"></div>
                <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900"></div>
                <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-700"></div>
                <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600"></div>
                <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-500"></div>
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
