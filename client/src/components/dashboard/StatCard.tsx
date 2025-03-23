import { ReactNode } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  footerContent?: ReactNode;
  iconColor?: string; // primary, accent, status-delivered, status-rto, etc.
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatCard({
  title,
  value,
  icon,
  footerContent,
  iconColor = "primary",
  trend,
}: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div
              className={cn(
                "flex-shrink-0 rounded-md p-3",
                `bg-${iconColor} bg-opacity-10`
              )}
            >
              <div className={cn(`text-${iconColor}`)}>{icon}</div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-neutral-500 truncate">
                  {title}
                </dt>
                <dd>
                  <div className="text-lg font-semibold text-neutral-900">
                    {value}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </CardContent>
      {(footerContent || trend) && (
        <CardFooter className="bg-neutral-50 px-4 py-3 flex">
          {trend ? (
            <span
              className={cn(
                "text-sm flex items-center",
                trend.isPositive ? "text-green-500" : "text-status-rto"
              )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={
                    trend.isPositive
                      ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  }
                />
              </svg>
              {trend.value}
            </span>
          ) : null}
          {footerContent && (
            <div className={cn(trend ? "ml-auto" : "")}>{footerContent}</div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
