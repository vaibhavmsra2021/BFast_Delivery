import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

interface Order {
  id: string;
  orderId: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  date: string;
  status: string;
  awb: string;
  courier: string;
  amount: string;
  paymentMode: string;
  product: {
    name: string;
    quantity: number;
  };
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  dimensions: number[];
  weight: number;
  lastUpdate: {
    timestamp: string;
    location: string;
    remark: string;
  };
}

interface OrderDetailsProps {
  order: Order;
  onUpdate: (data: Partial<Order>) => void;
}

export function OrderDetails({ order, onUpdate }: OrderDetailsProps) {
  const [editMode, setEditMode] = useState(false);
  const [editableOrder, setEditableOrder] = useState<Order>({ ...order });

  const handleChange = (field: string, value: any) => {
    setEditableOrder((prev) => {
      const updated = { ...prev };
      const fieldParts = field.split(".");
      
      if (fieldParts.length === 1) {
        (updated as any)[field] = value;
      } else if (fieldParts.length === 2) {
        const [parent, child] = fieldParts;
        (updated as any)[parent] = {
          ...(updated as any)[parent],
          [child]: value,
        };
      }
      
      return updated;
    });
  };

  const handleSubmit = () => {
    onUpdate(editableOrder);
    setEditMode(false);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-status-delivered bg-opacity-10 text-status-delivered";
      case "in-process":
      case "in transit":
        return "bg-status-inprocess bg-opacity-10 text-status-inprocess";
      case "ndr":
        return "bg-status-ndr bg-opacity-10 text-status-ndr";
      case "rto":
        return "bg-status-rto bg-opacity-10 text-status-rto";
      case "lost":
        return "bg-status-lost bg-opacity-10 text-status-lost";
      case "pending":
        return "bg-accent bg-opacity-10 text-accent";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">
            Order {order.orderId}
            <Badge className="ml-2" variant="outline">
              {order.paymentMode}
            </Badge>
          </h2>
          <p className="text-sm text-neutral-500">Created on {order.date}</p>
        </div>
        <div>
          {!editMode ? (
            <Button onClick={() => setEditMode(true)}>Edit Order</Button>
          ) : (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Save Changes</Button>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Order Details</TabsTrigger>
          <TabsTrigger value="shipping">Shipping Info</TabsTrigger>
          <TabsTrigger value="tracking">Tracking History</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4">Order Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    {editMode ? (
                      <Select
                        value={editableOrder.status}
                        onValueChange={(value) => handleChange("status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In-Process">In Process</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
                          <SelectItem value="RTO">RTO</SelectItem>
                          <SelectItem value="NDR">NDR</SelectItem>
                          <SelectItem value="Lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="outline"
                        className={getStatusBadgeColor(order.status)}
                      >
                        {order.status}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <Label>AWB Number</Label>
                    {editMode ? (
                      <Input
                        value={editableOrder.awb}
                        onChange={(e) => handleChange("awb", e.target.value)}
                      />
                    ) : (
                      <p className="font-mono">{order.awb || "Not assigned"}</p>
                    )}
                  </div>

                  <div>
                    <Label>Courier</Label>
                    {editMode ? (
                      <Input
                        value={editableOrder.courier}
                        onChange={(e) => handleChange("courier", e.target.value)}
                      />
                    ) : (
                      <p>{order.courier || "Not assigned"}</p>
                    )}
                  </div>

                  <div>
                    <Label>Amount</Label>
                    <p>{order.amount}</p>
                  </div>

                  <div>
                    <Label>Product</Label>
                    <p>
                      {order.product.name} (x{order.product.quantity})
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4">Customer Details</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <p>{order.customer.name}</p>
                  </div>

                  <div>
                    <Label>Phone</Label>
                    <p>{order.customer.phone}</p>
                  </div>

                  <div>
                    <Label>Email</Label>
                    <p>{order.customer.email}</p>
                  </div>

                  <Separator />

                  <div>
                    <Label>Address</Label>
                    <p>{order.shippingAddress.address}</p>
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                      {order.shippingAddress.pincode}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="shipping">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Package Dimensions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Dimensions (L × B × H) cm</Label>
                    {editMode ? (
                      <div className="flex space-x-2">
                        <Input
                          type="number"
                          value={editableOrder.dimensions[0]}
                          onChange={(e) =>
                            handleChange("dimensions", [
                              parseFloat(e.target.value),
                              editableOrder.dimensions[1],
                              editableOrder.dimensions[2],
                            ])
                          }
                        />
                        <Input
                          type="number"
                          value={editableOrder.dimensions[1]}
                          onChange={(e) =>
                            handleChange("dimensions", [
                              editableOrder.dimensions[0],
                              parseFloat(e.target.value),
                              editableOrder.dimensions[2],
                            ])
                          }
                        />
                        <Input
                          type="number"
                          value={editableOrder.dimensions[2]}
                          onChange={(e) =>
                            handleChange("dimensions", [
                              editableOrder.dimensions[0],
                              editableOrder.dimensions[1],
                              parseFloat(e.target.value),
                            ])
                          }
                        />
                      </div>
                    ) : (
                      <p>
                        {order.dimensions[0]} × {order.dimensions[1]} ×{" "}
                        {order.dimensions[2]} cm
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Weight (kg)</Label>
                    {editMode ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editableOrder.weight}
                        onChange={(e) =>
                          handleChange("weight", parseFloat(e.target.value))
                        }
                      />
                    ) : (
                      <p>{order.weight} kg</p>
                    )}
                  </div>

                  <div>
                    <Label>Shipping Method</Label>
                    {editMode ? (
                      <Select
                        value={editableOrder.shippingAddress.shippingMethod}
                        onValueChange={(value) =>
                          handleChange("shippingAddress.shippingMethod", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Express">Express</SelectItem>
                          <SelectItem value="Surface">Surface</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p>{order.shippingAddress.shippingMethod || "Express"}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Payment Mode</Label>
                    <p>{order.paymentMode}</p>
                  </div>

                  <div>
                    <Label>Amount</Label>
                    <p>{order.amount}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Tracking Information</h3>
              {order.lastUpdate ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <Badge
                        variant="outline"
                        className={getStatusBadgeColor(order.status)}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-neutral-500">
                      Last updated: {order.lastUpdate.timestamp}
                    </div>
                  </div>

                  <div className="space-y-6 relative">
                    <div className="relative pl-8 pb-8 border-l-2 border-primary">
                      <div className="absolute w-4 h-4 bg-primary rounded-full -left-[9px] top-0"></div>
                      <div>
                        <div className="font-medium">
                          {order.lastUpdate.location}
                        </div>
                        <div className="text-sm mt-1">
                          {order.lastUpdate.remark}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">
                          {order.lastUpdate.timestamp}
                        </div>
                      </div>
                    </div>
                    
                    {/* This would show the full tracking history which would come from the API */}
                    <div className="text-center text-sm text-neutral-500">
                      No earlier tracking information available
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  No tracking information available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
