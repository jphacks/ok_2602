import { Badge, Box, Button, Flex, Heading, Separator, Text, VStack, type ButtonProps, type StackProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import type { Stage } from '../stage/types'

// 画面をまたいで使う小さな部品（ボタン・枠・バッジ）

// 緑のメインボタン
export function PrimaryButton(props: ButtonProps) {
  return (
    <Button
      size="xl"
      px="12"
      bg="green.500"
      color="white"
      fontWeight="bold"
      shadow="md"
      _hover={{ bg: 'green.600' }}
      _active={{ bg: 'green.700' }}
      {...props}
    />
  )
}

// 白地に緑枠のボタン（戻る・作業内のボタンなど）
export function SecondaryButton(props: ButtonProps) {
  return <Button variant="outline" size="lg" colorPalette="green" bg="white" {...props} />
}

// 選択中かどうかで見た目が変わる白いボタン（受信パケット・作業ボタン）
export function ToggleButton({ isSelected, ...props }: ButtonProps & { isSelected: boolean }) {
  return (
    <Button
      variant="outline"
      colorPalette="green"
      bg={isSelected ? 'green.50' : 'white'}
      borderColor={isSelected ? 'green.500' : 'gray.300'}
      color="gray.800"
      aria-pressed={isSelected}
      {...props}
    />
  )
}

// ステージ選択画面のカード（番号 / タイトル / 区切り線 / 説明）
export function StageButton({ stage, stageNumber }: { stage: Stage; stageNumber: number }) {
  const navigate = useNavigate()

  return (
    <Button
      w="full"
      h="full"
      minH="40"
      py="5"
      px="4"
      variant="outline"
      colorPalette="green"
      bg="white"
      shadow="sm"
      whiteSpace="normal"
      _hover={{ bg: 'green.50', shadow: 'md' }}
      onClick={() => navigate(`/stages/${stage.id}`)}
    >
      <VStack gap="2" w="full" h="full" justify="flex-start">
        <Text fontSize="xs" fontWeight="semibold" color="green.600">
          ステージ {stageNumber}
        </Text>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">
          {stage.title}
        </Text>
        <Separator w="full" borderColor="green.100" />
        <Text fontSize="xs" fontWeight="normal" color="gray.600">
          {stage.description}
        </Text>
      </VStack>
    </Button>
  )
}

// 作業画面の白い枠。title を省略すると見出しなし。
// 見出しがあるときは fieldset / legend にして、枠線が見出しの部分で途切れるようにする（ブラウザ標準の描き方）
export function Panel({ title, action, children, ...props }: StackProps & { title?: string; action?: ReactNode }) {
  return (
    <VStack
      as={title ? 'fieldset' : undefined}
      align="stretch"
      gap="3"
      bg="white"
      borderWidth="1px"
      borderColor="green.200"
      rounded="2xl"
      shadow="sm"
      p="4"
      pt={title ? '2' : '4'}
      minW="0"
      textAlign="left"
      {...props}
    >
      {title && (
        <Flex as="legend" align="center" gap="2" px="2">
          <Heading as="h2" size="sm" color="gray.800">
            {title}
          </Heading>
          {action}
        </Flex>
      )}
      {children}
    </VStack>
  )
}

const SAMPLE_DATA_MESSAGE = 'サーバーに接続できないため、サンプルデータを表示しています'

// サンプルデータを表示中であることを示す小さなバッジ（詳細はホバーで出す）
export function SampleDataBadge() {
  return (
    <Badge
      colorPalette="orange"
      variant="subtle"
      size="sm"
      rounded="full"
      px="2"
      gap="1.5"
      title={SAMPLE_DATA_MESSAGE}
      aria-label={SAMPLE_DATA_MESSAGE}
      cursor="help"
    >
      <Box as="span" w="1.5" h="1.5" rounded="full" bg="orange.500" />
      サンプルデータ
    </Badge>
  )
}
