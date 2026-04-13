import { useGame } from '../context/GameContext'
import { GAME_RULES } from '../data/gameData'

export default function StaffPanel() {
  const { state, computed } = useGame()
  const { staff, targetDay, phase, warnings, tasks } = state
  const { staffAssignments } = computed

  // Calculate estimated utilization during planning phase
  const estimatedUtilization = (() => {
    if (phase !== 'planning') return null

    // Total available person-days from staff
    const totalCapacity = staff.reduce((sum, s) => sum + (s.availability / 100), 0) * targetDay

    // Count staff who are assigned vs idle
    const assignedStaff = staff.filter(s => (staffAssignments[s.id] || []).length > 0)
    const assignedCapacity = assignedStaff.reduce((sum, s) => sum + (s.availability / 100), 0) * targetDay

    // Total effort required
    const totalEffort = tasks.reduce((sum, t) => sum + t.effort, 0)

    // Estimate: how much of assigned capacity will be used by the work
    // This is a rough estimate - actual depends on parallelization
    const estimatedWorkDays = Math.min(totalEffort, assignedCapacity)
    const utilizationPercent = totalCapacity > 0 ? (estimatedWorkDays / totalCapacity) * 100 : 0

    return {
      percent: Math.round(utilizationPercent),
      isIdeal: utilizationPercent >= GAME_RULES.idealUtilizationMin && utilizationPercent <= GAME_RULES.idealUtilizationMax,
      isLow: utilizationPercent < GAME_RULES.idealUtilizationMin,
      assignedCount: assignedStaff.length,
      totalCount: staff.length,
    }
  })()

  return (
    <div>
      {/* Target deadline */}
      <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-emerald-400 text-xs uppercase tracking-wider font-medium">Target Deadline</span>
          <span className="text-lg font-bold text-white">
            Day {targetDay} <span className="text-emerald-400 text-sm">(Week {Math.ceil(targetDay / 5)})</span>
          </span>
        </div>
      </div>

      {/* Estimated Utilization Preview (planning phase only) */}
      {
      // estimatedUtilization && (
      //   <div className={`rounded-lg p-3 mb-4 border ${estimatedUtilization.isIdeal ? 'bg-emerald-500/10 border-emerald-500/30' :
      //     estimatedUtilization.isLow ? 'bg-amber-500/10 border-amber-500/30' :
      //       'bg-orange-500/10 border-orange-500/30'
      //     }`}>
      //     <div className="flex items-center justify-between mb-1">
      //       <span className={`text-xs uppercase tracking-wider font-medium ${estimatedUtilization.isIdeal ? 'text-emerald-400' :
      //         estimatedUtilization.isLow ? 'text-amber-400' : 'text-orange-400'
      //         }`}>
      //         Est. Utilization
      //       </span>
      //       <span className={`text-lg font-bold ${estimatedUtilization.isIdeal ? 'text-emerald-400' :
      //         estimatedUtilization.isLow ? 'text-amber-400' : 'text-orange-400'
      //         }`}>
      //         ~{estimatedUtilization.percent}%
      //       </span>
      //     </div>
      //     <div className="text-xs text-slate-400">
      //       {estimatedUtilization.assignedCount}/{estimatedUtilization.totalCount} staff assigned
      //       {estimatedUtilization.isIdeal && ' ✓ Ideal range'}
      //       {/* {estimatedUtilization.isLow && ' (below 40% = penalty)'} */}
      //       {!estimatedUtilization.isIdeal && !estimatedUtilization.isLow && ' (above 60% = penalty)'}
      //     </div>
      //   </div>
      // )
      }

      {/* Real-time Warnings during simulation */}
      {(phase === 'running' || phase === 'paused') && warnings.length > 0 && (
        <div className="space-y-2 mb-4">
          {warnings.map((warning, idx) => (
            <div
              key={idx}
              className={`rounded-lg p-3 border flex items-center gap-2 text-sm font-medium ${warning.type === 'error' ? 'bg-red-500/10 border-red-500/40 text-red-400' :
                warning.type === 'warning' ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' :
                  'bg-blue-500/10 border-blue-500/40 text-blue-400'
                }`}
            >
              {warning.type === 'error' ? '❌' : warning.type === 'warning' ? '⚠️' : 'ℹ️'}
              {warning.message}
            </div>
          ))}
        </div>
      )}

      {/* Staff list */}
      <div className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-3">
        Your Team ({staff.length})
      </div>

      <div className="space-y-2">
        {staff.map(member => {
          const assignedTo = staffAssignments[member.id] || []
          const isUnassigned = assignedTo.length === 0
          const onMultipleTasks = assignedTo.length === 2

          return (
            <div
              key={member.id}
              className={`rounded-lg p-3 transition-colors border ${isUnassigned
                ? 'bg-amber-500/10 border-amber-500/30'
                : onMultipleTasks
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-slate-700/40 border-slate-600/50'
                }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white flex items-center gap-2">
                    {member.name}
                    {onMultipleTasks && <span className="text-blue-400 text-xs">📋×2</span>}
                  </div>
                  <div className="text-slate-400 text-xs">
                    {member.availability === 100 ? 'Full-time' : `Part-time (${member.availability}%)`}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-sm font-medium ${assignedTo.length === 0 ? 'text-amber-400' :
                    assignedTo.length === 2 ? 'text-blue-400' : 'text-slate-400'
                    }`}>
                    {assignedTo.length} task(s)
                  </div>
                </div>
              </div>

              {assignedTo.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-600/50 text-xs text-slate-400">
                  Assigned to: {assignedTo.length} task(s)
                  {onMultipleTasks && <span className="text-blue-400 ml-2">(80% if tasks overlap)</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Rules */}
      <div className="mt-4 pt-4 border-t border-slate-600">
        <div className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-2">Game Rules</div>
        <div className="text-slate-500 text-xs space-y-1">
          <p>• Max 2 staff per task (160% combined, not 200%)</p>
          <p>• Max 2 tasks per person (80% efficiency each)</p>
          <p>• All staff must be assigned</p>
          <p>• Target utilization: 40-60%</p>
        </div>
      </div>
    </div>
  )
}
