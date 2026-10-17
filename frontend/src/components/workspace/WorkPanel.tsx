import { Box, Button, List, Stack, Text, VStack } from '@chakra-ui/react'
import type { FrameLayer, WorkAction } from '../../types/workspace'
import FrameView from './FrameView'
import Panel from './Panel'

// 作業枠の右側に表示する内容
export type WorkView =
  | { kind: 'todo' }
  | { kind: 'frame'; sourceId: string; title: string; layers: FrameLayer[] }

type Props = {
  actions: WorkAction[]
  todos: string[]
  view: WorkView
  onChangeView: (view: WorkView) => void
}

function WorkPanel({ actions, todos, view, onChangeView }: Props) {
  const isActive = (id: string) => view.kind === 'frame' && view.sourceId === id

  return (
    <Panel title="作業" flex="1" minH="0">
      <Stack direction={{ base: 'column', md: 'row' }} gap="4" align="stretch" flex="1" minH="0">
        <VStack
          align="stretch"
          gap="2"
          w={{ base: 'full', md: '40' }}
          flexShrink="0"
          overflow={{ lg: 'auto' }}
        >
          {actions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant="outline"
              colorPalette="green"
              bg={isActive(action.id) ? 'green.50' : 'white'}
              borderColor={isActive(action.id) ? 'green.500' : 'gray.300'}
              color="gray.800"
              aria-pressed={isActive(action.id)}
              onClick={() =>
                onChangeView({
                  kind: 'frame',
                  sourceId: action.id,
                  title: `${action.label}のフレーム`,
                  layers: action.layers,
                })
              }
            >
              {action.label}
            </Button>
          ))}
          <Button
            size="sm"
            mt={{ base: '2', md: 'auto' }}
            bg={view.kind === 'todo' ? 'green.600' : 'green.500'}
            color="white"
            _hover={{ bg: 'green.600' }}
            aria-pressed={view.kind === 'todo'}
            onClick={() => onChangeView({ kind: 'todo' })}
          >
            やることリスト
          </Button>
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
            <TodoList todos={todos} />
          ) : (
            <FrameView title={view.title} layers={view.layers} />
          )}
        </Box>
      </Stack>
    </Panel>
  )
}

function TodoList({ todos }: { todos: string[] }) {
  return (
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
  )
}

export default WorkPanel
