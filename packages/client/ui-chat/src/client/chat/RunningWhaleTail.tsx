/** Generic activity indicator for the running Chat status. */
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './ChatView.module.css'


/**
 * Render the shared neutral progress indicator inside the chat status footprint.
 * @returns an aria-hidden progress spinner.
 */
export function RunningWhaleTail() {
  return (
    <span className={css.runningIcon} aria-hidden="true">
      <StateDot state="ongoing" size={14} />
    </span>
  )
}
