import { Text, VStack } from '@chakra-ui/react'
import type { RouterInfo } from '../stage/types'
import { FieldRow, LayerCard } from './PacketViews'

// プレイヤーが操作するルータ自身の情報。インターフェースごとにアドレスと接続先を並べる
export function RouterInfoView({ router }: { router: RouterInfo }) {
  return (
    <VStack align="stretch" gap="3">
      <Text fontWeight="bold" color="gray.800">
        ルータの情報（{router.name}）
      </Text>
      {router.interfaces.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          インターフェースが設定されていません
        </Text>
      ) : (
        router.interfaces.map((iface) => (
          <LayerCard key={iface.name} title={`インターフェース ${iface.name}`} colorPalette="green">
            {[
              { name: 'IPアドレス', value: iface.address },
              { name: 'サブネットマスク', value: iface.subnetMask },
              { name: 'ネットワーク', value: iface.network },
              { name: 'MACアドレス', value: iface.mac },
              { name: '接続先', value: iface.neighbor || 'なし' },
            ].map((field) => (
              <FieldRow key={field.name} name={field.name}>
                <Text fontSize="sm" fontFamily="mono" color="gray.800" wordBreak="break-all">
                  {field.value}
                </Text>
              </FieldRow>
            ))}
          </LayerCard>
        ))
      )}
    </VStack>
  )
}
