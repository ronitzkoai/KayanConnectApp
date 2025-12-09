import { Card } from "@/components/ui/card";
import bobcatImg from "@/assets/equipment/bobcat.jpg";
import backhoeImg from "@/assets/equipment/backhoe.jpg";
import loaderImg from "@/assets/equipment/loader.jpg";
import graderImg from "@/assets/equipment/grader.jpg";
import laborerImg from "@/assets/equipment/laborer.jpg";
import miniExcavatorImg from "@/assets/equipment/mini-excavator.jpg";
import excavatorImg from "@/assets/equipment/excavator.jpg";
import miniBackhoeImg from "@/assets/equipment/mini-backhoe.jpg";
import wheeledBackhoeImg from "@/assets/equipment/wheeled-backhoe.jpg";
import telescopicLoaderImg from "@/assets/equipment/telescopic-loader.jpg";
import breakerImg from "@/assets/equipment/breaker.jpg";
import trucksImg from "@/assets/equipment/trucks.jpg";

interface Equipment {
  type: string;
  label: string;
  image?: string;
  isCategory?: boolean;
}

interface EquipmentSelectorProps {
  onSelect: (type: string, label: string) => void;
}

const equipment: Equipment[] = [
  { 
    type: "bobcat", 
    label: "בובקט", 
    image: bobcatImg,
  },
  { 
    type: "backhoe", 
    label: "באגר", 
    image: backhoeImg,
  },
  { 
    type: "loader", 
    label: "שופל", 
    image: loaderImg,
  },
  { 
    type: "grader", 
    label: "מפלסת", 
    image: graderImg,
  },
  { 
    type: "mini_excavator", 
    label: "מיני מחפרון", 
    image: miniExcavatorImg,
  },
  { 
    type: "excavator", 
    label: "מחפרון", 
    image: excavatorImg,
  },
  { 
    type: "mini_backhoe", 
    label: "מיני באגר", 
    image: miniBackhoeImg,
  },
  { 
    type: "wheeled_backhoe", 
    label: "באגר גלגלים", 
    image: wheeledBackhoeImg,
  },
  { 
    type: "telescopic_loader", 
    label: "מעמיס טלסקופי", 
    image: telescopicLoaderImg,
  },
  { 
    type: "breaker", 
    label: "פטישון", 
    image: breakerImg,
  },
  { 
    type: "trucks", 
    label: "משאיות", 
    image: trucksImg,
    isCategory: true,
  },
  { 
    type: "laborer", 
    label: "פועל", 
    image: laborerImg,
  },
];

export const EquipmentSelector = ({ onSelect }: EquipmentSelectorProps) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
      {equipment.map((item) => (
        <Card
          key={item.type}
          className="group cursor-pointer transition-all duration-300 bg-card border border-border/50 hover:border-primary/40 hover:shadow-md overflow-hidden min-h-[44px]"
          onClick={() => onSelect(item.type, item.label)}
        >
          <div className="aspect-[4/3] flex flex-col">
            <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-muted/30 to-background">
              <img 
                src={item.image} 
                alt={item.label}
                className="w-full h-full object-contain p-2 sm:p-4 transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="px-2 sm:px-4 py-2 sm:py-3 text-center border-t border-border/50">
              <span className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">
                {item.label}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
