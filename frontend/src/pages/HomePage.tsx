import { Box, Heading, Text } from '@chakra-ui/react'
import { useNavigate } from 'react-router'
import { NetworkBackground } from '../components/NetworkBackground'
import { PageLayout } from '../components/PageLayout'
import { PrimaryButton } from '../components/ui'

// 文節の途中で改行されないよう、この単位ごとにまとめて折り返す
const LEAD_PHRASES = ['ルータになりきって、', 'ネットワークの流れと', 'パケットの構造を理解しよう！']

// タイトル画面（/）
export function HomePage() {
  const navigate = useNavigate()

  return (
    <PageLayout background={<NetworkBackground />}>
      <Heading
        as="h1"
        fontSize={{ base: '5xl', sm: '6xl', md: '8xl' }}
        fontWeight="black"
        letterSpacing="tighter"
        lineHeight="1"
        color="gray.800"
      >
        Packet
        <Box as="span" color="green.500">
          -Crafter
        </Box>
      </Heading>
      <Text color="gray.600" fontSize={{ base: 'md', md: 'xl' }} maxW="2xl">
        {LEAD_PHRASES.map((phrase) => (
          <Box as="span" key={phrase} display="inline-block">
            {phrase}
          </Box>
        ))}
      </Text>
      <PrimaryButton mt="4" h="14" px="14" fontSize="lg" onClick={() => navigate('/stages')}>
        ステージ選択
      </PrimaryButton>
    </PageLayout>
  )
}
