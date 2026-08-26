import { NavLink } from 'react-router-dom'

export interface TabItem {
  to: string
  label: string
}

export function Tabs({ items }: { items: TabItem[] }) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-border-soft">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} role="tab" end className="relative py-3 font-body text-[15px] text-ink-3 outline-none">
          {({ isActive }) => (
            <span className={isActive ? 'text-teal-deep' : 'transition-colors hover:text-ink-2'}>
              {item.label}
              <span
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-teal transition-transform"
                style={{
                  transitionDuration: 'var(--duration-standard)',
                  transitionTimingFunction: 'var(--ease-standard)',
                  transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                }}
              />
            </span>
          )}
        </NavLink>
      ))}
    </div>
  )
}
