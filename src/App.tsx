import { useStore } from './store'
import { Landing } from './screens/Landing'
import { InputScreen } from './screens/InputScreen'
import { ChooseOutput } from './screens/ChooseOutput'
import { RetrieveScreen } from './screens/RetrieveScreen'
import { GraphScreen } from './screens/GraphScreen'
import { PersonaScreen } from './screens/PersonaScreen'
import { ScriptConfigScreen } from './screens/ScriptConfigScreen'
import { ScriptResultsScreen } from './screens/ScriptResultsScreen'
import { FactsheetScreen } from './screens/FactsheetScreen'
import { BacktestDashboard } from './screens/backtest/BacktestDashboard'

export default function App() {
  const { state, patch, reset } = useStore()

  switch (state.screen) {
    case 'landing':
      return <Landing patch={patch} />
    case 'input':
      return <InputScreen state={state} patch={patch} />
    case 'chooseOutput':
      return <ChooseOutput state={state} patch={patch} />
    case 'retrieve':
      return <RetrieveScreen state={state} patch={patch} />
    case 'graph':
      return <GraphScreen state={state} patch={patch} />
    case 'persona':
      return <PersonaScreen state={state} patch={patch} />
    case 'scriptConfig':
      return <ScriptConfigScreen state={state} patch={patch} />
    case 'scriptResults':
      return <ScriptResultsScreen state={state} patch={patch} onReset={reset} />
    case 'factsheet':
      return <FactsheetScreen state={state} patch={patch} />
    case 'backtest':
      return <BacktestDashboard patch={patch} />
    default:
      return <Landing patch={patch} />
  }
}
