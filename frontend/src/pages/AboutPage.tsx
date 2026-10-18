import { Box, Circle, Grid, Heading, HStack, List, Text, VStack } from '@chakra-ui/react'
import { useNavigate } from 'react-router'
import { PageLayout } from '../components/PageLayout'
import { Panel, PrimaryButton } from '../components/ui'
import { ABOUT_SUMMARY, PLAY_STEPS, PLAY_TIPS, SCREEN_AREAS, type ScreenAreaId } from '../data/aboutText'

// 見取り図の中での各エリアの位置（作業画面と同じ並び: 左にテーブル、右に受信と送信）
const AREA_POSITIONS: Record<ScreenAreaId, { gridColumn: string; gridRow: string }> = {
  tables: { gridColumn: '1', gridRow: '1 / span 2' },
  received: { gridColumn: '2', gridRow: '1' },
  work: { gridColumn: '2', gridRow: '2' },
}

// 番号付きの丸（見取り図と説明、遊び方の手順で使う）
function NumberMark({ number }: { number: number }) {
  return (
    <Circle size="7" bg="green.500" color="white" fontSize="sm" fontWeight="bold" flexShrink="0">
      {number}
    </Circle>
  )
}

// プレイ画面の見取り図と、各エリアの説明
function ScreenGuide() {
  return (
    <VStack align="stretch" gap="4">
      <Grid
        templateColumns="2fr 3fr"
        templateRows="1fr 2fr"
        gap="2"
        h="40"
        p="2"
        bg="gray.50"
        borderWidth="1px"
        borderColor="gray.200"
        rounded="xl"
        aria-hidden
      >
        {SCREEN_AREAS.map((area, index) => (
          <HStack
            key={area.id}
            {...AREA_POSITIONS[area.id]}
            justify="center"
            gap="2"
            bg="white"
            borderWidth="1px"
            borderColor="green.200"
            rounded="lg"
          >
            <NumberMark number={index + 1} />
            <Text fontSize="sm" fontWeight="semibold" color="gray.700">
              {area.title}
            </Text>
          </HStack>
        ))}
      </Grid>
      {SCREEN_AREAS.map((area, index) => (
        <HStack key={area.id} align="start" gap="3">
          <NumberMark number={index + 1} />
          <Box>
            <Text fontWeight="semibold" color="gray.800">
              {area.title}
            </Text>
            <Text fontSize="sm" color="gray.600">
              {area.description}
            </Text>
          </Box>
        </HStack>
      ))}
    </VStack>
  )
}

// NetSim Lab の説明画面（/about）。概要は短く、遊び方を詳しく説明する
export function AboutPage() {
  const navigate = useNavigate()

  return (
    <PageLayout back={{ to: '/', label: 'ホームに戻る' }}>
      <VStack align="stretch" gap="6" w="full" maxW="3xl">
        <VStack gap="3">
          <Heading as="h1" size={{ base: '2xl', md: '4xl' }} color="gray.800">
            NetSim Labとは
          </Heading>
          <Text color="gray.600" fontSize={{ base: 'md', md: 'lg' }}>
            {ABOUT_SUMMARY}
          </Text>
        </VStack>

        <Panel title="プレイ画面の見方">
          <ScreenGuide />
        </Panel>

        <Panel title="遊び方">
          <VStack align="stretch" gap="5">
            {PLAY_STEPS.map((step, index) => (
              <HStack key={step.title} align="start" gap="3">
                <NumberMark number={index + 1} />
                <Box>
                  <Text fontWeight="semibold" color="gray.800" mb="1">
                    {step.title}
                  </Text>
                  <List.Root ps="5" gap="1" color="gray.600" fontSize="sm">
                    {step.details.map((detail) => (
                      <List.Item key={detail}>{detail}</List.Item>
                    ))}
                  </List.Root>
                </Box>
              </HStack>
            ))}
          </VStack>
        </Panel>

        <Panel title="ヒント">
          <List.Root ps="5" gap="1" color="gray.600" fontSize="sm">
            {PLAY_TIPS.map((tip) => (
              <List.Item key={tip}>{tip}</List.Item>
            ))}
          </List.Root>
        </Panel>

        <Box textAlign="center">
          <PrimaryButton h="14" px="14" fontSize="lg" onClick={() => navigate('/stages')}>
            ステージ選択へ
          </PrimaryButton>
        </Box>
      </VStack>
    </PageLayout>
  )
}
