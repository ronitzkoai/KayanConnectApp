import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Trash2, Package } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type MaterialsOrder = Database["public"]["Tables"]["materials_orders"]["Row"];

interface AdminMaterialsTabProps {
  onUpdate: () => void;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "ממתין", variant: "default" },
  confirmed: { label: "אושר", variant: "secondary" },
  delivered: { label: "נמסר", variant: "outline" },
  cancelled: { label: "בוטל", variant: "destructive" },
};

const AdminMaterialsTab = ({ onUpdate }: AdminMaterialsTabProps) => {
  const [orders, setOrders] = useState<MaterialsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("materials_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching materials orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("materials_orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      
      toast.success("סטטוס עודכן בהצלחה");
      fetchOrders();
      onUpdate();
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("שגיאה בעדכון הסטטוס");
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("האם למחוק את ההזמנה?")) return;
    
    try {
      const { error } = await supabase
        .from("materials_orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;
      
      toast.success("ההזמנה נמחקה");
      fetchOrders();
      onUpdate();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("שגיאה במחיקת ההזמנה");
    }
  };

  const filteredOrders = orders.filter((order) => {
    return statusFilter === "all" || order.status === statusFilter;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>הזמנות חומרים ({filteredOrders.length})</CardTitle>
        <div className="flex gap-4 mt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="סנן לפי סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="pending">ממתינות</SelectItem>
              <SelectItem value="confirmed">אושרו</SelectItem>
              <SelectItem value="delivered">נמסרו</SelectItem>
              <SelectItem value="cancelled">בוטלו</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">סוג חומר</TableHead>
                <TableHead className="text-right">כמות</TableHead>
                <TableHead className="text-right">מיקום משלוח</TableHead>
                <TableHead className="text-right">תאריך משלוח</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      {order.material_type}
                    </span>
                  </TableCell>
                  <TableCell>
                    {order.quantity} {order.unit}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {order.delivery_location}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(order.delivery_date), "dd/MM/yyyy")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status || "pending"}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <Badge variant={statusLabels[order.status || "pending"]?.variant}>
                          {statusLabels[order.status || "pending"]?.label}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">ממתין</SelectItem>
                        <SelectItem value="confirmed">אושר</SelectItem>
                        <SelectItem value="delivered">נמסר</SelectItem>
                        <SelectItem value="cancelled">בוטל</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteOrder(order.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    לא נמצאו הזמנות
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminMaterialsTab;
