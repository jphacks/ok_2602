import { Alert, Circle, createToaster, Dialog, Grid, HStack, Portal, Spinner, Text, Toast, Toaster, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { PrimaryButton, SecondaryButton } from '../components/ui'
import { buildPacketJson, type ProtocolId } from '../packet/protocols'
import {
  createDraft,
  createIsAutoFilled,
  createIsEditable,
  getInitialAnalyzedLayers,
  isAnalysisComplete,
  type PacketDraft,
} from '../packet/steps'
import { useStageSocket } from '../stage/api'
import { ACTION_BUTTON_LABELS, COMPOSE_SETTINGS, resolveActionButtons, type ActionButtonId } from '../stage/actionButtons'
import { resolveOptions, TABLE_EDIT_OPTIONS, type TableId } from '../stage/options'
import type { ReceivedPacket, WorkspaceData } from '../stage/types'
import { PacketAnalyzer } from './PacketAnalyzer'
import { PacketComposer } from './PacketComposer'
import { PacketOverview } from './PacketViews'
import { TablePanel } from './TablePanel'
import { RouterInfoView } from './RouterInfoView'
import { ReceivedPacketsPanel, WorkPanel, type WorkView } from './WorkPanel'

// 送ったパケットの判定結果を、画面上部に数秒だけ出す
const toaster = createToaster({ placement: 'top', duration: 5000 })

type Props = {
  stageId: string
  workspace: WorkspaceData
  // ステージ JSON の options / action_buttons（未検証の生の値）
  rawOptions?: unknown
  rawActionButtons?: unknown
}

// ステージの作業画面。左にタブ切替のテーブル、右にパケット受信とパケット送信の枠を並べる。画面の状態はここで持つ
export function StageWorkspace({ stageId, workspace, rawOptions, rawActionButtons }: Props) {
  const navigate = useNavigate()
  const options = useMemo(() => resolveOptions(rawOptions), [rawOptions])
  const buttonIds = useMemo(() => resolveActionButtons(rawActionButtons), [rawActionButtons])

  // やることリストのボタンがあるときだけ、はじめにやることリストを出す
  const [view, setView] = useState<WorkView>(() => (buttonIds.includes('todo_list') ? { kind: 'todo' } : { kind: 'none' }))
  // テーブルはユーザーが編集できるので、ステージのデータを初期値として持つ
  const [tables, setTables] = useState(workspace.tables)
  // パケットごとの解析の進み具合。別のパケットを見て戻っても残す
  const [analyzedLayers, setAnalyzedLayers] = useState<Record<string, ProtocolId[]>>({})
  // 作業ボタンごとの作成中のパケット
  const [drafts, setDrafts] = useState<Partial<Record<ActionButtonId, PacketDraft>>>({})
  // 最後にパケットを送った作業ボタン
  const [sentButtonId, setSentButtonId] = useState<ActionButtonId | null>(null)
  // パケットはサーバーから WebSocket で届く。判定結果は画面上部に出す
  const game = useStageSocket(stageId, ({ success, message }) => {
    toaster.create({ type: success ? 'success' : 'error', title: success ? '正解' : '不正解', description: message })
    // 正解したパケットは空に戻し、同じボタンで別のパケットを作れるようにする（不正解なら直して送り直せるように残す）
    if (success && sentButtonId) setDrafts((previous) => ({ ...previous, [sentButtonId]: undefined }))
  })
  // パケット受信の枠で解析画面を開いているパケット。戻るボタンで一覧に戻す（パケット送信の枠の操作とは関係なく残す）
  const [openedPacketId, setOpenedPacketId] = useState<string | null>(null)

  // パケット作成のボタンと、その作成中のパケット・項目ごとの編集の可否
  const composeButtons = buttonIds.flatMap((id) => {
    const settings = COMPOSE_SETTINGS[id]
    if (!settings) return []
    const isEditable = createIsEditable(options.packet_editable_fields[id])
    const isAutoFilled = createIsAutoFilled(options.packet_auto_fields, isEditable)
    return [{ id, label: ACTION_BUTTON_LABELS[id], settings, draft: drafts[id] ?? createDraft(settings), isEditable, isAutoFilled }]
  })

  const openedPacket = game.packets.find((packet) => packet.id === openedPacketId)
  const getAnalyzedLayers = (packet: ReceivedPacket) =>
    analyzedLayers[packet.id] ?? getInitialAnalyzedLayers(packet.hex, options.analysis_auto_layers)
  const completedPacketIds = game.packets
    .filter((packet) => isAnalysisComplete(packet.hex, getAnalyzedLayers(packet)))
    .map((packet) => packet.id)
  const selectedCompose = view.kind === 'compose' ? composeButtons.find((button) => button.id === view.buttonId) : undefined

  const notice =
    game.status === 'cleared' || game.status === 'error' ? (
      <Alert.Root status={game.status === 'cleared' ? 'success' : 'error'}>
        <Alert.Indicator />
        <Alert.Title>{game.status === 'cleared' ? 'ステージクリア！すべてのパケットを正しく処理しました。' : game.error}</Alert.Title>
      </Alert.Root>
    ) : game.packets.length === 0 ? (
      <HStack gap="2">
        <Spinner size="sm" color="green.500" />
        <Text fontSize="sm" color="gray.600">
          {game.status === 'connecting'
            ? 'サーバーに接続しています…'
            : 'パケットの受信を待っています。こちらから送るパケットもあるので、やることリストを確認しましょう'}
        </Text>
      </HStack>
    ) : null

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
          packets={game.packets}
          selectedId={openedPacket?.id ?? null}
          completedIds={completedPacketIds}
          onSelect={(packet) => setOpenedPacketId(packet.id)}
          notice={notice}
          detail={
            openedPacket && (
              // key でパケットごとに注意メッセージをリセットする
              <PacketAnalyzer
                key={openedPacket.id}
                packet={openedPacket}
                analyzedLayers={getAnalyzedLayers(openedPacket)}
                onAnalyze={(layers) => setAnalyzedLayers((previous) => ({ ...previous, [openedPacket.id]: layers }))}
                onBack={() => setOpenedPacketId(null)}
              />
            )
          }
        />
        <WorkPanel
          buttonIds={buttonIds}
          todos={workspace.todos}
          view={view}
          onChangeView={setView}
          detail={
            selectedCompose ? (
              <PacketComposer
                label={selectedCompose.label}
                settings={selectedCompose.settings}
                draft={selectedCompose.draft}
                onChange={(draft) => setDrafts((previous) => ({ ...previous, [selectedCompose.id]: draft }))}
                isAutoFilled={selectedCompose.isAutoFilled}
                isEditable={selectedCompose.isEditable}
                onSend={
                  game.status === 'playing' || game.status === 'judging'
                    ? (bytes) => {
                        setSentButtonId(selectedCompose.id)
                        game.send(buildPacketJson(bytes))
                      }
                    : undefined
                }
                isSending={game.status === 'judging'}
              />
            ) : view.kind === 'packet_overview' ? (
              <PacketOverview drafts={composeButtons} />
            ) : view.kind === 'router_info' ? (
              <RouterInfoView router={workspace.router} />
            ) : null
          }
        />
      </VStack>
      <Portal>
        <Toaster toaster={toaster} insetInline={{ mdDown: '4' }}>
          {(toast) => (
            <Toast.Root width={{ md: 'sm' }}>
              <Toast.Indicator />
              <VStack align="stretch" gap="1" flex="1">
                <Toast.Title>{toast.title}</Toast.Title>
                <Toast.Description>{toast.description}</Toast.Description>
              </VStack>
              <Toast.CloseTrigger />
            </Toast.Root>
          )}
        </Toaster>
      </Portal>
      {/* ステージクリアのお知らせ。クリアした時点で開き、閉じた後もパケット受信の枠にクリアの表示が残る。
          直前の判定結果（トースト）を閉じたときに一緒に閉じないよう、外側のクリックでは閉じない */}
      {game.status === 'cleared' && (
        <Dialog.Root defaultOpen placement="center" closeOnInteractOutside={false}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner px="4">
              <Dialog.Content textAlign="center" py="6">
                <Dialog.Body>
                  <VStack gap="4">
                    <Circle size="16" bg="green.500" color="white" fontSize="3xl" fontWeight="bold">
                      ✓
                    </Circle>
                    <Dialog.Title fontSize="2xl" color="gray.800">
                      ステージクリア！
                    </Dialog.Title>
                    <Text color="gray.600">すべてのパケットを正しく転送できました。</Text>
                  </VStack>
                </Dialog.Body>
                <Dialog.Footer justifyContent="center" gap="3">
                  <Dialog.ActionTrigger asChild>
                    <SecondaryButton size="md">閉じる</SecondaryButton>
                  </Dialog.ActionTrigger>
                  <PrimaryButton size="md" px="6" onClick={() => navigate('/stages')}>
                    ステージ選択に戻る
                  </PrimaryButton>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      )}
    </Grid>
  )
}
