import { lazy, Suspense } from 'react'
import { useStore } from './store'
import { PersonaScreen } from './screens/PersonaScreen'
import { ScriptConfigScreen } from './screens/ScriptConfigScreen'
import { ScriptResultsScreen } from './screens/ScriptResultsScreen'
import { BacktestDashboard } from './screens/backtest/BacktestDashboard'

// Lazy: the factsheet render engine (templates + embedded logo) is ~160 kB of source that
// only the Factsheet screen needs — keep it out of the dashboard's initial chunk.
const FactsheetScreen = lazy(() => import('./screens/FactsheetScreen').then((m) => ({ default: m.FactsheetScreen })))

// Main flow: Backtest & Rank dashboard (upload → extract → rank KIKO → detail/graph),
// then per-product continuations: script generator (persona → config → results) and
// factsheet generator. The old single-product wizard was replaced by this flow.
export default function App() {
  const { state, patch, reset } = useStore()

  switch (state.screen) {
    case 'persona':
      return <PersonaScreen state={state} patch={patch} />
    case 'scriptConfig':
      return <ScriptConfigScreen state={state} patch={patch} />
    case 'scriptResults':
      return <ScriptResultsScreen state={state} patch={patch} onReset={reset} />
    case 'factsheet':
      return (
        <Suspense fallback={null}>
          <FactsheetScreen state={state} patch={patch} />
        </Suspense>
      )
    default:
      return <BacktestDashboard patch={patch} />
  }
}
