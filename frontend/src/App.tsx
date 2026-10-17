import { Route, Routes } from 'react-router'
import Home from './pages/Home'
import Stage from './pages/Stage'
import Stages from './pages/Stages'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/stages" element={<Stages />} />
      <Route path="/stages/:stageId" element={<Stage />} />
    </Routes>
  )
}

export default App
