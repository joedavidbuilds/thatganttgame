import { useGame } from '../context/GameContext'
import { GAME_RULES } from '../data/gameData'

export default function ControlPanel() {
  const { state, computed, actions } = useGame()
  const { tasks, staff, phase } = state
  const { isValidAssignment, validationMessages, staffAssignments, unassignedStaff, overloadedStaff, unassignedTasks } = computed

  // Handle staff assignment change
  const handleAssignmentChange = (taskId, slot, value) => {
    const staffId = value ? parseInt(value) : null
    if (staffId) {
      actions.assignStaff(taskId, staffId, slot)
    } else {
      actions.removeStaff(taskId, slot)
    }
  }

  // Check if a staff member can be assigned to a task
  const canAssignStaff = (staffId, taskId, currentSlot) => {
    if (!staffId) return true

    const task = tasks.find(t => t.id === taskId)
    if (task) {
      const otherSlot = currentSlot === 0 ? 1 : 0
      if (task.assignedStaff[otherSlot] === staffId) {
        return false
      }
    }

    const currentTasks = staffAssignments[staffId] || []
    const tasksExcludingCurrent = currentTasks.filter(tId => tId !== taskId)
    if (tasksExcludingCurrent.length >= 2) {
      return false
    }

    return true
  }

  // Helper: Calculate scheduled start day for a task (based on dependency chain)
  const getScheduledStart = (task, memo = {}) => {
    if (memo[task.id] !== undefined) return memo[task.id]

    if (task.dependencies.length === 0) {
      memo[task.id] = 1
      return 1
    }

    let latestDepEnd = 0
    task.dependencies.forEach(depId => {
      const depTask = tasks.find(t => t.id === depId)
      if (depTask) {
        const depStart = getScheduledStart(depTask, memo)
        const depEnd = depStart + depTask.duration - 1
        latestDepEnd = Math.max(latestDepEnd, depEnd)
      }
    })

    memo[task.id] = latestDepEnd + 1
    return latestDepEnd + 1
  }

  // Check if two tasks actually overlap in time (based on scheduled start/end)
  const tasksOverlapInTime = (task1, task2) => {
    const memo = {}
    const start1 = getScheduledStart(task1, memo)
    const end1 = start1 + task1.duration - 1
    const start2 = getScheduledStart(task2, memo)
    const end2 = start2 + task2.duration - 1

    // Tasks overlap if one starts before the other ends
    return start1 <= end2 && start2 <= end1
  }

  // Check for staff with ACTUALLY overlapping tasks (based on scheduled timing)
  const staffWithOverlappingTasks = staff.filter(s => {
    const assignedTaskIds = staffAssignments[s.id] || []
    if (assignedTaskIds.length < 2) return false

    // Check if any pair of assigned tasks actually overlap in time
    const assignedTasks = assignedTaskIds.map(id => tasks.find(t => t.id === id)).filter(Boolean)
    for (let i = 0; i < assignedTasks.length; i++) {
      for (let j = i + 1; j < assignedTasks.length; j++) {
        if (tasksOverlapInTime(assignedTasks[i], assignedTasks[j])) {
          return true
        }
      }
    }
    return false
  })

  return (
    <div>
      {/* Task Assignments - Horizontal layout for wider space */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {tasks.map(task => {
          const hasNoStaff = task.assignedStaff.length === 0
          return (
            <div
              key={task.id}
              className={`rounded-lg p-3 border transition-colors ${hasNoStaff
                ? 'bg-amber-500/10 border-amber-500/40'
                : 'bg-slate-700/40 border-slate-600/50'
                }`}
            >
              <div className="text-slate-300 text-sm font-medium mb-2 truncate flex items-center gap-2" title={task.name}>
                {hasNoStaff && <span className="text-amber-400">⚠</span>}
                {task.name}
              </div>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-slate-600 border border-slate-500 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  value={task.assignedStaff[0] || ''}
                  onChange={(e) => handleAssignmentChange(task.id, 0, e.target.value)}
                  disabled={phase !== 'planning'}
                >
                  <option value="">Select...</option>
                  {staff.map(s => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={!canAssignStaff(s.id, task.id, 0)}
                    >
                      {s.name} {s.availability === 50 ? '(50%)' : ''}
                    </option>
                  ))}
                </select>
                <select
                  className="flex-1 bg-slate-600 border border-slate-500 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  value={task.assignedStaff[1] || ''}
                  onChange={(e) => handleAssignmentChange(task.id, 1, e.target.value)}
                  disabled={phase !== 'planning'}
                >
                  <option value="">+ Add</option>
                  {staff.map(s => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={!canAssignStaff(s.id, task.id, 1)}
                    >
                      {s.name} {s.availability === 50 ? '(50%)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>

      {/* Warnings Section */}
      {phase === 'planning' && (
        <div className="space-y-2 mb-4">
          {/* Unassigned tasks warning */}
          {unassignedTasks.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 flex items-center gap-2 text-amber-400">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium">
                Assign Staff! {unassignedTasks.length} task(s) have no staff assigned
              </span>
            </div>
          )}

          {/* Unassigned staff warning */}
          {unassignedStaff.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 flex items-center gap-2 text-amber-400">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-medium">
                ⚠️ {unassignedStaff.map(s => s.name).join(', ')} idle
              </span>
            </div>
          )}

          {/* Staff with overlapping tasks warning (actual concurrent work) */}
          {staffWithOverlappingTasks.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/40 rounded-lg p-3 flex items-center gap-2 text-orange-400">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              <span className="text-sm font-medium">
                🔥 {staffWithOverlappingTasks.map(s => s.name).join(', ')} will work on overlapping tasks (80% efficiency)
              </span>
            </div>
          )}

          {/* Overloaded staff error */}
          {overloadedStaff.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 flex items-center gap-2 text-red-400">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">
                Error! {overloadedStaff.map(s => s.name).join(', ')} assigned to more than 2 tasks
              </span>
            </div>
          )}

          {/* All good message */}
          {isValidAssignment && (
            <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-lg p-3 flex items-center gap-2 text-emerald-400">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">OK! Ready to start simulation</span>
            </div>
          )}


        </div>
      )}

      {/* Running status */}
      {phase === 'running' && (
        <div className="bg-blue-500/10 border border-blue-500/40 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-blue-400">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Simulation running... Day {state.currentDay}</span>
          </div>
        </div>
      )}

      {/* Start Button */}
      <button
        className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${isValidAssignment && phase === 'planning'
          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50'
          : phase === 'running'
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white cursor-not-allowed'
            : phase === 'finished'
              ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white cursor-not-allowed'
              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
          }`}
        disabled={!isValidAssignment || phase !== 'planning'}
        onClick={() => actions.startSimulation()}
      >
        {phase === 'planning' ? '🚀 Start Simulation' :
          phase === 'running' ? '⏳ Running...' : '✅ Finished'}
      </button>

      {/* Notice */}
      <p className="text-center text-slate-500 text-xs mt-3">
        {phase === 'planning' ? '⚠️ Once started, no changes allowed' :
          phase === 'running' ? 'Watch the timeline progress!' : ''}
      </p>
    </div>
  )
}
