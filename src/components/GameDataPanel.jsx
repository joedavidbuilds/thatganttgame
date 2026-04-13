import { useState } from 'react'
import { useGame } from '../context/GameContext'

export default function GameDataPanel() {
    const { state, actions } = useGame()
    const { tasks, phase } = state
    const [editingCell, setEditingCell] = useState(null) // { taskId, field }
    const [editValue, setEditValue] = useState('')

    const isEditable = phase === 'planning'

    const handleCellClick = (taskId, field, currentValue) => {
        if (!isEditable) return
        setEditingCell({ taskId, field })
        setEditValue(String(currentValue))
    }

    const handleSave = () => {
        if (!editingCell) return

        const { taskId, field } = editingCell
        let value = editValue

        // Parse value based on field type
        if (field === 'effort' || field === 'duration') {
            value = parseFloat(value) || 0
        } else if (field === 'dependencies') {
            // Parse comma-separated IDs
            value = editValue
                .split(',')
                .map(s => parseInt(s.trim()))
                .filter(n => !isNaN(n) && n > 0 && n !== taskId)
        }

        actions.updateTaskData(taskId, field, value)
        setEditingCell(null)
        setEditValue('')
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            setEditingCell(null)
            setEditValue('')
        }
    }

    const formatDependencies = (deps) => {
        if (!deps || deps.length === 0) return '—'
        return deps.map(id => `T${id}`).join(', ')
    }

    return (
        <div className="space-y-3">
            {!isEditable && (
                <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg px-3 py-2 text-amber-300 text-sm">
                    ⚠️ Data editing disabled during simulation
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-slate-400 border-b border-slate-600">
                            <th className="text-left py-2 px-2 font-medium">ID</th>
                            <th className="text-left py-2 px-2 font-medium">Task Name</th>
                            <th className="text-center py-2 px-2 font-medium">Duration</th>
                            <th className="text-center py-2 px-2 font-medium">Effort (PD)</th>
                            <th className="text-left py-2 px-2 font-medium">Dependencies</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.map(task => (
                            <tr key={task.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                <td className="py-2 px-2 text-slate-500 font-mono">T{task.id}</td>

                                {/* Task Name */}
                                <td className="py-2 px-2">
                                    {editingCell?.taskId === task.id && editingCell?.field === 'name' ? (
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={handleSave}
                                            onKeyDown={handleKeyDown}
                                            className="w-full bg-slate-600 border border-blue-500 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            onClick={() => handleCellClick(task.id, 'name', task.name)}
                                            className={`${isEditable ? 'cursor-pointer hover:text-blue-400' : ''} text-slate-200`}
                                        >
                                            {task.name}
                                        </span>
                                    )}
                                </td>

                                {/* Duration */}
                                <td className="py-2 px-2 text-center">
                                    {editingCell?.taskId === task.id && editingCell?.field === 'duration' ? (
                                        <input
                                            type="number"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={handleSave}
                                            onKeyDown={handleKeyDown}
                                            className="w-16 bg-slate-600 border border-blue-500 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            autoFocus
                                            min="1"
                                        />
                                    ) : (
                                        <span
                                            onClick={() => handleCellClick(task.id, 'duration', task.duration)}
                                            className={`${isEditable ? 'cursor-pointer hover:text-blue-400' : ''} text-slate-300`}
                                        >
                                            {task.duration}d
                                        </span>
                                    )}
                                </td>

                                {/* Effort */}
                                <td className="py-2 px-2 text-center">
                                    {editingCell?.taskId === task.id && editingCell?.field === 'effort' ? (
                                        <input
                                            type="number"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={handleSave}
                                            onKeyDown={handleKeyDown}
                                            className="w-16 bg-slate-600 border border-blue-500 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            autoFocus
                                            min="0"
                                            step="0.5"
                                        />
                                    ) : (
                                        <span
                                            onClick={() => handleCellClick(task.id, 'effort', task.effort)}
                                            className={`${isEditable ? 'cursor-pointer hover:text-blue-400' : ''} text-emerald-400 font-semibold`}
                                        >
                                            {task.effort}
                                        </span>
                                    )}
                                </td>

                                {/* Dependencies */}
                                <td className="py-2 px-2">
                                    {editingCell?.taskId === task.id && editingCell?.field === 'dependencies' ? (
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={handleSave}
                                            onKeyDown={handleKeyDown}
                                            placeholder="e.g. 1,2"
                                            className="w-24 bg-slate-600 border border-blue-500 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            onClick={() => handleCellClick(task.id, 'dependencies', task.dependencies.join(', '))}
                                            className={`${isEditable ? 'cursor-pointer hover:text-blue-400' : ''} text-amber-400 font-mono text-xs`}
                                        >
                                            {formatDependencies(task.dependencies)}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="flex justify-between items-center text-sm text-slate-400 pt-2 border-t border-slate-700">
                <span>Total Tasks: {tasks.length}</span>
                <span className="text-emerald-400 font-semibold">
                    Total Effort: {tasks.reduce((sum, t) => sum + t.effort, 0)} PD
                </span>
            </div>

            {isEditable && (
                <p className="text-xs text-slate-500">
                    💡 Click any cell to edit. Press Enter to save, Escape to cancel.
                </p>
            )}
        </div>
    )
}
