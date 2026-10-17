import { Badge, Box, Button, List, Stack, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Panel, ToggleButton } from '../components/ui'
import { ACTION_BUTTON_LABELS, type ActionButtonId } from '../stage/actionButtons'
import type { ReceivedPacket } from '../stage/types'

// パケット送信の枠の右側に表示する内容
export type WorkView =
  | { kind: 'none' }
  | { kind: 'todo' }
  | { kind: 'packet_overview' }
  | { kind: 'router_info' }
  | { kind: 'compose'; buttonId: ActionButtonId }

type ReceivedPacketsPanelProps = {
  packets: ReceivedPacket[]
  selectedId: string | null
  // 解析が最後まで終わったパケット。一覧で「解析済み」の目印を付ける
  completedIds: string[]
  onSelect: (packet: ReceivedPacket) => void
  // 開いているパケットの解析画面。あるときは一覧の代わりにこれを出す（一覧に戻るボタンは解析画面の中にある）
  detail?: ReactNode
}

// パケット受信の枠。受信パケットの一覧を出し、押すとこの枠の中で解析できる
export function ReceivedPacketsPanel({ packets, selectedId, completedIds, onSelect, detail }: ReceivedPacketsPanelProps) {
  return (
    <Panel title="パケット受信" flexShrink="0">
      {detail ? (
        <Box maxH="72" overflow="auto">
          {detail}
        </Box>
      ) : packets.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          まだパケットは届いていません
        </Text>
      ) : (
        <VStack align="stretch" gap="2" maxH="44" overflow="auto" px={{ base: '0', md: '6' }}>
          {packets.map((packet) => (
            <ToggleButton
              key={packet.id}
              isSelected={packet.id === selectedId}
              position="relative"
              fontWeight="normal"
              onClick={() => onSelect(packet)}
            >
              {packet.label}
              {/* 名前が中央からずれないよう、目印はボタンの右端に重ねて置く */}
              {completedIds.includes(packet.id) && (
                <Badge
                  position="absolute"
                  right="3"
                  top="50%"
                  transform="translateY(-50%)"
                  colorPalette="green"
                  variant="solid"
                  size="sm"
                >
                  解析済み
                </Badge>
              )}
            </ToggleButton>
          ))}
        </VStack>
      )}
    </Panel>
  )
}

type WorkPanelProps = {
  // ステージの action_buttons で指定されたボタン（この順に並べる）
  buttonIds: ActionButtonId[]
  todos: string[]
  view: WorkView
  onChangeView: (view: WorkView) => void
  // やることリスト以外のときに右側に表示する内容（パケットの作成など）
  detail: ReactNode
}

// ボタンを押したときに切り替わる表示
const getButtonView = (id: ActionButtonId): WorkView => {
  if (id === 'todo_list') return { kind: 'todo' }
  if (id === 'packet_all_view') return { kind: 'packet_overview' }
  return { kind: 'compose', buttonId: id }
}

// 「パケット送信」の枠。左に作業ボタン（先頭はどのステージでも出すルータの情報）、右にやることリストやパケット作成の画面を出す
export function WorkPanel({ buttonIds, todos, view, onChangeView, detail }: WorkPanelProps) {
  const isSelected = (id: ActionButtonId) => {
    const buttonView = getButtonView(id)
    return buttonView.kind === view.kind && (view.kind !== 'compose' || view.buttonId === id)
  }

  return (
    <Panel title="パケット送信" flex="1" minH="0">
      <Stack direction={{ base: 'column', md: 'row' }} gap="4" align="stretch" flex="1" minH="0">
        <VStack align="stretch" gap="2" w={{ base: 'full', md: '40' }} flexShrink="0" overflow={{ lg: 'auto' }}>
          <ToggleButton
            size="sm"
            isSelected={view.kind === 'router_info'}
            onClick={() => onChangeView({ kind: 'router_info' })}
          >
            ルータの情報
          </ToggleButton>
          {buttonIds.map((id, index) =>
            // やることリストは目立つ色にし、最後に置かれたときは下端に寄せる
            id === 'todo_list' ? (
              <Button
                key={id}
                size="sm"
                mt={index === buttonIds.length - 1 ? { base: '2', md: 'auto' } : undefined}
                bg={isSelected(id) ? 'green.600' : 'green.500'}
                color="white"
                _hover={{ bg: 'green.600' }}
                aria-pressed={isSelected(id)}
                onClick={() => onChangeView(getButtonView(id))}
              >
                {ACTION_BUTTON_LABELS[id]}
              </Button>
            ) : (
              <ToggleButton key={id} size="sm" isSelected={isSelected(id)} onClick={() => onChangeView(getButtonView(id))}>
                {ACTION_BUTTON_LABELS[id]}
              </ToggleButton>
            ),
          )}
        </VStack>
        <Box
          flex="1"
          minW="0"
          minH={{ base: '64', lg: '0' }}
          maxH={{ base: '96', lg: 'none' }}
          overflow="auto"
          borderWidth="1px"
          borderColor="gray.200"
          rounded="xl"
          p="4"
          bg="gray.50"
        >
          {view.kind === 'todo' ? (
            <VStack align="stretch" gap="3">
              <Text fontWeight="bold" color="gray.800">
                やることリスト
              </Text>
              <List.Root as="ol" listStyleType="decimal" ps="5" gap="2" color="gray.700" fontSize="sm">
                {todos.map((todo) => (
                  <List.Item key={todo}>{todo}</List.Item>
                ))}
              </List.Root>
            </VStack>
          ) : view.kind === 'none' ? (
            <Text fontSize="sm" color="gray.600">
              左のボタンを選ぶと、ここでパケットを作成できます。
            </Text>
          ) : (
            detail
          )}
        </Box>
      </Stack>
    </Panel>
  )
}
