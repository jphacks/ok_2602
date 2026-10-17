import { Box, Grid, Text, VStack } from '@chakra-ui/react'
import type { FrameLayer } from '../../types/workspace'

type Props = {
  title: string
  layers: FrameLayer[]
}

// フレームの全体像（層ごとのヘッダーとフィールド）を表示する
function FrameView({ title, layers }: Props) {
  return (
    <VStack align="stretch" gap="3">
      <Text fontWeight="bold" color="gray.800">
        {title}
      </Text>
      {layers.map((layer) => (
        <Box key={layer.name} borderWidth="1px" borderColor="green.200" rounded="lg" overflow="hidden">
          <Text bg="green.50" px="3" py="1" fontSize="sm" fontWeight="semibold" color="green.800">
            {layer.name}
          </Text>
          <Grid templateColumns="auto 1fr" columnGap="4" rowGap="1" px="3" py="2">
            {layer.fields.map((field) => (
              <FieldRow key={field.name} name={field.name} value={field.value} />
            ))}
          </Grid>
        </Box>
      ))}
    </VStack>
  )
}

function FieldRow({ name, value }: { name: string; value: string }) {
  return (
    <>
      <Text fontSize="sm" color="gray.600" whiteSpace="nowrap">
        {name}
      </Text>
      <Text fontSize="sm" fontFamily="mono" color="gray.800" wordBreak="break-all">
        {value}
      </Text>
    </>
  )
}

export default FrameView
