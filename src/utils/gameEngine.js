import { GAME_RULES, SCORING } from '../data/gameData'

/**
 * Check if a task's dependencies are all completed
 */
export function areDependenciesMet(task, allTasks) {
  if (task.dependencies.length === 0) return true
  return task.dependencies.every(depId => {
    const depTask = allTasks.find(t => t.id === depId)
    return depTask && depTask.completed
  })
}

/**
 * Get the earliest day a task can start (based on when dependencies complete)
 */
export function getEarliestStartDay(task, allTasks) {
  if (task.dependencies.length === 0) return 1

  let latestDepEnd = 0
  task.dependencies.forEach(depId => {
    const depTask = allTasks.find(t => t.id === depId)
    if (depTask && depTask.completedDay) {
      latestDepEnd = Math.max(latestDepEnd, depTask.completedDay)
    }
  })

  // Task can start the day after last dependency completes
  // But if dependency completed mid-day, can start same day
  return latestDepEnd > 0 ? latestDepEnd : 1
}

/**
 * Get all tasks that are currently active (can be worked on)
 */
export function getActiveTasks(tasks) {
  return tasks.filter(task =>
    !task.completed &&
    areDependenciesMet(task, tasks) &&
    task.assignedStaff.length > 0
  )
}

/**
 * Calculate daily progress for a task in person-days
 * @returns {number} Progress in person-days
 */
export function calculateDailyProgress(task, allTasks, staff, staffAssignments) {
  // Cannot work on completed tasks or tasks with unmet dependencies
  if (task.completed || !areDependenciesMet(task, allTasks)) {
    return 0
  }

  // No staff assigned = no progress
  if (task.assignedStaff.length === 0) {
    return 0
  }

  const assignedStaffMembers = task.assignedStaff
    .map(id => staff.find(s => s.id === id))
    .filter(Boolean)

  let totalProgress = 0

  assignedStaffMembers.forEach(staffMember => {
    // Base work: availability as fraction of day
    // 100% availability = 1 person-day per day
    // 50% availability = 0.5 person-day per day
    let workAmount = staffMember.availability / 100

    // Context switching penalty - ONLY if working on 2 concurrent ACTIVE tasks
    const concurrentActiveTasks = (staffAssignments[staffMember.id] || [])
      .map(taskId => allTasks.find(t => t.id === taskId))
      .filter(t => t && !t.completed && areDependenciesMet(t, allTasks))

    if (concurrentActiveTasks.length > 1) {
      workAmount *= GAME_RULES.contextSwitchPenalty // 0.8 = 80% efficiency
    }

    totalProgress += workAmount
  })

  // Diminishing returns for 2 people working together
  // 2 people = 160% combined speed (not 200%)
  if (assignedStaffMembers.length === 2) {
    totalProgress *= GAME_RULES.twoPersonPenalty // 0.8
  }

  return totalProgress
}

/**
 * Simulate one day of work
 * @returns Updated tasks array
 */
export function simulateDay(tasks, staff, staffAssignments, currentDay) {
  const updatedTasks = tasks.map(task => {
    if (task.completed) return task

    // Check if task can start (dependencies met)
    if (!areDependenciesMet(task, tasks)) {
      return task
    }

    // Mark actual start day if not set
    let actualStartDay = task.actualStartDay
    if (!actualStartDay && task.assignedStaff.length > 0) {
      actualStartDay = currentDay
    }

    const dailyProgress = calculateDailyProgress(task, tasks, staff, staffAssignments)

    if (dailyProgress === 0) {
      return { ...task, actualStartDay }
    }

    const newProgress = Math.min(task.progress + dailyProgress, task.effort)
    // Use epsilon for floating point comparison to prevent "18.0/18" incomplete bugs
    const isCompleted = newProgress >= task.effort - 0.01

    return {
      ...task,
      progress: newProgress,
      completed: isCompleted,
      actualStartDay,
      completedDay: isCompleted ? currentDay : null,
    }
  })

  return updatedTasks
}

/**
 * Generate real-time warnings
 */
export function generateWarnings(tasks, staff, staffAssignments) {
  const warnings = []

  // Check for staff burnout (working on 2 concurrent tasks)
  staff.forEach(s => {
    const assignedTaskIds = staffAssignments[s.id] || []
    const activeTaskCount = assignedTaskIds.filter(taskId => {
      const task = tasks.find(t => t.id === taskId)
      return task && !task.completed && areDependenciesMet(task, tasks)
    }).length

    if (activeTaskCount >= 2) {
      warnings.push({
        type: 'warning',
        message: `${s.name} working on 2 tasks (80% efficiency)`
      })
    }
  })

  return warnings
}

/**
 * Calculate utilization statistics
 */
export function calculateUtilization(tasks, staff, staffAssignments, totalDays) {
  const utilizationByStaff = {}

  staff.forEach(s => {
    const assignedTasks = staffAssignments[s.id] || []

    // Calculate total person-days this staff member worked
    let workedDays = 0
    assignedTasks.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId)
      if (task && task.actualStartDay && task.completedDay) {
        // Days worked on this task
        const daysOnTask = task.completedDay - task.actualStartDay + 1
        workedDays += daysOnTask * (s.availability / 100)
      } else if (task && task.actualStartDay) {
        // Task still in progress
        const daysOnTask = totalDays - task.actualStartDay + 1
        workedDays += daysOnTask * (s.availability / 100)
      }
    })

    const maxPossibleDays = totalDays * (s.availability / 100)
    utilizationByStaff[s.id] = {
      worked: workedDays,
      max: maxPossibleDays,
      percentage: maxPossibleDays > 0 ? (workedDays / maxPossibleDays) * 100 : 0,
    }
  })

  const avgUtilization = Object.values(utilizationByStaff)
    .reduce((sum, u) => sum + u.percentage, 0) / staff.length

  return {
    byStaff: utilizationByStaff,
    average: avgUtilization,
  }
}

/**
 * Calculate final score based on delivery date and utilization
 */
export function calculateScore(completionDay, targetDay, avgUtilization) {
  let score = SCORING.baseScore // 100

  // Late penalty: -5 points per day late
  // No bonus for finishing early
  if (completionDay && completionDay > targetDay) {
    const daysLate = completionDay - targetDay
    score -= daysLate * SCORING.latePointsPerDay
  }

  // Utilization penalty: -2 points per 5% outside ideal range (70-90%)
  const { idealUtilizationMin, idealUtilizationMax } = GAME_RULES

  if (avgUtilization < idealUtilizationMin) {
    // Below 70% = waste
    const underBy = idealUtilizationMin - avgUtilization
    score -= Math.floor(underBy / 5) * SCORING.utilizationPenaltyPer5
  } else if (avgUtilization > idealUtilizationMax) {
    // Above 90% = burnout risk
    const overBy = avgUtilization - idealUtilizationMax
    score -= Math.floor(overBy / 5) * SCORING.utilizationPenaltyPer5
  }

  return Math.max(0, Math.round(score))
}

/**
 * Check if all tasks are completed
 */
export function areAllTasksCompleted(tasks) {
  return tasks.every(task => task.completed)
}

/**
 * Calculate estimated end day for a task based on assignments
 */
export function getEstimatedEndDay(task, allTasks, staff, staffAssignments, startDay) {
  if (task.assignedStaff.length === 0) {
    return startDay + task.duration
  }

  const dailyProgress = calculateDailyProgress(task, allTasks, staff, staffAssignments)
  if (dailyProgress <= 0) {
    return startDay + task.duration
  }

  const daysNeeded = Math.ceil(task.effort / dailyProgress)
  return startDay + daysNeeded - 1
}
