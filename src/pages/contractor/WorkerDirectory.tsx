import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Briefcase, Phone, User, Search, Shield } from "lucide-react";
import { ContractorLayout } from "@/components/ContractorLayout";
import backhoeOperator from "@/assets/workers/backhoe-operator.jpg";
import loaderOperator from "@/assets/workers/loader-operator.jpg";
import bobcatOperator from "@/assets/workers/bobcat-operator.jpg";
import laborer from "@/assets/workers/laborer.jpg";
import truckDriver from "@/assets/workers/truck-driver.jpg";
import graderOperator from "@/assets/workers/grader-operator.jpg";
import semiDriver from "@/assets/workers/semi-driver.jpg";

interface Worker {
  id: string;
  user_id: string;
  work_type: string;
  location: string | null;
  rating: number;
  experience_years: number;
  is_verified: boolean;
  profiles: {
    full_name: string;
    phone: string;
    avatar_url: string | null;
  };
}

const WorkerDirectory = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    filterWorkers();
  }, [workers, searchTerm, workTypeFilter]);

  const loadWorkers = async () => {
    const { data } = await supabase
      .from("worker_profiles")
      .select(`
        *,
        profiles:user_id (
          full_name,
          phone,
          avatar_url
        )
      `)
      .eq("is_available", true)
      .order("rating", { ascending: false });
    
    if (data) setWorkers(data as any);
  };

  const filterWorkers = () => {
    let filtered = [...workers];

    if (searchTerm) {
      filtered = filtered.filter((w) =>
        w.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (workTypeFilter !== "all") {
      filtered = filtered.filter((w) => w.work_type === workTypeFilter);
    }

    setFilteredWorkers(filtered);
  };

  const getWorkTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      backhoe: "באגר",
      loader: "שופל",
      bobcat: "בובקט",
      grader: "מפלסת",
      truck_driver: "נהג משאית",
      semi_trailer: "סמי טריילר",
      laborer: "פועל",
    };
    return labels[type] || type;
  };

  const getWorkerImage = (type: string) => {
    const images: { [key: string]: string } = {
      backhoe: backhoeOperator,
      loader: loaderOperator,
      bobcat: bobcatOperator,
      grader: graderOperator,
      truck_driver: truckDriver,
      semi_trailer: semiDriver,
      laborer: laborer,
    };
    return images[type] || undefined;
  };

  return (
    <ContractorLayout>
      <div className="w-full min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-white to-stone-50/80 border-b border-stone-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-stone-900 to-stone-700 bg-clip-text text-transparent">
                  מאגר עובדים
                </h1>
                <p className="text-stone-600 text-sm mt-0.5">מצא את העובד המושלם לפרויקט שלך</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Filters */}
          <Card className="bg-white/80 backdrop-blur-sm border-stone-200 shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                  <Input
                    placeholder="חפש לפי שם עובד..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 pr-11 text-base bg-white border-stone-300 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                
                <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
                  <SelectTrigger className="w-full sm:w-56 h-12 text-base bg-white border-stone-300 focus:border-green-500 focus:ring-green-500">
                    <SelectValue placeholder="כל התפקידים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל התפקידים</SelectItem>
                    <SelectItem value="backhoe">🏗️ באגר</SelectItem>
                    <SelectItem value="loader">🚜 שופל</SelectItem>
                    <SelectItem value="bobcat">🔧 בובקט</SelectItem>
                    <SelectItem value="grader">📏 מפלסת</SelectItem>
                    <SelectItem value="truck_driver">🚛 נהג משאית</SelectItem>
                    <SelectItem value="semi_trailer">🚚 סמי טריילר</SelectItem>
                    <SelectItem value="laborer">👷 פועל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results Count */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">
                {filteredWorkers.length} עובדים
              </Badge>
              <span className="text-sm text-stone-500">זמינים כעת</span>
            </div>
          </div>

          {/* Workers List */}
          {filteredWorkers.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm border-2 border-dashed border-stone-300 shadow-md">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-stone-100 to-stone-200 mx-auto mb-6 flex items-center justify-center">
                  <Search className="h-10 w-10 text-stone-400" />
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-2">לא נמצאו עובדים</h3>
                <p className="text-base text-stone-500">נסה לשנות את קריטריוני החיפוש או לבחור תפקיד אחר</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
              {filteredWorkers.map((worker, index) => (
                <Card
                  key={worker.id}
                  className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-green-50/30 border-2 border-stone-200 hover:border-green-400 hover:shadow-xl cursor-pointer transition-all duration-300 overflow-hidden"
                  onClick={() => navigate(`/contractor/workers/${worker.user_id}`)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-white shadow-lg ring-2 ring-stone-200 group-hover:ring-green-400 transition-all duration-300">
                          <AvatarImage src={getWorkerImage(worker.work_type)} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-br from-stone-100 to-stone-200 text-stone-700 text-2xl font-bold">
                            <User className="h-10 w-10" />
                          </AvatarFallback>
                        </Avatar>
                        {worker.is_verified && (
                          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg ring-2 ring-white">
                            <Shield className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Worker Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-bold text-stone-900 truncate mb-1 group-hover:text-green-700 transition-colors">
                              {worker.profiles.full_name}
                            </h3>
                            <Badge variant="secondary" className="text-sm font-semibold px-2.5 py-0.5">
                              {getWorkTypeLabel(worker.work_type)}
                            </Badge>
                          </div>
                          
                          {/* Rating */}
                          <div className="flex items-center gap-1.5 bg-gradient-to-br from-yellow-50 to-amber-50 px-3 py-1.5 rounded-full border border-yellow-200 shrink-0">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-base font-bold text-stone-900">
                              {worker.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="space-y-2 mb-4">
                          {worker.location && (
                            <div className="flex items-center gap-2 text-sm text-stone-600">
                              <MapPin className="h-4 w-4 text-green-600" />
                              <span className="font-medium">{worker.location}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm text-stone-600">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{worker.experience_years} שנות ניסיון</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-stone-600">
                            <Phone className="h-4 w-4 text-orange-600" />
                            <span dir="ltr" className="font-medium">{worker.profiles.phone}</span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <Button
                          variant="default"
                          className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-md group-hover:shadow-lg transition-all duration-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/contractor/workers/${worker.user_id}`);
                          }}
                        >
                          צפה בפרופיל המלא
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ContractorLayout>
  );
};

export default WorkerDirectory;
