import { useEffect, useRef } from 'react'
import { useGame } from '../context/GameContext'
import {
  simulateDay,
  areAllTasksCompleted,
  calculateUtilization,
  calculateScore,
  generateWarnings
} from '../utils/gameEngine'

const SIMULATION_SPEED = 800 // ms per day

export function useSimulation() {
  const { state, computed, actions } = useGame()
  const { phase, currentDay, tasks, staff, targetDay } = state
  const { staffAssignments } = computed
  const intervalRef = useRef(null)

  useEffect(() => {
    // Only run when simulation is running (not paused)
    if (phase !== 'running') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      // Simulate one day of work
      const updatedTasks = simulateDay(tasks, staff, staffAssignments, currentDay)

      // Update tasks in state
      actions.updateTasks(updatedTasks)

      // Generate and set warnings
      const warnings = generateWarnings(updatedTasks, staff, staffAssignments)
      actions.setWarnings(warnings)

      // Check if all tasks completed
      if (areAllTasksCompleted(updatedTasks)) {
        const utilization = calculateUtilization(updatedTasks, staff, staffAssignments, currentDay)
        const finalScore = calculateScore(currentDay, targetDay, utilization.average)

        actions.finishGame(finalScore, currentDay, utilization.average, utilization.byStaff)
        return
      }

      // Game continues until ALL tasks complete
      // Late penalty is calculated in scoring formula

      // Advance to next day
      actions.advanceDay()

    }, SIMULATION_SPEED)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [phase, currentDay, tasks, staff, staffAssignments, targetDay, actions])

  return {
    isRunning: phase === 'running',
    currentDay,
    speed: SIMULATION_SPEED,
  }
}
