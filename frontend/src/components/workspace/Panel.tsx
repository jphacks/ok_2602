import { Flex, Heading, HStack, VStack, type StackProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

type Props = StackProps & {
  title: string
  // 見出しの横に置く要素（？ボタンなど）
  action?: ReactNode
  // 'border' のとき、見出しを枠線の上に重ねて小さく表示する
  titlePlacement?: 'inside' | 'border'
  children: ReactNode
}

// 作業画面の各表で共通の白い枠
function Panel({ title, action, titlePlacement = 'inside', children, ...rest }: Props) {
  const onBorder = titlePlacement === 'border'

  return (
    <VStack
      position="relative"
      align="stretch"
      gap="3"
      bg="white"
      borderWidth="1px"
      borderColor="green.200"
      rounded="2xl"
      shadow="sm"
      p="4"
      pt={onBorder ? '5' : '4'}
      minW="0"
      textAlign="left"
      {...rest}
    >
      {onBorder ? (
        <HStack
          position="absolute"
          top="0"
          left="4"
          transform="translateY(-50%)"
          gap="1"
          px="1.5"
          bg="white"
        >
          <Heading as="h2" fontSize="xs" fontWeight="semibold" color="gray.700" lineHeight="1">
            {title}
          </Heading>
          {action}
        </HStack>
      ) : (
        <Flex justify="space-between" align="center" gap="2">
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

export default Panel
