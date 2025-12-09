import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface EquipmentCategoryBarProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const categories = [
  { id: "backhoe", label: "באגר", emoji: "🚜" },
  { id: "bobcat", label: "בובקט", emoji: "🏗️" },
  { id: "truck", label: "משאית", emoji: "🚛" },
  { id: "grader", label: "מפלסת", emoji: "⚙️" },
  { id: "loader", label: "שופל", emoji: "🔧" },
  { id: "semi-trailer", label: "טריילר", emoji: "🚚" },
  { id: "excavator", label: "חופר", emoji: "⛏️" },
  { id: "laborer", label: "פועל", emoji: "👷" },
];

export const EquipmentCategoryBar = ({
  selectedCategory,
  onSelectCategory,
}: EquipmentCategoryBarProps) => {
  return (
    <div className="bg-card border-b border-border">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-3">
            <button
              onClick={() => onSelectCategory(null)}
              className={cn(
                "inline-flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all",
                "hover:bg-muted",
                selectedCategory === null
                  ? "bg-orange-500/10 border-2 border-orange-500 text-orange-700"
                  : "border-2 border-transparent"
              )}
            >
              <span className="text-2xl">🏆</span>
              <span className="text-sm font-medium whitespace-nowrap">הכל</span>
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() =>
                  onSelectCategory(
                    selectedCategory === category.id ? null : category.id
                  )
                }
                className={cn(
                  "inline-flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all",
                  "hover:bg-muted",
                  selectedCategory === category.id
                    ? "bg-orange-500/10 border-2 border-orange-500 text-orange-700"
                    : "border-2 border-transparent"
                )}
              >
                <span className="text-2xl">{category.emoji}</span>
                <span className="text-sm font-medium whitespace-nowrap">
                  {category.label}
                </span>
              </button>
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
