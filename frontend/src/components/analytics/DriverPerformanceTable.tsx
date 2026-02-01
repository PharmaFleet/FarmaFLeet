import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatNumber, formatDuration, formatPercentage } from '@/lib/formatters';
import { type DriverPerformance } from '@/stores/analyticsStore';
import { ArrowUpDown, ChevronUp, ChevronDown, Trophy, Medal, Award } from 'lucide-react';

type SortColumn = 'rank' | 'name' | 'total_deliveries' | 'average_delivery_time' | 'on_time_percentage';
type SortDirection = 'asc' | 'desc';

interface DriverPerformanceTableProps {
  data: DriverPerformance[];
  isLoading?: boolean;
  className?: string;
}

interface SortConfig {
  column: SortColumn;
  direction: SortDirection;
}

function getRankIcon(rank: number): JSX.Element | null {
  if (rank === 1) {
    return <Trophy className="h-4 w-4 text-yellow-500" />;
  } else if (rank === 2) {
    return <Medal className="h-4 w-4 text-slate-400" />;
  } else if (rank === 3) {
    return <Award className="h-4 w-4 text-amber-600" />;
  }
  return null;
}

export function DriverPerformanceTable({ 
  data, 
  isLoading = false,
  className 
}: DriverPerformanceTableProps): JSX.Element {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'total_deliveries', direction: 'desc' });

  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortConfig.column) {
        case 'rank':
          // Rank is calculated based on position in sorted array
          return 0; // Will be calculated after sorting
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'total_deliveries':
          aValue = a.total_deliveries;
          bValue = b.total_deliveries;
          break;
        case 'average_delivery_time':
          aValue = a.average_delivery_time;
          bValue = b.average_delivery_time;
          break;
        case 'on_time_percentage':
          aValue = a.on_time_percentage;
          bValue = b.on_time_percentage;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc' 
        ? (aValue as number) - (bValue as number) 
        : (bValue as number) - (aValue as number);
    });

    // Limit to top 10
    return sorted.slice(0, 10);
  }, [data, sortConfig]);

  const handleSort = (column: SortColumn) => {
    setSortConfig(current => ({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  function SortButton({ column, children }: { column: SortColumn; children: React.ReactNode }): JSX.Element {
    const isActive = sortConfig.column === column;
    const Icon = isActive 
      ? (sortConfig.direction === 'asc' ? ChevronUp : ChevronDown)
      : ArrowUpDown;

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleSort(column)}
        className={cn(
          'h-8 px-2 -ml-2 font-semibold text-[11px] uppercase tracking-tight',
          isActive && 'text-slate-900'
        )}
      >
        {children}
        <Icon className={cn('ml-1 h-3 w-3', isActive ? 'opacity-100' : 'opacity-50')} />
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">Driver Performance</CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Top 10 drivers by delivery metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">
                  <SortButton column="rank">Rank</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="name">Driver Name</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="total_deliveries">Deliveries</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="average_delivery_time">Avg Time</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="on_time_percentage">On-Time %</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((driver, index) => {
                const rank = index + 1;
                const rankIcon = getRankIcon(rank);
                
                return (
                  <TableRow key={driver.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {rankIcon}
                        <span className={cn(
                          'text-sm',
                          rank <= 3 ? 'font-bold text-slate-900' : 'text-slate-600'
                        )}>
                          #{rank}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{driver.name}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium text-slate-900">
                        {formatNumber(driver.total_deliveries)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-slate-600">
                        {formatDuration(driver.average_delivery_time)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={driver.on_time_percentage >= 90 ? 'default' : driver.on_time_percentage >= 80 ? 'secondary' : 'destructive'}
                        className="font-medium"
                      >
                        {formatPercentage(driver.on_time_percentage, 1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sortedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No driver data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default DriverPerformanceTable;
