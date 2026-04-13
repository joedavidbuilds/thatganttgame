import { createContext, useContext, useReducer, useMemo } from 'react'
import { initialTasks, initialStaff, TARGET_DAY, GAME_RULES } from '../data/gameData'

// Initial game state
const initialState = {
  phase: 'planning', // 'planning' | 'running' | 'paused' | 'finished'
  currentDay: 0,
  targetDay: TARGET_DAY,
  tasks: initialTasks.map(t => ({
    ...t,
    assignedStaff: [],
    progress: 0,
    completed: false,
    actualStartDay: null,
    completedDay: null,
  })),
  staff: initialStaff.map(s => ({ ...s })),
  warnings: [],
  finalScore: null,
  completionDay: null,
  avgUtilization: null,
  utilizationByStaff: null,
}

// Action types
const ACTIONS = {
  ASSIGN_STAFF: 'ASSIGN_STAFF',
  REMOVE_STAFF: 'REMOVE_STAFF',
  START_SIMULATION: 'START_SIMULATION',
  PAUSE_SIMULATION: 'PAUSE_SIMULATION',
  RESUME_SIMULATION: 'RESUME_SIMULATION',
  ADVANCE_DAY: 'ADVANCE_DAY',
  UPDATE_TASKS: 'UPDATE_TASKS',
  UPDATE_TASK_DATA: 'UPDATE_TASK_DATA',
  SET_WARNINGS: 'SET_WARNINGS',
  FINISH_GAME: 'FINISH_GAME',
  RESET_GAME: 'RESET_GAME',
}

// Reducer function
function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ASSIGN_STAFF: {
      const { taskId, staffId, slot } = action.payload
      return {
        ...state,
        tasks: state.tasks.map(task => {
          if (task.id !== taskId) return task
          const newAssigned = [...task.assignedStaff]
          if (slot === 0) {
            newAssigned[0] = staffId
          } else {
            newAssigned[1] = staffId
          }
          return { ...task, assignedStaff: newAssigned.filter(id => id != null) }
        })
      }
    }

    case ACTIONS.REMOVE_STAFF: {
      const { taskId, slot } = action.payload
      return {
        ...state,
        tasks: state.tasks.map(task => {
          if (task.id !== taskId) return task
          const newAssigned = [...task.assignedStaff]
          newAssigned[slot] = null
          return { ...task, assignedStaff: newAssigned.filter(id => id != null) }
        })
      }
    }

    case ACTIONS.START_SIMULATION:
      return {
        ...state,
        phase: 'running',
        currentDay: 1,
        tasks: state.tasks.map(t => ({
          ...t,
          progress: 0,
          completed: false,
          actualStartDay: null,
          completedDay: null,
        })),
      }

    case ACTIONS.PAUSE_SIMULATION:
      return { ...state, phase: 'paused' }

    case ACTIONS.RESUME_SIMULATION:
      return { ...state, phase: 'running' }

    case ACTIONS.ADVANCE_DAY:
      return {
        ...state,
        currentDay: state.currentDay + 1,
      }

    case ACTIONS.UPDATE_TASKS: {
      return {
        ...state,
        tasks: action.payload,
      }
    }

    case ACTIONS.UPDATE_TASK_DATA: {
      const { taskId, field, value } = action.payload
      return {
        ...state,
        tasks: state.tasks.map(task => {
          if (task.id !== taskId) return task
          return { ...task, [field]: value }
        })
      }
    }

    case ACTIONS.SET_WARNINGS:
      return { ...state, warnings: action.payload }

    case ACTIONS.FINISH_GAME: {
      const { score, completionDay, avgUtilization, utilizationByStaff } = action.payload
      return {
        ...state,
        phase: 'finished',
        finalScore: score,
        completionDay,
        avgUtilization,
        utilizationByStaff,
      }
    }

    case ACTIONS.RESET_GAME:
      return {
        ...initialState,
        tasks: initialTasks.map(t => ({
          ...t,
          assignedStaff: [],
          progress: 0,
          completed: false,
          actualStartDay: null,
          completedDay: null,
        })),
        staff: initialStaff.map(s => ({ ...s })),
      }

    default:
      return state
  }
}

// Create context
const GameContext = createContext(null)

// Provider component
export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  // Computed values
  const computed = useMemo(() => {
    const staffAssignments = {}
    state.staff.forEach(s => { staffAssignments[s.id] = [] })

    state.tasks.forEach(task => {
      task.assignedStaff.forEach(staffId => {
        if (staffAssignments[staffId]) {
          staffAssignments[staffId].push(task.id)
        }
      })
    })

    const unassignedStaff = state.staff.filter(s => staffAssignments[s.id].length === 0)
    const overloadedStaff = state.staff.filter(s =>
      staffAssignments[s.id].length > GAME_RULES.maxTasksPerPerson
    )
    const unassignedTasks = state.tasks.filter(t => t.assignedStaff.length === 0)
    const overstaffedTasks = state.tasks.filter(t =>
      t.assignedStaff.length > GAME_RULES.maxStaffPerTask
    )
    const staffWithBurnout = state.staff.filter(s => staffAssignments[s.id].length === 2)

    // Allow unassigned staff (they will be penalized via low utilization)
    // Only block if: tasks have no staff, staff on too many tasks, or too many staff on task
    const isValidAssignment =
      overloadedStaff.length === 0 &&
      unassignedTasks.length === 0 &&
      overstaffedTasks.length === 0

    const validationMessages = []
    if (unassignedStaff.length > 0) {
      validationMessages.push(`${unassignedStaff.map(s => s.name).join(', ')} not assigned`)
    }
    if (overloadedStaff.length > 0) {
      validationMessages.push(`${overloadedStaff.map(s => s.name).join(', ')} on too many tasks`)
    }
    if (unassignedTasks.length > 0) {
      validationMessages.push(`${unassignedTasks.length} task(s) need staff`)
    }

    const allTasksCompleted = state.tasks.every(t => t.completed)
    const totalEffort = state.tasks.reduce((sum, t) => sum + t.effort, 0)

    return {
      staffAssignments,
      unassignedStaff,
      overloadedStaff,
      unassignedTasks,
      overstaffedTasks,
      staffWithBurnout,
      isValidAssignment,
      validationMessages,
      allTasksCompleted,
      totalEffort,
    }
  }, [state.tasks, state.staff])

  // Action creators
  const actions = {
    assignStaff: (taskId, staffId, slot) => {
      dispatch({ type: ACTIONS.ASSIGN_STAFF, payload: { taskId, staffId, slot } })
    },
    removeStaff: (taskId, slot) => {
      dispatch({ type: ACTIONS.REMOVE_STAFF, payload: { taskId, slot } })
    },
    startSimulation: () => {
      dispatch({ type: ACTIONS.START_SIMULATION })
    },
    pauseSimulation: () => {
      dispatch({ type: ACTIONS.PAUSE_SIMULATION })
    },
    resumeSimulation: () => {
      dispatch({ type: ACTIONS.RESUME_SIMULATION })
    },
    advanceDay: () => {
      dispatch({ type: ACTIONS.ADVANCE_DAY })
    },
    updateTasks: (tasks) => {
      dispatch({ type: ACTIONS.UPDATE_TASKS, payload: tasks })
    },
    updateTaskData: (taskId, field, value) => {
      dispatch({ type: ACTIONS.UPDATE_TASK_DATA, payload: { taskId, field, value } })
    },
    setWarnings: (warnings) => {
      dispatch({ type: ACTIONS.SET_WARNINGS, payload: warnings })
    },
    finishGame: (score, completionDay, avgUtilization, utilizationByStaff) => {
      dispatch({ type: ACTIONS.FINISH_GAME, payload: { score, completionDay, avgUtilization, utilizationByStaff } })
    },
    resetGame: () => {
      dispatch({ type: ACTIONS.RESET_GAME })
    },
  }

  return (
    <GameContext.Provider value={{ state, computed, actions }}>
      {children}
    </GameContext.Provider>
  )
}

// Hook to use game context
export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}

export { ACTIONS }
