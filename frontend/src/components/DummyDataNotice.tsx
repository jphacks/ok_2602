import { Badge, Box } from '@chakra-ui/react'

const MESSAGE = 'サーバーに接続できないため、サンプルデータを表示しています'

// 画面を圧迫しないよう小さなバッジで表示し、詳細はホバーで出す
function DummyDataNotice() {
  return (
    <Badge
      colorPalette="orange"
      variant="subtle"
      size="sm"
      rounded="full"
      px="2"
      gap="1.5"
      title={MESSAGE}
      aria-label={MESSAGE}
      cursor="help"
    >
      <Box as="span" w="1.5" h="1.5" rounded="full" bg="orange.500" />
      サンプルデータ
    </Badge>
  )
}

export default DummyDataNotice
