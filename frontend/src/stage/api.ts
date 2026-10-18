import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { SAMPLE_STAGES } from '../data/sampleStages'
import testStage01 from '../test-data/stage-01.json'
import type { PacketJson, ReceivedPacket, Stage, Topology, WSMessage } from './types'

// ステージ情報の取得（GET /getstages と GET /getstages/:stageID）と、ゲーム進行の WebSocket（/ws/:stageID）

const SERVER_URL = 'http://localhost:8080'
const STAGES_URL = `${SERVER_URL}/getstages`
const SOCKET_URL = `${SERVER_URL.replace(/^http/, 'ws')}/ws`

// 【テスト用・後で削除】一覧の末尾に足す、options / action_buttons の動作確認用ステージ。
// 削除するときは src/test-data フォルダとこの行・import を消す
const TEST_STAGES = [testStage01] as Stage[]

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`ステージ情報の取得に失敗しました (${response.status}): ${url}`)
  return (await response.json()) as T
}

export const fetchStages = (signal: AbortSignal) => fetchJson<Stage[]>(STAGES_URL, signal)

// DB では画面の設定（options / action_buttons / todo_list / mac_table）も topology の列に入っている
type TopologyResponse = Topology & Pick<Stage, 'options' | 'action_buttons' | 'todo_list' | 'mac_table'>

export async function fetchStage(stageId: string, signal: AbortSignal): Promise<Stage> {
  const stage = await fetchJson<Omit<Stage, 'topology'> & { topology?: unknown }>(
    `${STAGES_URL}/${encodeURIComponent(stageId)}`,
    signal,
  )
  // JSONB の列が文字列のまま届く場合に備えてパースする
  const topology = (typeof stage.topology === 'string' ? JSON.parse(stage.topology) : stage.topology) as
    | TopologyResponse
    | undefined
  // 画面の設定はステージの直下にあればそれを使い、なければ topology の中から取り出す
  return {
    ...stage,
    topology,
    options: stage.options ?? topology?.options,
    action_buttons: stage.action_buttons ?? topology?.action_buttons,
    todo_list: stage.todo_list ?? topology?.todo_list,
    mac_table: stage.mac_table ?? topology?.mac_table,
  }
}

// ステージ一覧。取得できなければサンプルデータを使う
export function useStages() {
  const [state, setState] = useState({ stages: [] as Stage[], isLoading: true, isSample: false })

  useEffect(() => {
    const controller = new AbortController()
    fetchStages(controller.signal)
      .then((stages) => setState({ stages: [...stages, ...TEST_STAGES], isLoading: false, isSample: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn('ステージ一覧の取得に失敗したためサンプルデータを使用します', error)
        setState({ stages: [...SAMPLE_STAGES, ...TEST_STAGES], isLoading: false, isSample: true })
      })
    return () => controller.abort()
  }, [])

  return state
}

// 一覧のステージに topology がなければ、詳細を取得する
// （サンプルデータ・テスト用データははじめから詳細を持っているので取得しない）
export function useStageDetail(summary: Stage | undefined) {
  const needsFetch = !!summary && !summary.topology
  const [fetched, setFetched] = useState<{ id: string; stage: Stage | null } | null>(null)

  useEffect(() => {
    if (!summary || !needsFetch) return
    const controller = new AbortController()
    fetchStage(summary.id, controller.signal)
      .then((stage) => setFetched({ id: summary.id, stage }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn('ステージ情報の取得に失敗しました', error)
        setFetched({ id: summary.id, stage: null })
      })
    return () => controller.abort()
  }, [summary, needsFetch])

  if (!summary || !needsFetch) return { stage: summary ?? null, isLoading: false, hasError: false }
  if (fetched?.id !== summary.id) return { stage: null, isLoading: true, hasError: false }
  return { stage: fetched.stage, isLoading: false, hasError: !fetched.stage }
}

const ORDINALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

// connecting: 接続中 / playing: 操作できる / judging: 送ったパケットの判定待ち / cleared: ステージクリア / error: 通信できない
export type GameStatus = 'connecting' | 'playing' | 'judging' | 'cleared' | 'error'

export interface JudgeResult {
  success: boolean
  message: string
}

// ゲーム進行。WebSocket で届いたパケットをためていき、送ったパケットの判定結果は onJudge に渡す。
// 不正解でも接続は続き、サーバーは同じステップで送り直しを待つ
export function useStageSocket(stageId: string, onJudge: (result: JudgeResult) => void) {
  const [game, setGame] = useState({ status: 'connecting' as GameStatus, packets: [] as ReceivedPacket[], error: '' })
  const socketRef = useRef<WebSocket | null>(null)
  const handleJudge = useEffectEvent(onJudge)

  useEffect(() => {
    let isDisposed = false
    const setStatus = (status: GameStatus, error = '') => setGame((previous) => ({ ...previous, status, error }))

    const handleMessage = (message: WSMessage) => {
      if (message.event === 'packet' && message.packet) {
        const { hex } = message.packet
        setGame((previous) => {
          const count = previous.packets.length
          const label = `${ORDINALS[count] ?? count + 1}つ目のパケット`
          return { ...previous, packets: [...previous.packets, { id: `step-${message.step}`, label, hex }] }
        })
      } else if (message.event === 'eval_result') {
        setStatus('playing')
        handleJudge({ success: !!message.success, message: message.message ?? '' })
      } else if (message.event === 'info') {
        setStatus('cleared')
      } else if (message.event === 'error') {
        setStatus('error', message.message ?? '')
      }
    }

    const socket = new WebSocket(`${SOCKET_URL}/${encodeURIComponent(stageId)}`)
    socketRef.current = socket
    socket.onopen = () => setStatus('playing')
    socket.onmessage = (event) => {
      if (!isDisposed) handleMessage(JSON.parse(event.data) as WSMessage)
    }
    // クリア後・エラー後にサーバーが閉じるのは正常。それ以外で閉じたらつながらなかったとみなす
    socket.onclose = () => {
      if (isDisposed) return
      setGame((previous) =>
        previous.status === 'cleared' || previous.status === 'error'
          ? previous
          : { ...previous, status: 'error', error: 'サーバーに接続できませんでした' },
      )
    }
    return () => {
      isDisposed = true
      socket.close()
    }
  }, [stageId])

  const send = (packet: PacketJson) => {
    socketRef.current?.send(JSON.stringify(packet))
    setGame((previous) => ({ ...previous, status: 'judging' }))
  }

  return { ...game, send }
}
