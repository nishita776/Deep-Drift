import { Navigate, Route, Routes } from 'react-router-dom'
import { DevToolsPanel } from './components/dev/DevToolsPanel'
import { AppShell } from './components/layout/AppShell'
import { PipelinePlayground } from './dev/PipelinePlayground'
import { TokenSwatchPage } from './dev/TokenSwatchPage'
import { Compare } from './screens/Compare'
import { NewAnalysis } from './screens/NewAnalysis'
import { Processing } from './screens/Processing'
import { BiodiversityTab } from './screens/results/BiodiversityTab'
import { HeatmapTab } from './screens/results/HeatmapTab'
import { KnownTaxaTab } from './screens/results/KnownTaxaTab'
import { NetworkTab } from './screens/results/NetworkTab'
import { NovelClustersTab } from './screens/results/NovelClustersTab'
import { OverviewTab } from './screens/results/OverviewTab'
import { ResultsLayout } from './screens/results/ResultsLayout'
import { Samples } from './screens/Samples'
import { Homepage } from './scenes/Homepage'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Homepage />} />

        <Route element={<AppShell />}>
          <Route path="/samples" element={<Samples />} />
          <Route path="/analyse" element={<NewAnalysis />} />
          <Route path="/processing/:sampleId" element={<Processing />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/results/:sampleId" element={<ResultsLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OverviewTab />} />
            <Route path="known" element={<KnownTaxaTab />} />
            <Route path="novel" element={<NovelClustersTab />} />
            <Route path="biodiversity" element={<BiodiversityTab />} />
            <Route path="heatmap" element={<HeatmapTab />} />
            <Route path="network" element={<NetworkTab />} />
          </Route>
        </Route>

        {import.meta.env.DEV && <Route path="/dev/tokens" element={<TokenSwatchPage />} />}
        {import.meta.env.DEV && <Route path="/dev/pipeline" element={<PipelinePlayground />} />}
      </Routes>
      <DevToolsPanel />
    </>
  )
}

export default App
