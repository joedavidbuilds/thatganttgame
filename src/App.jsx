import GanttChart from './components/GanttChart'
import StaffPanel from './components/StaffPanel'
import ControlPanel from './components/ControlPanel'
import GameDataPanel from './components/GameDataPanel'
import ResultsScreen from './components/ResultsScreen'
import { useSimulation } from './hooks/useSimulation'
import { useGame } from './context/GameContext'

function App() {
  useSimulation()

  const { state } = useGame()
  const { phase, currentDay, targetDay } = state

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Modals */}
      {phase === 'finished' && <ResultsScreen />}

      {/* Header */}
      <header className="bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 shadow-xl">
        <div className="max-w-[1800px] mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              That GANTT Game
            </h1>
            <p className="text-amber-100/90 text-sm mt-1 font-medium">
              "Course Code: Course Name"
            </p>
          </div>

          {/* Day counter during simulation */}
          {(phase === 'running' || phase === 'paused') && (
            <div className="bg-black/20 rounded-lg px-6 py-3">
              <div className="text-amber-100 text-xs uppercase tracking-wider">Current Day</div>
              <div className="text-3xl font-black text-white">
                {currentDay || '-'}
                <span className="text-lg font-normal text-amber-200">/ {targetDay}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto p-6">
        <div className="flex gap-6">
          {/* Left Column - Gantt Chart + Task Assignments */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Gantt Chart */}
            <div className="bg-slate-800/80 backdrop-blur rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-5 py-4 border-b border-slate-600 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">📊 Project Schedule</h2>
                {phase === 'running' && (
                  <div className="flex items-center gap-2 text-amber-400">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Simulation Running</span>
                  </div>
                )}
                {phase === 'paused' && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-sm font-medium">Paused</span>
                  </div>
                )}
              </div>
              <div className="p-5 overflow-x-auto">
                <GanttChart />
              </div>
            </div>

            {/* Task Assignments */}
            <div className="bg-slate-800/80 backdrop-blur rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-5 py-4 border-b border-slate-600">
                <h2 className="text-xl font-bold text-white">📋 Task Assignments</h2>
              </div>
              <div className="p-5">
                <ControlPanel />
              </div>
            </div>
          </div>

          {/* Right Column - Resources Panel + Game Data */}
          <div className="w-[340px] flex-shrink-0 space-y-5">
            <div className="bg-slate-800/80 backdrop-blur rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-5 py-4 border-b border-slate-600">
                <h2 className="text-xl font-bold text-white">👥 Your Team</h2>
              </div>
              <div className="p-5">
                <StaffPanel />
              </div>
            </div>

            {/* Game Data Panel
            <div className="bg-slate-800/80 backdrop-blur rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-5 py-4 border-b border-slate-600">
                <h2 className="text-xl font-bold text-white">⚙️ Game Data</h2>
              </div>
              <div className="p-5">
                <GameDataPanel />
              </div>
            </div> */}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
