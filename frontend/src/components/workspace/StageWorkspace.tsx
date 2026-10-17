import { Grid, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import type { StageWorkspaceData } from '../../types/workspace'
import NetworkTable from './NetworkTable'
import ReceivedPackets from './ReceivedPackets'
import WorkPanel, { type WorkView } from './WorkPanel'

type Props = {
  data: StageWorkspaceData
}

// ステージの作業画面。左に3つのテーブル、右に受信パケットと作業枠を並べる
function StageWorkspace({ data }: Props) {
  const [view, setView] = useState<WorkView>({ kind: 'todo' })

  const selectedPacketId = view.kind === 'frame' ? view.sourceId : null

  return (
    // PC幅では残りの高さいっぱいに広がり、はみ出す分は各枠の中でスクロールする
    <Grid
      w="full"
      maxW="7xl"
      flex={{ lg: '1' }}
      minH="0"
      templateColumns={{ base: '1fr', lg: 'minmax(0, 2fr) minmax(0, 3fr)' }}
      templateRows={{ lg: 'minmax(0, 1fr)' }}
      gap="4"
      alignItems="stretch"
    >
      <VStack align="stretch" gap="4" minW="0" minH="0">
        <NetworkTable table={data.routingTable} />
        <NetworkTable table={data.arpTable} />
        <NetworkTable table={data.macAddressTable} />
      </VStack>
      <VStack align="stretch" gap="4" minW="0" minH="0">
        <ReceivedPackets
          packets={data.packets}
          selectedId={selectedPacketId}
          onSelect={(packet) =>
            setView({
              kind: 'frame',
              sourceId: packet.id,
              title: `${packet.label}の中身`,
              layers: packet.layers,
            })
          }
        />
        <WorkPanel
          actions={data.actions}
          todos={data.todos}
          view={view}
          onChangeView={setView}
        />
      </VStack>
    </Grid>
  )
}

export default StageWorkspace
