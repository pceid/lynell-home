type SparklineProps = {
  values: number[]
  label?: string
  className?: string
}

export function Sparkline({ values, label = 'Mini-graf', className = '' }: SparklineProps) {
  const cleanValues = values.filter((value) => Number.isFinite(value))

  if (cleanValues.length < 2) {
    return null
  }

  const width = 120
  const height = 30
  const min = Math.min(...cleanValues)
  const max = Math.max(...cleanValues)
  const range = max - min || 1
  const points = cleanValues
    .map((value, index) => {
      const x = (index / Math.max(1, cleanValues.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 6) - 3
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      className={`sparkline ${className}`.trim()}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <polyline points={points} fill="none" />
    </svg>
  )
}
