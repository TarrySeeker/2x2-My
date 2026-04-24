import { listAllTeamMembers } from "@/lib/data/team";
import TeamPageClient from "@/features/admin/components/TeamPageClient";

export const metadata = { title: "Команда" };

export default async function TeamAdminPage() {
  const members = await listAllTeamMembers();
  return <TeamPageClient initialMembers={members} />;
}
