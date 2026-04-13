export default function TaskBar({ task, style }) {
  const progressPercent = (task.progress / task.effort) * 100

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 h-7 rounded bg-gradient-to-b from-red-500 to-red-700 border border-red-400 shadow-md flex items-center overflow-hidden"
      style={style}
    >
      {/* Progress bar inside */}
      <div 
        className="absolute inset-y-0 left-0 bg-slate-900/60"
        style={{ width: `${progressPercent}%` }}
      >
        {/* Progress indicator line */}
        {progressPercent > 0 && (
          <div className="absolute right-0 top-1 bottom-1 w-0.5 bg-slate-200" />
        )}
      </div>
      
      {/* Effort label */}
      <span className="relative z-10 text-xs font-medium text-white px-2 truncate w-full text-center">
        {task.effort}d
      </span>
    </div>
  )
}

