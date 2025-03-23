import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Search, X } from "lucide-react";

interface OrderFilterProps {
  onFilterChange: (filters: OrderFilters) => void;
}

export interface OrderFilters {
  search: string;
  status: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  courier: string;
  paymentMode: string;
}

export function OrderFilter({ onFilterChange }: OrderFilterProps) {
  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    status: "",
    dateFrom: null,
    dateTo: null,
    courier: "",
    paymentMode: "",
  });

  const handleChange = (key: keyof OrderFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange(filters);
  };

  const handleReset = () => {
    const resetFilters = {
      search: "",
      status: "",
      dateFrom: null,
      dateTo: null,
      courier: "",
      paymentMode: "",
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <Input
                placeholder="Search by Order ID, AWB, or Customer"
                value={filters.search}
                onChange={(e) => handleChange("search", e.target.value)}
                icon={<Search size={18} />}
              />
            </div>

            <div>
              <Select
                value={filters.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="In-Process">In Process</SelectItem>
                  <SelectItem value="NDR">NDR</SelectItem>
                  <SelectItem value="RTO">RTO</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <DatePicker
                placeholderText="From Date"
                selected={filters.dateFrom}
                onChange={(date) => handleChange("dateFrom", date)}
              />
            </div>

            <div>
              <DatePicker
                placeholderText="To Date"
                selected={filters.dateTo}
                onChange={(date) => handleChange("dateTo", date)}
              />
            </div>

            <div className="flex space-x-2">
              <Button type="submit" className="flex-1">
                Filter
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                size="icon"
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
