import { listActiveTeamMembers } from '@/lib/data/team'
import TeamSectionClient from './TeamSectionClient'

/**
 * Блок «Наша команда» — рендерится только если в БД есть активные
 * сотрудники (master-plan правка 11). Если пусто — секцию не показываем,
 * чтобы не было кулсайта с заглушками.
 */
export default async function AboutTeam() {
  const team = await listActiveTeamMembers()
  if (!team || team.length === 0) return null
  return <TeamSectionClient team={team} />
}
