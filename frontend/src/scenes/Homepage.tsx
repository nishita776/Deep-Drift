import { Act1Surface } from './Act1Surface'
import { Act2Why } from './Act2Why'
import { Act3Pipeline } from './Act3Pipeline'
import { Act4Enter } from './Act4Enter'

/** "The Descent" — §6. Four acts, dark, culminating in a return to the light dashboard. */
export function Homepage() {
  return (
    <div>
      <Act1Surface />
      <Act2Why />
      <Act3Pipeline />
      <Act4Enter />
    </div>
  )
}
