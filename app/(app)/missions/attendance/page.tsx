import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { getMissionsOverview, seoulDateKey } from "@/lib/missions";
import { AttendanceStampCard } from "../attendance-stamp-card";
import { MissionDetailLayout } from "../mission-detail-header";

export default async function AttendanceMissionPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const missions = await getMissionsOverview(user.id);
  const mission = missions.find((item) => item.id === "attendance");
  if (!mission) {
    notFound();
  }

  const dateLabel = seoulDateKey().replaceAll("-", "/");

  return (
    <MissionDetailLayout mission={mission}>
      <AttendanceStampCard
        stamped={mission.completed}
        dateLabel={dateLabel}
      />
    </MissionDetailLayout>
  );
}
