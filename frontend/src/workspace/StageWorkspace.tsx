import { Grid, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import type { ProtocolId } from '../packet/protocols'
import { createDraft, createIsAutoFilled, getInitialAnalyzedLayers, type PacketDraft } from '../packet/steps'
import { ACTION_BUTTON_LABELS, COMPOSE_SETTINGS, resolveActionButtons, type ActionButtonId } from '../stage/actionButtons'
import { resolveOptions, TABLE_EDIT_OPTIONS, type TableId } from '../stage/options'
import type { WorkspaceData } from '../stage/types'
import { PacketAnalyzer } from './PacketAnalyzer'
import { PacketComposer } from './PacketComposer'
import { PacketOverview } from './PacketViews'
import { TablePanel } from './TablePanel'
import { ReceivedPacketsPanel, WorkPanel, type WorkView } from './WorkPanel'

type Props = {
  workspace: WorkspaceData
  // ステージ JSON の options / action_buttons（未検証の生の値）
  rawOptions?: unknown
  rawActionButtons?: unknown
}

// ステージの作業画面。左にタブ切替のテーブル、右に受信パケットと作業枠を並べる。画面の状態はここで持つ
export function StageWorkspace({ workspace, rawOptions, rawActionButtons }: Props) {
  const options = useMemo(() => resolveOptions(rawOptions), [rawOptions])
  const buttonIds = useMemo(() => resolveActionButtons(rawActionButtons), [rawActionButtons])
  const isAutoFilled = useMemo(() => createIsAutoFilled(options.packet_auto_fields), [options])

  // やることリストのボタンがあるときだけ、はじめにやることリストを出す
  const [view, setView] = useState<WorkView>(() => (buttonIds.includes('todo_list') ? { kind: 'todo' } : { kind: 'none' }))
  // テーブルはユーザーが編集できるので、ステージのデータを初期値として持つ
  const [tables, setTables] = useState(workspace.tables)
  // パケットごとの解析の進み具合。別のパケットを見て戻っても残す
  const [analyzedLayers, setAnalyzedLayers] = useState<Record<string, ProtocolId[]>>({})
  // 作業ボタンごとの作成中のパケット
  const [drafts, setDrafts] = useState<Partial<Record<ActionButtonId, PacketDraft>>>({})

  // パケット作成のボタンと、その作成中のパケット
  const composeButtons = buttonIds.flatMap((id) => {
    const settings = COMPOSE_SETTINGS[id]
    return settings ? [{ id, label: ACTION_BUTTON_LABELS[id], settings, draft: drafts[id] ?? createDraft(settings) }] : []
  })

  const selectedPacket = view.kind === 'analyze' ? workspace.packets.find((packet) => packet.id === view.packetId) : undefined
  const selectedCompose = view.kind === 'compose' ? composeButtons.find((button) => button.id === view.buttonId) : undefined

  const visibleTables = options.visible_tables.map((id: TableId) => ({
    id,
    table: tables[id],
    isEditable: options[TABLE_EDIT_OPTIONS[id]],
  }))

  return (
    // PC幅では残りの高さいっぱいに広がり、はみ出す分は各枠の中でスクロールする
    <Grid
      w="full"
      maxW="7xl"
      flex={{ lg: '1' }}
      minH="0"
      templateColumns={{ base: '1fr', lg: visibleTables.length > 0 ? 'minmax(0, 2fr) minmax(0, 3fr)' : '1fr' }}
      templateRows={{ lg: 'minmax(0, 1fr)' }}
      gap="4"
      alignItems="stretch"
    >
      {visibleTables.length > 0 && (
        <TablePanel
          tables={visibleTables}
          onChangeRows={(id, rows) => setTables((previous) => ({ ...previous, [id]: { ...previous[id], rows } }))}
        />
      )}
      <VStack align="stretch" gap="4" minW="0" minH="0">
        <ReceivedPacketsPanel
          packets={workspace.packets}
          selectedId={selectedPacket?.id ?? null}
          onSelect={(packet) => setView({ kind: 'analyze', packetId: packet.id })}
        />
        <WorkPanel
          buttonIds={buttonIds}
          todos={workspace.todos}
          view={view}
          onChangeView={setView}
          detail={
            selectedPacket ? (
              // key でパケットごとに注意メッセージをリセットする
              <PacketAnalyzer
                key={selectedPacket.id}
                packet={selectedPacket}
                analyzedLayers={
                  analyzedLayers[selectedPacket.id] ?? getInitialAnalyzedLayers(selectedPacket.hex, options.analysis_auto_layers)
                }
                onAnalyze={(layers) => setAnalyzedLayers((previous) => ({ ...previous, [selectedPacket.id]: layers }))}
              />
            ) : selectedCompose ? (
              <PacketComposer
                label={selectedCompose.label}
                settings={selectedCompose.settings}
                draft={selectedCompose.draft}
                onChange={(draft) => setDrafts((previous) => ({ ...previous, [selectedCompose.id]: draft }))}
                isAutoFilled={isAutoFilled}
              />
            ) : view.kind === 'packet_overview' ? (
              <PacketOverview drafts={composeButtons} isAutoFilled={isAutoFilled} />
            ) : null
          }
        />
      </VStack>
    </Grid>
  )
}
