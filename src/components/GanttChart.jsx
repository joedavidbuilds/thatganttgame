import { useGame } from '../context/GameContext'
import { TOTAL_DAYS, TARGET_DAY } from '../data/gameData'
import { areDependenciesMet } from '../utils/gameEngine'

export default function GanttChart() {
  const { state, computed } = useGame()
  const { tasks, staff, currentDay, phase } = state
  const { staffAssignments } = computed

  const weeks = [1, 2, 3, 4] // 20 days / 5 days per week = 4 weeks

  const getStaffById = (id) => staff.find(s => s.id === id)

  // Calculate FIXED scheduled position based on estimated dependencies
  // These positions don't change during simulation - only the progress fill changes
  const getScheduledPosition = (task, allTasks, memo = {}) => {
    // Use memoization to avoid recalculating
    if (memo[task.id]) return memo[task.id]

    // Find scheduled start based on dependencies' scheduled end times
    let scheduledStart = 1
    if (task.dependencies.length > 0) {
      task.dependencies.forEach(depId => {
        const depTask = allTasks.find(t => t.id === depId)
        if (depTask) {
          // Use scheduled position of dependency (not actual completion)
          const depPos = getScheduledPosition(depTask, allTasks, memo)
          const depEnd = ((depPos.startPercent / 100) * TOTAL_DAYS) + ((depPos.widthPercent / 100) * TOTAL_DAYS)
          scheduledStart = Math.max(scheduledStart, Math.ceil(depEnd) + 1)
        }
      })
    }

    const startPercent = ((scheduledStart - 1) / TOTAL_DAYS) * 100
    const widthPercent = (task.duration / TOTAL_DAYS) * 100

    memo[task.id] = { startPercent, widthPercent, scheduledStart }
    return memo[task.id]
  }

  // Pre-calculate all scheduled positions (these are fixed)
  const scheduledPositions = {}
  tasks.forEach(task => {
    scheduledPositions[task.id] = getScheduledPosition(task, tasks, scheduledPositions)
  })

  // Timeline position: center the indicator on the current day
  // Day 1 = 2.5% (center of first day cell), Day 6 = 27.5% (center of 6th day cell)
  // Each day spans 5% of the timeline (100% / 20 days)
  const timelinePercent = currentDay > 0 ? ((currentDay - 0.5) / TOTAL_DAYS) * 100 : 0

  // Get dependency arrows data
  const getDependencyArrows = () => {
    const arrows = []
    tasks.forEach(task => {
      task.dependencies.forEach(depId => {
        const depTask = tasks.find(t => t.id === depId)
        if (depTask) {
          arrows.push({
            from: depId,
            to: task.id,
          })
        }
      })
    })
    return arrows
  }

  const dependencyArrows = getDependencyArrows()

  return (
    <div className="font-sans relative min-w-[700px]">
      {/* Header Row */}
      <div className="flex border-b-2 border-slate-500">
        <div className="w-44 flex-shrink-0 py-2 px-3 bg-slate-700 font-semibold text-slate-300 text-sm">
          Task
        </div>
        <div className="flex-1 flex relative">
          {weeks.map((week) => (
            <div
              key={week}
              className="flex-1 py-2 text-center font-semibold text-slate-300 text-sm bg-slate-700 border-l border-slate-500"
            >
              Week {week}
            </div>
          ))}
        </div>
        {/* Effort column header */}
        <div className="w-24 flex-shrink-0 py-2 px-2 bg-slate-700 font-semibold text-slate-300 text-sm text-center border-l border-slate-500">
          Effort
        </div>
      </div>

      {/* Project Start Row */}
      <div className="flex border-b border-slate-600 h-10">
        <div className="w-44 flex-shrink-0 py-2 px-3 text-emerald-400 font-medium text-sm flex items-center">
          ◆ Project Start
        </div>
        <div className="flex-1 relative bg-slate-800/50">
          <DayGrid />
        </div>
        <div className="w-24 flex-shrink-0" />
      </div>

      {/* Task Rows */}
      {tasks.map((task, taskIndex) => {
        const { startPercent, widthPercent } = scheduledPositions[task.id]
        const progressPercent = task.effort > 0 ? Math.min((task.progress / task.effort) * 100, 100) : 0
        const assignedStaffMembers = task.assignedStaff.map(id => getStaffById(id)).filter(Boolean)
        const canStart = areDependenciesMet(task, tasks)
        const isBlocked = !canStart && !task.completed

        return (
          <div key={task.id} className="flex border-b border-slate-600 h-14 hover:bg-slate-700/30">
            <div className="w-44 flex-shrink-0 py-2 px-3 text-slate-200 text-sm flex items-center">
              <span className="truncate">{task.name}</span>
              {task.completed && <span className="ml-2 text-emerald-400">✓</span>}
              {isBlocked && <span className="ml-2 text-amber-400 text-xs">🔒</span>}
            </div>
            <div className="flex-1 relative">
              <DayGrid />

              {/* Dependency connector lines - 5-segment staircase from parent tasks */}
              {task.dependencies.map((depId, depIndex) => {
                const depTask = tasks.find(t => t.id === depId)
                if (!depTask) return null

                const depTaskIndex = tasks.findIndex(t => t.id === depId)

                // Find the lowest dependency (max index) to act as the "bus" level
                const depIndices = task.dependencies.map(id => tasks.findIndex(t => t.id === id)).filter(i => i !== -1)
                const maxDepIndex = Math.max(...depIndices)

                const depPosition = scheduledPositions[depId]
                const depEndPercent = depPosition.startPercent + depPosition.widthPercent
                const rowHeight = 56 // h-14 = 3.5rem = 56px
                const rowsDown = taskIndex - depTaskIndex

                // Calculate the total vertical drop
                const totalVerticalDrop = rowsDown * rowHeight

                // Logic for parallel line merging:
                // If this is not the lowest dependency in the group, drop down to the lowest one's level first
                // This creates a shared vertical "bus" at the bottom task's level
                const rowsToLowestDep = maxDepIndex - depTaskIndex
                const extraDrop = rowsToLowestDep > 0 ? rowsToLowestDep * rowHeight : 0

                // Segment dimensions
                const seg1Length = 1.2 // % - first horizontal (going right)

                // Segment 2 (First Vertical): Standard 25px OR extended to meet the lowest dependency
                const seg2Length = 25 + extraDrop

                const seg3Length = 3 // % - second horizontal (going LEFT, back toward start)
                const seg4Length = totalVerticalDrop - seg2Length  // remaining vertical drop to target

                const seg5Start = depEndPercent + seg1Length - seg3Length // X position after going back left

                // Key positions
                const corner1X = depEndPercent + seg1Length // after first horizontal
                const corner1Y = totalVerticalDrop // from parent row (0 = parent, totalVerticalDrop = current)
                const corner2Y = seg2Length // after first vertical drop
                const corner3X = corner1X - seg3Length // after going left
                const corner4Y = seg2Length + seg4Length // at current row level

                return (
                  <div
                    key={depId}
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 5, overflow: 'visible' }}
                  >
                    {/* 1. First horizontal: from parent task end going RIGHT */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${depEndPercent}%`,
                        top: `calc(50% - ${totalVerticalDrop}px)`,
                        width: `${seg1Length}%`,
                        height: '2.5px',
                        backgroundColor: '#f78e8eff',
                        boxShadow: '0 0 4px rgba(241, 193, 193, 0.4)',
                      }}
                    />

                    {/* 2. First vertical: going DOWN */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${corner1X}%`,
                        top: `calc(50% - ${totalVerticalDrop}px)`,
                        width: '2.5px',
                        height: `${seg2Length}px`,
                        backgroundColor: '#f78e8eff',
                        transform: 'translateX(-50%)',
                        boxShadow: '0 0 4px rgba(239, 79, 79, 0.6)',
                      }}
                    />

                    {/* 3. Second horizontal: going LEFT (opposite direction) */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${corner3X}%`,
                        top: `calc(50% - ${totalVerticalDrop - seg2Length}px)`,
                        width: `${seg3Length}%`,
                        height: '2.5px',
                        backgroundColor: '#f78e8eff',
                        boxShadow: '0 0 4px rgba(248, 113, 113, 0.4)',
                      }}
                    />

                    {/* 4. Second vertical: going DOWN to current row */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${corner3X}%`,
                        top: `calc(50% - ${totalVerticalDrop - seg2Length}px)`,
                        width: '2.5px',
                        height: `${seg4Length}px`,
                        backgroundColor: '#f78e8eff',
                        transform: 'translateX(-50%)',
                        boxShadow: '0 0 4px rgba(239, 79, 79, 0.6)',
                      }}
                    />

                    {/* 5. Third horizontal: going RIGHT into the dependent task */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${corner3X}%`,
                        top: '50%',
                        width: `calc(${startPercent - corner3X}% - 8px)`,
                        height: '2.5px',
                        backgroundColor: '#f78e8eff',
                        transform: 'translateY(-50%)',
                        boxShadow: '0 0 4px rgba(239, 79, 79, 0.6)',
                      }}
                    />


                    {/* Arrow head pointing right into the dependent task */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${startPercent}%`,
                        top: '50%',
                        transform: 'translate(-100%, -50%)',
                        width: 0,
                        height: 0,
                        borderTop: '6px solid transparent',
                        borderBottom: '6px solid transparent',
                        borderLeft: '10px solid #f78e8eff',
                        filter: 'drop-shadow(0 0 3px rgba(248, 113, 113, 0.4))',
                      }}
                    />
                  </div>
                )
              })}

              {/* Task Bar - Outline shows scheduled duration */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-9 flex items-center z-10"
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                }}
              >
                <div className={`w-full h-full rounded shadow-lg border-2 relative overflow-hidden transition-colors duration-300 ${task.completed
                  ? 'bg-emerald-600/30 border-emerald-400'
                  : isBlocked
                    ? 'bg-slate-600/30 border-slate-500'
                    : 'bg-slate-700/50 border-rose-400'
                  }`}>
                  {/* Progress fill - fills from left as work is done */}
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${task.completed ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                  {/* Progress text overlay */}
                  <div className="absolute inset-0 flex items-center justify-between px-2 z-10">
                    <div className="flex -space-x-1">
                      {assignedStaffMembers.map(s => (
                        <div
                          key={s.id}
                          className="w-6 h-6 rounded-full border-2 border-white/50 flex items-center justify-center text-white text-xs font-bold shadow"
                          style={{ backgroundColor: s.color }}
                          title={`${s.name} (${s.availability}%)`}
                        >
                          {s.name[0]}
                        </div>
                      ))}
                      {assignedStaffMembers.length === 0 && (
                        <span className="text-white/60 text-xs">No staff</span>
                      )}
                    </div>
                    <span className="text-white text-xs font-bold drop-shadow bg-black/40 px-1.5 py-0.5 rounded">
                      {task.completed ? '✓' : `${task.progress.toFixed(1)}/${task.effort}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Effort column */}
            <div className="w-24 flex-shrink-0 flex items-center justify-center px-2 border-l border-slate-700">
              <div className="text-center">
                <div className="text-sm font-bold text-slate-300">
                  {task.effort} pd
                </div>
                <div className="text-xs text-slate-500">
                  {task.duration}d est.
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Project Complete Row */}
      <div className="flex h-10">
        <div className="w-44 flex-shrink-0 py-2 px-3 text-emerald-400 font-medium text-sm flex items-center">
          ◆ Project Complete
        </div>
        <div className="flex-1 relative bg-slate-800/50">
          <DayGrid />
          {/* Target deadline marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-500"
            style={{ left: `${(TARGET_DAY / TOTAL_DAYS) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 text-emerald-400 text-sm"
            style={{ left: `${(TARGET_DAY / TOTAL_DAYS) * 100}%`, transform: 'translate(-50%, -50%)' }}
          >
            ◆
          </div>
        </div>
        <div className="w-24 flex-shrink-0" />
      </div>

      {/* Totals Row */}
      <div className="flex border-t-2 border-slate-500 bg-slate-700/50">
        <div className="w-44 flex-shrink-0 py-2 px-3 font-semibold text-slate-200 text-sm">
          Total
        </div>
        <div className="flex-1 flex items-center justify-end px-4">
          <span className="text-slate-400 text-sm">
            Target: Day {TARGET_DAY}
          </span>
        </div>
        <div className="w-24 flex-shrink-0 flex items-center justify-center px-2 border-l border-slate-600 font-bold text-emerald-400">
          {tasks.reduce((sum, t) => sum + t.effort, 0)} pd
        </div>
      </div>

      {/* Timeline indicator - big vertical bar that moves with time */}
      {(phase === 'running' || phase === 'paused') && currentDay > 0 && (
        <>
          {/* Main timeline bar */}
          <div
            className="absolute z-30 pointer-events-none transition-all duration-300 ease-linear"
            style={{
              left: `calc(176px + (100% - 176px - 96px) * ${timelinePercent / 100})`,
              top: '0',
              bottom: '0',
              width: '4px',
              background: 'linear-gradient(to bottom, #fbbf24, #f59e0b, #d97706)',
              boxShadow: '0 0 15px rgba(251, 191, 36, 0.8), 0 0 30px rgba(251, 191, 36, 0.4), 0 0 45px rgba(251, 191, 36, 0.2)',
            }}
          >
            {/* Top indicator triangle */}
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '10px solid #fbbf24',
              }}
            />
            {/* Bottom indicator triangle */}
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: '10px solid #fbbf24',
              }}
            />
          </div>
          {/* Day label badge */}
          <div
            className="absolute z-30 pointer-events-none transition-all duration-300 ease-linear"
            style={{
              left: `calc(176px + (100% - 176px - 96px) * ${timelinePercent / 100})`,
              top: '-28px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-amber-500 text-slate-900 text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
              Day {currentDay}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DayGrid() {
  return (
    <div className="absolute inset-0 flex">
      {Array.from({ length: TOTAL_DAYS }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 border-l ${i % 5 === 0 ? 'border-slate-500' : 'border-slate-700/50'
            }`}
        />
      ))}
    </div>
  )
}
