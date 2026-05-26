import { motion, type Variants } from 'framer-motion'

export type NivaCoreState = 'idle' | 'thinking' | 'alert'

type NivaCoreProps = {
  state: NivaCoreState
  size?: number
  onClick?: () => void
}

const stateConfig = {
  idle: {
    glow: 'rgba(111, 198, 180, 0.11)',
    ringGlow: 'rgba(111, 198, 180, 0.12)',
    coreGlow: 'rgba(111, 198, 180, 0.15)',
    duration: 10.5,
    scale: [1, 1.005, 1],
    ringScale: [1, 1.009, 1],
  },
  thinking: {
    glow: 'rgba(111, 198, 180, 0.2)',
    ringGlow: 'rgba(111, 198, 180, 0.2)',
    coreGlow: 'rgba(111, 198, 180, 0.24)',
    duration: 4.8,
    scale: [1, 1.024, 1],
    ringScale: [1, 1.038, 1],
  },
  alert: {
    glow: 'rgba(224, 154, 120, 0.28)',
    ringGlow: 'rgba(224, 154, 120, 0.24)',
    coreGlow: 'rgba(111, 198, 180, 0.32)',
    duration: 3.8,
    scale: [1, 1.034, 1],
    ringScale: [1, 1.055, 1],
  },
} satisfies Record<NivaCoreState, {
  glow: string
  ringGlow: string
  coreGlow: string
  duration: number
  scale: number[]
  ringScale: number[]
}>

const containerVariants: Variants = {
  idle: ({ scale, glow, duration }) => ({
    scale,
    boxShadow: [
      `0 0 28px ${glow}, 0 0 76px rgba(111, 198, 180, 0.08)`,
      `0 0 34px ${glow}, 0 0 90px rgba(111, 198, 180, 0.11)`,
      `0 0 28px ${glow}, 0 0 76px rgba(111, 198, 180, 0.08)`,
    ],
    transition: { duration, repeat: Infinity, ease: 'easeInOut' },
  }),
  thinking: ({ scale, glow, duration }) => ({
    scale,
    boxShadow: [
      `0 0 34px ${glow}, 0 0 92px rgba(111, 198, 180, 0.16)`,
      `0 0 48px ${glow}, 0 0 124px rgba(111, 198, 180, 0.24)`,
      `0 0 34px ${glow}, 0 0 92px rgba(111, 198, 180, 0.16)`,
    ],
    transition: { duration, repeat: Infinity, ease: 'easeInOut' },
  }),
  alert: ({ scale, glow, duration }) => ({
    scale,
    boxShadow: [
      `0 0 42px ${glow}, 0 0 104px rgba(224, 154, 120, 0.16)`,
      `0 0 62px ${glow}, 0 0 148px rgba(224, 154, 120, 0.28)`,
      `0 0 42px ${glow}, 0 0 104px rgba(224, 154, 120, 0.16)`,
    ],
    transition: { duration, repeat: Infinity, ease: 'easeInOut' },
  }),
}

const ringVariants: Variants = {
  idle: ({ ringScale, ringGlow, duration }) => ({
    scale: ringScale,
    opacity: [0.38, 0.48, 0.38],
    boxShadow: [
      `inset 0 0 20px ${ringGlow}, 0 0 24px ${ringGlow}`,
      `inset 0 0 24px ${ringGlow}, 0 0 34px ${ringGlow}`,
      `inset 0 0 20px ${ringGlow}, 0 0 24px ${ringGlow}`,
    ],
    transition: { duration, repeat: Infinity, ease: 'easeInOut' },
  }),
  thinking: ({ ringScale, ringGlow, duration }) => ({
    scale: ringScale,
    opacity: [0.46, 0.72, 0.46],
    boxShadow: [
      `inset 0 0 22px ${ringGlow}, 0 0 32px ${ringGlow}`,
      `inset 0 0 30px ${ringGlow}, 0 0 54px ${ringGlow}`,
      `inset 0 0 22px ${ringGlow}, 0 0 32px ${ringGlow}`,
    ],
    transition: { duration, repeat: Infinity, ease: 'easeInOut' },
  }),
  alert: ({ ringScale, ringGlow, duration }) => ({
    scale: ringScale,
    opacity: [0.58, 0.92, 0.58],
    boxShadow: [
      `inset 0 0 24px ${ringGlow}, 0 0 38px ${ringGlow}`,
      `inset 0 0 34px ${ringGlow}, 0 0 72px ${ringGlow}`,
      `inset 0 0 24px ${ringGlow}, 0 0 38px ${ringGlow}`,
    ],
    transition: { duration, repeat: Infinity, ease: 'easeInOut' },
  }),
}

export function NivaCore({ state, size = 96, onClick }: NivaCoreProps) {
  const config = stateConfig[state]
  const Component = onClick ? motion.button : motion.div

  return (
    <Component
      type={onClick ? 'button' : undefined}
      className={`niva-core niva-core--${state}`}
      custom={config}
      animate={state}
      variants={containerVariants}
      transition={{ layout: { duration: 0.32, ease: 'easeInOut' } }}
      onClick={onClick}
      aria-label="NIVA"
      style={{
        width: `var(--niva-core-size, ${size}px)`,
        height: `var(--niva-core-size, ${size}px)`,
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        flex: '0 0 auto',
        border: 0,
        borderRadius: '50%',
        padding: 0,
        color: '#dffaf3',
        background:
          'radial-gradient(circle at 50% 42%, rgba(111, 198, 180, 0.2), rgba(111, 198, 180, 0.08) 34%, rgba(10, 18, 17, 0.96) 72%)',
        cursor: onClick ? 'pointer' : 'default',
        outline: 'none',
      }}
      whileHover={onClick ? { scale: 1.04 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      <motion.span
        className="niva-core__glow-ring"
        custom={config}
        animate={state}
        variants={ringVariants}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          border: '1px solid rgba(111, 198, 180, 0.28)',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(111, 198, 180, 0.08), rgba(111, 198, 180, 0.015) 58%, transparent 72%)',
        }}
      />
      <span
        className="niva-core__inner"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '18%',
          border: '1px solid rgba(210, 255, 244, 0.16)',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 50% 38%, rgba(211, 255, 244, 0.16), rgba(82, 170, 152, 0.12) 42%, rgba(6, 13, 13, 0.86) 100%)',
          boxShadow: `inset 0 0 24px ${config.coreGlow}`,
        }}
      />
      <span
        className="niva-core__letter"
        style={{
          position: 'relative',
          zIndex: 1,
          fontSize: `calc(var(--niva-core-size, ${size}px) * 0.34)`,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: 0,
          textShadow: '0 0 18px rgba(111, 198, 180, 0.54)',
        }}
      >
        N
      </span>
    </Component>
  )
}
