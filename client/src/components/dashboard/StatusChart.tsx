import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface StatusData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface StatusChartProps {
  data: StatusData[];
  title: string;
}

export function StatusChart({ data, title }: StatusChartProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('7d');

  const handleTimeframeChange = (newTimeframe: '7d' | '30d' | '90d') => {
    setTimeframe(newTimeframe);
    // In a real implementation, we would fetch new data based on the timeframe
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              barSize={40}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" scale="point" padding={{ left: 20, right: 20 }} />
              <YAxis 
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [`${value}%`, name]}
                contentStyle={{ borderRadius: '6px' }}
              />
              <Bar 
                dataKey="percentage" 
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="border-t border-neutral-100 px-4 py-3">
        <div className="flex space-x-2">
          <Button
            variant={timeframe === '7d' ? 'default' : 'outline'}
            size="sm"
            className="px-3 py-1 text-xs font-medium"
            onClick={() => handleTimeframeChange('7d')}
          >
            Last 7 Days
          </Button>
          <Button
            variant={timeframe === '30d' ? 'default' : 'outline'}
            size="sm"
            className="px-3 py-1 text-xs font-medium"
            onClick={() => handleTimeframeChange('30d')}
          >
            Last 30 Days
          </Button>
          <Button
            variant={timeframe === '90d' ? 'default' : 'outline'}
            size="sm"
            className="px-3 py-1 text-xs font-medium"
            onClick={() => handleTimeframeChange('90d')}
          >
            Last Quarter
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="ml-auto text-primary">
          Export
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 ml-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </Button>
      </CardFooter>
    </Card>
  );
}
