import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ArrowRight, Plus } from "lucide-react";
import { EquipmentListingCard } from "@/components/marketplace/EquipmentListingCard";
import { EquipmentFilters } from "@/components/marketplace/EquipmentFilters";
import { EquipmentCategoryBar } from "@/components/marketplace/EquipmentCategoryBar";
import { AddListingModal } from "@/components/marketplace/AddListingModal";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type SortOption = "date" | "price_asc" | "price_desc" | "hours";

const EquipmentMarketplace = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"sale" | "rent">("sale");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [showAddModal, setShowAddModal] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 1000000,
    minYear: 2000,
    maxYear: new Date().getFullYear(),
    location: "",
    brand: "",
  });

  // Fetch equipment for sale
  const { data: forSale = [], isLoading: loadingSale } = useQuery({
    queryKey: ["equipment-sale", searchQuery, selectedCategory, sortBy, filters],
    queryFn: async () => {
      let query = supabase
        .from("equipment_marketplace")
        .select("*")
        .eq("is_sold", false);

      if (searchQuery) {
        query = query.or(`equipment_type.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`);
      }
      if (selectedCategory) {
        query = query.eq("equipment_type", selectedCategory);
      }
      if (filters.location) {
        query = query.ilike("location", `%${filters.location}%`);
      }
      if (filters.brand) {
        query = query.ilike("brand", `%${filters.brand}%`);
      }
      query = query.gte("price", filters.minPrice).lte("price", filters.maxPrice);
      if (filters.minYear) {
        query = query.gte("year", filters.minYear);
      }
      if (filters.maxYear) {
        query = query.lte("year", filters.maxYear);
      }

      // Sorting
      if (sortBy === "date") query = query.order("created_at", { ascending: false });
      if (sortBy === "price_asc") query = query.order("price", { ascending: true });
      if (sortBy === "price_desc") query = query.order("price", { ascending: false });
      if (sortBy === "hours") query = query.order("hours_used", { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch equipment for rent
  const { data: forRent = [], isLoading: loadingRent } = useQuery({
    queryKey: ["equipment-rent", searchQuery, selectedCategory, sortBy, filters],
    queryFn: async () => {
      let query = supabase
        .from("equipment_rentals")
        .select("*")
        .eq("is_available", true);

      if (searchQuery) {
        query = query.or(`equipment_type.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`);
      }
      if (selectedCategory) {
        query = query.eq("equipment_type", selectedCategory);
      }
      if (filters.location) {
        query = query.ilike("location", `%${filters.location}%`);
      }
      if (filters.brand) {
        query = query.ilike("brand", `%${filters.brand}%`);
      }
      query = query.gte("daily_rate", filters.minPrice).lte("daily_rate", filters.maxPrice);
      if (filters.minYear) {
        query = query.gte("year", filters.minYear);
      }
      if (filters.maxYear) {
        query = query.lte("year", filters.maxYear);
      }

      // Sorting
      if (sortBy === "date") query = query.order("created_at", { ascending: false });
      if (sortBy === "price_asc") query = query.order("daily_rate", { ascending: true });
      if (sortBy === "price_desc") query = query.order("daily_rate", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const currentItems = activeTab === "sale" ? forSale : forRent;
  const isLoading = activeTab === "sale" ? loadingSale : loadingRent;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowRight className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-foreground">🚜 שוק הציוד</h1>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              פרסם מודעה
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Search Area */}
      <div className="bg-gradient-to-l from-orange-500/20 via-yellow-500/10 to-orange-600/20 border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">
              מצא ציוד כבד למכירה והשכרה
            </h2>
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="חפש לפי סוג ציוד, יצרן או דגם..."
                className="pr-12 h-14 text-lg bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border sticky top-[73px] z-40">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "sale" | "rent")}>
            <TabsList className="w-full justify-start h-12 bg-transparent p-0 border-b-0">
              <TabsTrigger 
                value="sale" 
                className="h-12 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none"
              >
                למכירה
              </TabsTrigger>
              <TabsTrigger 
                value="rent"
                className="h-12 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none"
              >
                להשכרה
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Category Bar */}
      <EquipmentCategoryBar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters - Hidden on mobile */}
          <aside className="hidden lg:block lg:w-64 shrink-0">
            <EquipmentFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          </aside>

          {/* Listings */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
              <div className="text-base sm:text-lg text-muted-foreground">
                {activeTab === "sale" ? "ציוד למכירה" : "ציוד להשכרה"} • {currentItems.length} תוצאות
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {/* Mobile filter button */}
                <Button 
                  variant="outline" 
                  className="lg:hidden flex-1 sm:flex-none min-h-[44px]"
                  onClick={() => {/* TODO: Open filter sheet */}}
                >
                  <Search className="h-4 w-4 ml-2" />
                  סינון
                </Button>
                <select
                  className="px-3 sm:px-4 py-2 border border-border rounded-md bg-background text-foreground text-sm sm:text-base flex-1 sm:flex-none min-h-[44px]"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                >
                  <option value="date">מיון: תאריך</option>
                  <option value="price_asc">מחיר: נמוך לגבוה</option>
                  <option value="price_desc">מחיר: גבוה לנמוך</option>
                  {activeTab === "sale" && <option value="hours">שעות עבודה</option>}
                </select>
              </div>
            </div>

            {/* Listings Grid */}
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">טוען...</div>
            ) : currentItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                לא נמצאו תוצאות. נסה לשנות את הפילטרים או את החיפוש.
              </div>
            ) : (
              <div className="space-y-4">
                {currentItems.map((item) => (
                  <EquipmentListingCard
                    key={item.id}
                    item={item}
                    type={activeTab}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Add Listing Modal */}
      <AddListingModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />
    </div>
  );
};

export default EquipmentMarketplace;
