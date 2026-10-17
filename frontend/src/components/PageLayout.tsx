import { Box, Center, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import SecondaryButton from './SecondaryButton'

type Props = {
  children: ReactNode
  // 画面左上に表示する戻るボタン
  back?: {
    to: string
    label: string
  }
  // 画面右上に小さく表示する情報
  topRight?: ReactNode
  // コンテンツの背面に敷く装飾
  background?: ReactNode
  // true のとき、PC幅では画面の高さに収めてページ全体をスクロールさせない
  fitViewport?: boolean
}

function PageLayout({ children, back, topRight, background, fitViewport = false }: Props) {
  const navigate = useNavigate()

  return (
    <Center
      position="relative"
      overflow="hidden"
      minH="100svh"
      h={fitViewport ? { lg: '100svh' } : undefined}
      px="4"
      pt={fitViewport ? { base: '24', lg: '20' } : { base: '20', md: '24' }}
      pb={fitViewport ? { base: '8', lg: '6' } : { base: '20', md: '24' }}
      bgGradient="to-b"
      gradientFrom="green.50"
      gradientTo="gray.50"
      color="gray.800"
    >
      {background}
      {back && (
        <Box position="absolute" top={{ base: '4', md: '6' }} left={{ base: '4', md: '6' }} zIndex="1">
          <SecondaryButton size="sm" onClick={() => navigate(back.to)}>
            ← {back.label}
          </SecondaryButton>
        </Box>
      )}
      {topRight && (
        <Box
          position="absolute"
          top={{ base: '4', md: '6' }}
          right={{ base: '4', md: '6' }}
          maxW={{ base: '55%', md: 'md' }}
          zIndex="1"
        >
          {topRight}
        </Box>
      )}
      <VStack
        position="relative"
        zIndex="1"
        gap={fitViewport ? '4' : '6'}
        w="full"
        h={fitViewport ? { lg: 'full' } : undefined}
        textAlign="center"
      >
        {children}
      </VStack>
    </Center>
  )
}

export default PageLayout
