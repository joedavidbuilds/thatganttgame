// Game configuration constants
export const TOTAL_DAYS = 20 // 4 weeks of work days (no weekends)
export const TARGET_DAY = 20 // Deadline at end of week 4
export const DAYS_PER_WEEK = 5
export const HOURS_PER_DAY = 8 // Definition of person-day

// Staff members with availability
// All staff are equally skilled (no speed differences)
// availability: 100 = full-time, 50 = part-time (half day)
export const initialStaff = [
  { id: 1, name: 'Blake', availability: 100, color: '#3b82f6' },   // FT
  { id: 2, name: 'Casey', availability: 100, color: '#22c55e' },   // FT
  { id: 3, name: 'Dana', availability: 100, color: '#a855f7' },    // FT
  { id: 4, name: 'Alex', availability: 100, color: '#f97316' },    // FT
  { id: 5, name: 'Drew', availability: 50, color: '#ec4899' },     // PT
  { id: 6, name: 'Evan', availability: 50, color: '#06b6d4' },     // PT
]

// Project tasks with dependencies
// effort: in person-days (8 hours = 1 person-day)
// duration: estimated days (for display purposes)
// dependencies: task IDs that must complete before this task can start
export const initialTasks = [
  {
    id: 1,
    name: 'Requirements + Plan',
    duration: 4,        // Days 1-4
    effort: 6,
    dependencies: [],
    assignedStaff: [],
    progress: 0,
    completed: false,
    actualStartDay: null,
    completedDay: null,
  },
  {
    id: 2,
    name: 'UX/UI Design',
    duration: 5,        // Days 5-9
    effort: 5,
    dependencies: [1],
    assignedStaff: [],
    progress: 0,
    completed: false,
    actualStartDay: null,
    completedDay: null,
  },
  {
    id: 3,
    name: 'Backend/API + DB',
    duration: 12,       // Days 5-16
    effort: 18,
    dependencies: [1],
    assignedStaff: [],
    progress: 0,
    completed: false,
    actualStartDay: null,
    completedDay: null,
  },
  {
    id: 4,
    name: 'Frontend Build',
    duration: 7,        // Days 10-16
    effort: 7,
    dependencies: [2],
    assignedStaff: [],
    progress: 0,
    completed: false,
    actualStartDay: null,
    completedDay: null,
  },
  {
    id: 5,
    name: 'Integration/Test',
    duration: 4,        // Days 17-20
    effort: 6,
    dependencies: [3, 4],
    assignedStaff: [],
    progress: 0,
    completed: false,
    actualStartDay: null,
    completedDay: null,
  },
  {
    id: 6,
    name: 'Help/Training Guide',
    duration: 14,       // Days 5-18
    effort: 11,
    dependencies: [1],
    assignedStaff: [],
    progress: 0,
    completed: false,
    actualStartDay: null,
    completedDay: null,
  },
]

// Total effort: 53 person-days (6+5+18+7+6+11)
// Staff capacity: 4 FT + 2 PT = 5 FTE × 20 days = 100 pd
// T6 (Help/Training Guide) depends only on T1 - can run in parallel and be under-resourced

// Game rules/constraints
export const GAME_RULES = {
  maxStaffPerTask: 2,
  maxTasksPerPerson: 2,
  contextSwitchPenalty: 0.5, // 50% efficiency when on 2 concurrent tasks (halved)
  twoPersonPenalty: 0.8, // 160% combined (not 200%) - diminishing returns
  idealUtilizationMin: 40,
  idealUtilizationMax: 60,
}

// Scoring configuration (client-confirmed)
export const SCORING = {
  baseScore: 100, // Maximum score possible
  latePointsPerDay: 5, // -5 points per day late
  utilizationPenaltyPer5: 2, // -2 points per 5% outside ideal range (70-90%)
}
