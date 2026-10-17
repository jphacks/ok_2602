import { Box } from '@chakra-ui/react'

// Chakra のカラートークンを SVG の style で使うためのヘルパー
const getColorVar = (name: string) => `var(--chakra-colors-${name.replace('.', '-')})`

type NodeType = 'router' | 'switch' | 'pc'

type BackgroundNode = {
  id: string
  type: NodeType
  x: number
  y: number
}

// 1200x800 の座標系に配置した装飾用のネットワーク。中央はテキスト用に空けている
const NODES: BackgroundNode[] = [
  { id: 'r1', type: 'router', x: 190, y: 200 },
  { id: 'r2', type: 'router', x: 1010, y: 190 },
  { id: 'r3', type: 'router', x: 1030, y: 610 },
  { id: 'r4', type: 'router', x: 170, y: 600 },
  { id: 's1', type: 'switch', x: 470, y: 90 },
  { id: 's2', type: 'switch', x: 740, y: 720 },
  { id: 'p1', type: 'pc', x: 60, y: 380 },
  { id: 'p2', type: 'pc', x: 330, y: 40 },
  { id: 'p3', type: 'pc', x: 640, y: 50 },
  { id: 'p4', type: 'pc', x: 1150, y: 400 },
  { id: 'p5', type: 'pc', x: 1150, y: 760 },
  { id: 'p6', type: 'pc', x: 420, y: 760 },
  { id: 'p7', type: 'pc', x: 50, y: 760 },
  { id: 'p8', type: 'pc', x: 1160, y: 60 },
]

const LINKS: [string, string][] = [
  ['r1', 's1'],
  ['s1', 'p2'],
  ['s1', 'p3'],
  ['r1', 'p1'],
  ['r1', 'r4'],
  ['r1', 'r2'],
  ['r2', 'p8'],
  ['r2', 'p4'],
  ['r2', 'r3'],
  ['r3', 'p5'],
  ['r3', 's2'],
  ['s2', 'p6'],
  ['r4', 'p7'],
  ['r4', 'p6'],
]

// パケットが流れるリンク（送信元 → 宛先）と色・速さ
const PACKETS = [
  { from: 'p2', to: 's1', color: 'orange.400', duration: 2.4, begin: 0 },
  { from: 's1', to: 'r1', color: 'orange.400', duration: 2.4, begin: 1.2 },
  { from: 'r1', to: 'r2', color: 'teal.500', duration: 5, begin: 0.5 },
  { from: 'r2', to: 'p4', color: 'teal.500', duration: 2.6, begin: 2 },
  { from: 'r3', to: 's2', color: 'orange.400', duration: 3, begin: 1 },
  { from: 'p6', to: 'r4', color: 'blue.400', duration: 3.2, begin: 0.3 },
  { from: 'r4', to: 'r1', color: 'blue.400', duration: 3.2, begin: 1.8 },
  { from: 'p5', to: 'r3', color: 'teal.500', duration: 2.2, begin: 2.5 },
]

const nodeById = new Map(NODES.map((node) => [node.id, node]))
const getPosition = (id: string) => nodeById.get(id)!

function NodeShape({ node }: { node: BackgroundNode }) {
  const { x, y, type } = node
  const strokeStyle = { stroke: getColorVar('green.300'), strokeWidth: 2 }

  if (type === 'router') {
    return (
      <g>
        <circle cx={x} cy={y} r="22" style={{ fill: getColorVar('white'), ...strokeStyle }} />
        <path
          d={`M${x - 10} ${y - 5} h9 l-3 -3 m3 3 l-3 3 M${x + 10} ${y + 5} h-9 l3 -3 m-3 3 l3 3`}
          style={{ fill: 'none', stroke: getColorVar('green.500'), strokeWidth: 2, strokeLinecap: 'round' }}
        />
      </g>
    )
  }
  if (type === 'switch') {
    return (
      <g>
        <rect x={x - 28} y={y - 11} width="56" height="22" rx="4" style={{ fill: getColorVar('white'), ...strokeStyle }} />
        {[-16, -6, 4, 14].map((offsetX) => (
          <rect key={offsetX} x={x + offsetX - 3} y={y - 3} width="6" height="6" rx="1" style={{ fill: getColorVar('green.200') }} />
        ))}
      </g>
    )
  }
  return (
    <g>
      <rect x={x - 18} y={y - 14} width="36" height="24" rx="3" style={{ fill: getColorVar('white'), ...strokeStyle }} />
      <rect x={x - 12} y={y - 9} width="24" height="14" rx="1.5" style={{ fill: getColorVar('green.50') }} />
      <rect x={x - 9} y={y + 13} width="18" height="3" rx="1.5" style={{ fill: getColorVar('green.300') }} />
    </g>
  )
}

export function NetworkBackground() {
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <Box position="absolute" inset="0" pointerEvents="none" aria-hidden="true">
      <svg
        viewBox="0 0 1200 800"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        {LINKS.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={getPosition(from).x}
            y1={getPosition(from).y}
            x2={getPosition(to).x}
            y2={getPosition(to).y}
            style={{ stroke: getColorVar('green.200'), strokeWidth: 2, strokeDasharray: '6 8' }}
          />
        ))}
        {!isReducedMotion &&
          PACKETS.map(({ from, to, color, duration, begin }) => (
            <rect
              key={`${from}-${to}`}
              x="-8"
              y="-5"
              width="16"
              height="10"
              rx="2"
              style={{ fill: getColorVar(color), stroke: getColorVar('white'), strokeWidth: 1.5 }}
            >
              <animateMotion
                path={`M${getPosition(from).x} ${getPosition(from).y} L${getPosition(to).x} ${getPosition(to).y}`}
                dur={`${duration}s`}
                begin={`${begin}s`}
                repeatCount="indefinite"
              />
            </rect>
          ))}
        {NODES.map((node) => (
          <NodeShape key={node.id} node={node} />
        ))}
      </svg>
      {/* 中央のテキストを読みやすくするため、中心をやわらかく明るくする */}
      <Box
        position="absolute"
        inset="0"
        bgImage={`radial-gradient(ellipse 55% 50% at center, ${getColorVar('gray.50')} 35%, transparent 100%)`}
      />
    </Box>
  )
}

