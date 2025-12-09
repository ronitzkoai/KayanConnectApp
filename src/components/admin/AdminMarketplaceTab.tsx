import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Trash2, DollarSign, ShoppingCart, Key } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type MarketplaceItem = Database["public"]["Tables"]["equipment_marketplace"]["Row"];
type RentalItem = Database["public"]["Tables"]["equipment_rentals"]["Row"];

interface AdminMarketplaceTabProps {
  onUpdate: () => void;
}

const AdminMarketplaceTab = ({ onUpdate }: AdminMarketplaceTabProps) => {
  const [saleItems, setSaleItems] = useState<MarketplaceItem[]>([]);
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const [saleResult, rentalResult] = await Promise.all([
        supabase.from("equipment_marketplace").select("*").order("created_at", { ascending: false }),
        supabase.from("equipment_rentals").select("*").order("created_at", { ascending: false }),
      ]);

      if (saleResult.error) throw saleResult.error;
      if (rentalResult.error) throw rentalResult.error;

      setSaleItems(saleResult.data || []);
      setRentalItems(rentalResult.data || []);
    } catch (error) {
      console.error("Error fetching marketplace items:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSaleItem = async (itemId: string) => {
    if (!confirm("האם למחוק את הפריט?")) return;
    
    try {
      const { error } = await supabase
        .from("equipment_marketplace")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      
      toast.success("הפריט נמחק");
      fetchItems();
      onUpdate();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("שגיאה במחיקת הפריט");
    }
  };

  const deleteRentalItem = async (itemId: string) => {
    if (!confirm("האם למחוק את הפריט?")) return;
    
    try {
      const { error } = await supabase
        .from("equipment_rentals")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      
      toast.success("הפריט נמחק");
      fetchItems();
      onUpdate();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("שגיאה במחיקת הפריט");
    }
  };

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
        <CardTitle>מרקטפלייס ציוד</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sale">
          <TabsList>
            <TabsTrigger value="sale" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              למכירה ({saleItems.length})
            </TabsTrigger>
            <TabsTrigger value="rental" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              להשכרה ({rentalItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sale" className="mt-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">סוג ציוד</TableHead>
                    <TableHead className="text-right">מותג / דגם</TableHead>
                    <TableHead className="text-right">מחיר</TableHead>
                    <TableHead className="text-right">מיקום</TableHead>
                    <TableHead className="text-right">מצב</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.equipment_type}</TableCell>
                      <TableCell>
                        {item.brand} {item.model} {item.year && `(${item.year})`}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <DollarSign className="h-3 w-3" />
                          ₪{Number(item.price).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {item.location}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_sold ? "secondary" : "default"}>
                          {item.is_sold ? "נמכר" : "זמין"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSaleItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {saleItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        לא נמצאו פריטים למכירה
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="rental" className="mt-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">סוג ציוד</TableHead>
                    <TableHead className="text-right">מותג / דגם</TableHead>
                    <TableHead className="text-right">מחיר יומי</TableHead>
                    <TableHead className="text-right">מיקום</TableHead>
                    <TableHead className="text-right">זמינות</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rentalItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.equipment_type}</TableCell>
                      <TableCell>
                        {item.brand} {item.model} {item.year && `(${item.year})`}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <DollarSign className="h-3 w-3" />
                          ₪{Number(item.daily_rate).toLocaleString()}/יום
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {item.location}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_available ? "default" : "secondary"}>
                          {item.is_available ? "זמין" : "לא זמין"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRentalItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rentalItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        לא נמצאו פריטים להשכרה
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminMarketplaceTab;
