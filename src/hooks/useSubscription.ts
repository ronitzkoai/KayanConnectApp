import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase-context";

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  amount: number;
  created_at: string;
  updated_at: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
      } else {
        setSubscription(data);
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  const isTrialActive = () => {
    if (!subscription) return false;
    if (subscription.status !== "trial") return false;
    if (!subscription.trial_ends_at) return false;
    return new Date(subscription.trial_ends_at) > new Date();
  };

  const isSubscriptionActive = () => {
    if (!subscription) return false;
    if (subscription.status === "active") return true;
    return isTrialActive();
  };

  const getDaysRemaining = () => {
    if (!subscription?.trial_ends_at) return 0;
    const endDate = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const createTrialSubscription = async (planType: string) => {
    if (!user) return { error: "No user logged in" };

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_type: planType,
        status: "trial",
        trial_ends_at: trialEndsAt.toISOString(),
        amount: 0,
      })
      .select()
      .single();

    if (!error && data) {
      setSubscription(data);
    }

    return { data, error };
  };

  const createPaidSubscription = async (planType: string, amount: number) => {
    if (!user) return { error: "No user logged in" };

    const now = new Date();
    const periodEnd = new Date();
    
    if (planType.includes("yearly")) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_type: planType,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        amount,
      })
      .select()
      .single();

    if (!error && data) {
      setSubscription(data);
    }

    return { data, error };
  };

  return {
    subscription,
    loading,
    isTrialActive,
    isSubscriptionActive,
    getDaysRemaining,
    createTrialSubscription,
    createPaidSubscription,
  };
};
