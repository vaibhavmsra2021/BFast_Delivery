import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INDIA_SVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
  <path d="M100,20 C40,40 30,80 40,120 C45,140 60,160 100,180 C140,160 155,140 160,120 C170,80 160,40 100,20 Z" fill="#e1e7ef" stroke="#8c9db5" stroke-width="2"></path>
  <circle cx="120" cy="60" r="15" fill="#1976d2" opacity="0.7"></circle>
  <circle cx="80" cy="80" r="20" fill="#1976d2" opacity="0.9"></circle>
  <circle cx="130" cy="120" r="10" fill="#1976d2" opacity="0.5"></circle>
  <circle cx="70" cy="140" r="12" fill="#1976d2" opacity="0.6"></circle>
</svg>
`;

interface RegionData {
  name: string;
  value: number;
  opacity: number;
}

interface IndiaMapProps {
  regions: RegionData[];
}

export function IndiaMap({ regions }: IndiaMapProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('7d');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">
            Order Distribution by Region
          </CardTitle>
          <Select
            value={timeframe}
            onValueChange={(value) => setTimeframe(value as any)}
          >
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="chart-container">
          <div className="w-full h-full flex items-center justify-center bg-neutral-50 rounded">
            <div className="relative w-48 h-48" dangerouslySetInnerHTML={{ __html: INDIA_SVG }} />
          </div>
        </div>

        {/* Regional breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          {regions.map((region) => (
            <div key={region.name} className="flex items-center">
              <div 
                className="h-3 w-3 rounded-full mr-2" 
                style={{ 
                  backgroundColor: 'hsl(var(--primary))',
                  opacity: region.opacity
                }}
              />
              <span className="text-sm text-neutral-600">{region.name}</span>
              <span className="ml-auto text-sm font-medium">{region.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t border-neutral-100 px-4 py-3">
        <Button variant="ghost" size="sm" className="text-primary">
          View Detailed Report
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Button>
      </CardFooter>
    </Card>
  );
}
