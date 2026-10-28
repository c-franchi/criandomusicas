import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import ReviewForm from "@/components/ReviewForm";
import ReactionVideoUpload from "@/components/ReactionVideoUpload";
import { Button } from "@/components/ui/button";

export default function GiftFeedback({ orderId, userId }: { orderId: string; userId: string }) {
  const { t } = useTranslation("home");
  const feedback = useQuery({
    queryKey: ["gift-feedback", orderId, userId],
    queryFn: async () => {
      const [review, videos] = await Promise.all([
        supabase.from("reviews").select("id,rating,comment,is_public,allow_music_sample").eq("order_id", orderId).eq("user_id", userId).maybeSingle(),
        supabase.from("reaction_videos").select("id").eq("order_id", orderId).eq("user_id", userId).limit(1),
      ]);
      if (review.error) throw review.error;
      if (videos.error) throw videos.error;
      return { review: review.data, hasVideo: !!videos.data?.length };
    },
  });
  if (feedback.isPending) return <p role="status">{t("giftFlow.loading")}</p>;
  if (feedback.isError) return <div role="alert" className="space-y-3"><p>{t("giftFlow.loadError")}</p><Button variant="outline" onClick={() => void feedback.refetch()}>{t("giftFlow.retry")}</Button></div>;
  return <div className="my-7 space-y-6">
    <ReviewForm key={feedback.data.review?.id || orderId} orderId={orderId} userId={userId} existingReview={feedback.data.review ? {...feedback.data.review, is_public: !!feedback.data.review.is_public} : undefined} onReviewSubmitted={() => void feedback.refetch()} />
    {!feedback.data.hasVideo && <ReactionVideoUpload orderId={orderId} userId={userId} onUploadComplete={() => void feedback.refetch()} />}
  </div>;
}