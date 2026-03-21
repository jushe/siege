import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { reviews, reviewItems, reviewComments, scheduleItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get("planId");
  const type = req.nextUrl.searchParams.get("type");

  if (!planId) {
    return NextResponse.json(
      { error: "planId is required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const query = db.select().from(reviews).where(eq(reviews.planId, planId));

  const allReviews = query.all().filter((r) => !type || r.type === type);

  // Build schedule item lookup for task info enrichment
  const scheduleItemMap = new Map<string, { title: string; order: number }>();
  const allScheduleItems = db.select().from(scheduleItems).all();
  for (const si of allScheduleItems) {
    scheduleItemMap.set(si.id, { title: si.title, order: si.order });
  }

  const result = allReviews.map((review) => {
    const items = db
      .select()
      .from(reviewItems)
      .where(eq(reviewItems.reviewId, review.id))
      .all()
      .map((item) => {
        const task = item.targetType === "schedule_item" && item.targetId
          ? scheduleItemMap.get(item.targetId)
          : undefined;
        return {
          ...item,
          taskTitle: task?.title || null,
          taskOrder: task?.order ?? null,
        };
      });
    const comments = db
      .select()
      .from(reviewComments)
      .where(eq(reviewComments.reviewId, review.id))
      .all();
    return { ...review, items, comments };
  });

  return NextResponse.json(result);
}
