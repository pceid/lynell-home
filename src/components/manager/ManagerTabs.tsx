export type ManagerTabItem<T extends string> = {
  id: T
  label: string
}

type ManagerTabsProps<T extends string> = {
  items: readonly ManagerTabItem<T>[]
  activeId: T
  ariaLabel: string
  onChange: (id: T) => void
  variant?: 'primary' | 'sub'
  isActive?: (id: T) => boolean
}

export function ManagerTabs<T extends string>({
  items,
  activeId,
  ariaLabel,
  onChange,
  variant = 'primary',
  isActive,
}: ManagerTabsProps<T>) {
  const listClassName = variant === 'sub' ? 'manager-subtabs' : 'manager-tabs'
  const buttonClassName = variant === 'sub' ? 'manager-subtab' : 'manager-tab'

  return (
    <div className={listClassName} aria-label={ariaLabel}>
      {items.map((section) => {
        const active = isActive ? isActive(section.id) : activeId === section.id

        return (
          <button
            key={section.id}
            type="button"
            className={`${buttonClassName} ${active ? 'is-active' : ''}`}
            onClick={() => onChange(section.id)}
          >
            <span>{section.label}</span>
            <span
              className={`status-line ${active ? 'status-line--active' : 'status-line--idle'}`}
              aria-hidden="true"
            />
          </button>
        )
      })}
    </div>
  )
}
