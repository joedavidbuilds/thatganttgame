import { useGame } from '../context/GameContext'
import { GAME_RULES } from '../data/gameData'

export default function ResultsScreen() {
  const { state, actions } = useGame()
  const { finalScore, completionDay, targetDay, tasks, staff, avgUtilization, utilizationByStaff } = state

  const allCompleted = tasks.every(t => t.completed)
  const isWin = allCompleted && completionDay <= targetDay
  const isLate = allCompleted && completionDay > targetDay
  const isFailed = !allCompleted

  const daysDiff = completionDay ? completionDay - targetDay : 0

  // Calculate score breakdown
  const latePoints = daysDiff > 0 ? daysDiff * 5 : 0

  const utilizationIdeal = avgUtilization >= GAME_RULES.idealUtilizationMin &&
    avgUtilization <= GAME_RULES.idealUtilizationMax
  const utilizationPenalty = (() => {
    if (utilizationIdeal) return 0
    if (avgUtilization < GAME_RULES.idealUtilizationMin) {
      return Math.floor((GAME_RULES.idealUtilizationMin - avgUtilization) / 5) * 2
    }
    return Math.floor((avgUtilization - GAME_RULES.idealUtilizationMax) / 5) * 2
  })()

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-600 w-full max-w-md my-4 sm:my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`px-6 py-5 text-center ${isWin ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' :
          isLate ? 'bg-gradient-to-r from-amber-600 to-amber-500' :
            'bg-gradient-to-r from-red-600 to-red-500'
          }`}>
          <div className="text-5xl mb-2">
            {isWin ? '🎉' : isLate ? '⚠️' : '💥'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {isWin ? 'Project Success!' :
              isFailed ? 'Project Failed!' :
                'Completed Late!'}
          </h2>
          <p className="text-white/80 mt-1 text-sm sm:text-base">
            {isWin ? 'Excellent work, Project Manager!' :
              isFailed ? 'You ran out of time!' :
                'Better luck next time...'}
          </p>
        </div>

        {/* Score */}
        <div className="px-6 py-5 text-center border-b border-slate-700">
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Final Score</div>
          <div className={`text-5xl sm:text-6xl font-black ${finalScore >= 100 ? 'text-emerald-400' :
            finalScore >= 70 ? 'text-amber-400' :
              'text-red-400'
            }`}>
            {finalScore}
          </div>
          <div className="text-slate-500 text-sm mt-1">out of 100</div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 space-y-2 text-sm sm:text-base">
          {/* Time Stats */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Completion</span>
            <span className={`font-bold ${completionDay && completionDay <= targetDay ? 'text-emerald-400' : 'text-red-400'
              }`}>
              {completionDay ? `Day ${completionDay}` : 'Not completed'}
              {completionDay && daysDiff !== 0 && (
                <span className="ml-1 text-xs sm:text-sm">
                  ({daysDiff > 0 ? `${daysDiff}d late` : `${Math.abs(daysDiff)}d early`})
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Target</span>
            <span className="font-bold text-slate-200">Day {targetDay}</span>
          </div>

          {/* Utilization Stats */}
          <div className="border-t border-slate-700 pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Utilization</span>
              <span className={`font-bold ${utilizationIdeal ? 'text-emerald-400' : 'text-amber-400'}`}>
                {avgUtilization?.toFixed(1)}%
                <span className="ml-1 text-xs text-slate-500">
                  (ideal: 40-60%)
                </span>
              </span>
            </div>
          </div>

          {/* Tasks */}
          <div className="flex items-center justify-between border-t border-slate-700 pt-2">
            <span className="text-slate-400">Tasks Completed</span>
            <span className={`font-bold ${allCompleted ? 'text-emerald-400' : 'text-red-400'}`}>
              {tasks.filter(t => t.completed).length} / {tasks.length}
            </span>
          </div>
        </div>

        {/* Score Breakdown */}
        <details className="group">
          <summary className="px-6 py-3 bg-slate-900/50 border-t border-slate-700 cursor-pointer text-slate-400 text-xs uppercase tracking-wider hover:bg-slate-900/70 transition-colors flex items-center justify-between">
            <span>Score Breakdown</span>
            <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 py-3 bg-slate-900/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Base score</span>
              <span className="text-slate-300">100</span>
            </div>
            {latePoints > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Late penalty ({daysDiff}d × 5)</span>
                <span className="text-red-400">-{latePoints}</span>
              </div>
            )}
            {!allCompleted && (
              <div className="flex justify-between">
                <span className="text-slate-500">Incomplete penalty</span>
                <span className="text-red-400">-50</span>
              </div>
            )}
            {utilizationPenalty > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">
                  Utilization penalty ({avgUtilization?.toFixed(0)}%)
                </span>
                <span className="text-red-400">-{utilizationPenalty}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-700 pt-2 font-bold">
              <span className="text-slate-300">Final Score</span>
              <span className={finalScore >= 70 ? 'text-emerald-400' : 'text-red-400'}>
                {finalScore}
              </span>
            </div>
          </div>
        </details>

        {/* Task Details */}
        <details className="group">
          <summary className="px-6 py-3 bg-slate-900/50 border-t border-slate-700 cursor-pointer text-slate-400 text-xs uppercase tracking-wider hover:bg-slate-900/70 transition-colors flex items-center justify-between">
            <span>Task Details</span>
            <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 py-3 bg-slate-900/50 space-y-2 text-sm max-h-40 overflow-y-auto">
            {tasks.map(task => (
              <div key={task.id} className="flex justify-between items-center">
                <span className="text-slate-400 truncate pr-2">{task.name}</span>
                <span className={`font-mono ${task.completed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {task.completed ? (
                    <>
                      ✓ Day {task.completedDay}
                      <span className="text-xs text-slate-500 ml-1">
                        ({task.effort} pd)
                      </span>
                    </>
                  ) : (
                    <>{task.progress.toFixed(1)}/{task.effort} pd</>
                  )}
                </span>
              </div>
            ))}
          </div>
        </details>

        {/* Staff Utilization - NEW */}
        <details className="group" open>
          <summary className="px-6 py-3 bg-slate-900/50 border-t border-slate-700 cursor-pointer text-slate-400 text-xs uppercase tracking-wider hover:bg-slate-900/70 transition-colors flex items-center justify-between">
            <span>Staff Utilization</span>
            <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 py-3 bg-slate-900/50 space-y-3 text-sm">
            {staff.map(member => {
              const utilData = utilizationByStaff?.[member.id]
              const percent = utilData?.percentage || 0
              const worked = utilData?.worked || 0
              const max = utilData?.max || 0
              const isIdeal = percent >= GAME_RULES.idealUtilizationMin && percent <= GAME_RULES.idealUtilizationMax
              const isLow = percent < GAME_RULES.idealUtilizationMin

              return (
                <div key={member.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.name[0]}
                      </div>
                      <span className="text-slate-300">{member.name}</span>
                      <span className="text-xs text-slate-500">
                        ({member.availability === 100 ? 'FT' : 'PT'})
                      </span>
                    </div>
                    <span className={`font-bold ${isIdeal ? 'text-emerald-400' : isLow ? 'text-amber-400' : 'text-orange-400'}`}>
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${isIdeal ? 'bg-emerald-500' : isLow ? 'bg-amber-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    {worked.toFixed(1)} / {max.toFixed(0)} person-days worked
                  </div>
                </div>
              )
            })}
          </div>
        </details>

        {/* Play Again */}
        <div className="px-6 py-4 border-t border-slate-700">
          <button
            onClick={() => actions.resetGame()}
            className="w-full py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg transition-all active:scale-95"
          >
            🔄 Play Again
          </button>
        </div>
      </div>
    </div>
  )
}
