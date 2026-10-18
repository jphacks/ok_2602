package scenario

import (
	"log"
	"sync"
	"time"

	"backend/model"

	"github.com/gorilla/websocket"
)

const (
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	writeWait      = 10 * time.Second
	maxMessageSize = 512 * 1024 // 受信メッセージ上限: 512 KB
)

type Runner struct {
	conn     *websocket.Conn
	scenario model.Scenario
	writeMu  sync.Mutex
}

func NewRunner(conn *websocket.Conn, sc model.Scenario) *Runner {
	return &Runner{
		conn:     conn,
		scenario: sc,
	}
}

func (r *Runner) safeWriteJSON(v interface{}) error {
	r.writeMu.Lock()
	defer r.writeMu.Unlock()

	r.conn.SetWriteDeadline(time.Now().Add(writeWait))
	return r.conn.WriteJSON(v)
}

func (r *Runner) safeWriteControl(messageType int, data []byte) error {
	r.writeMu.Lock()
	defer r.writeMu.Unlock()

	r.conn.SetWriteDeadline(time.Now().Add(writeWait))
	return r.conn.WriteMessage(messageType, data)
}

func (r *Runner) Run() {
	// 【対策2】1リクエストあたりの最大受容量を制限（DoS/OOM対策）
	r.conn.SetReadLimit(maxMessageSize)

	r.conn.SetReadDeadline(time.Now().Add(pongWait))
	r.conn.SetPongHandler(func(string) error {
		r.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	// 【対策1】Goroutineリーク防止用のキャンセルチャネル
	done := make(chan struct{})
	defer close(done)

	// 定期 Ping 送信 Goroutine
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	go func() {
		for {
			select {
			case <-ticker.C:
				if err := r.safeWriteControl(websocket.PingMessage, nil); err != nil {
					return
				}
			case <-done: // Run() が終了したら確実にこのGoroutineも終了する
				return
			}
		}
	}()

	// 【対策4】正常終了/正常エラー時にWebSocketのCloseフレームを送信
	defer func() {
		closeData := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "Scenario session ended")
		r.safeWriteControl(websocket.CloseMessage, closeData)
	}()

	var lastReceivedPacket *model.PacketJson

	for _, step := range r.scenario.Steps {
		log.Printf("[Scenario %s] Step %d: %s (%s)", r.scenario.ScenarioID, step.Step, step.Description, step.Type)

		switch step.Type {
		case "send":
			msg := model.WSMessage{
				Event:   "packet",
				Step:    step.Step,
				Packet:  step.Packet,
				Message: step.Description,
			}
			if err := r.safeWriteJSON(msg); err != nil {
				log.Printf("Failed to send packet: %v", err)
				return
			}

		case "receive":
			var req model.PacketJson
			if err := r.conn.ReadJSON(&req); err != nil {
				log.Printf("Failed to receive packet from client: %v", err)
				return
			}
			lastReceivedPacket = &req

		case "evaluate":
			if lastReceivedPacket == nil {
				r.sendError("評価対象の受信パケットが存在しません")
				return
			}

			// 不正解なら接続を切らず、同じステップでパケットの再送を待って判定し直す
			for {
				success, reason := EvaluatePacket(lastReceivedPacket, step)
				evalMsg := model.WSMessage{
					Event:   "eval_result",
					Step:    step.Step,
					Success: success,
					Message: reason,
				}
				r.safeWriteJSON(evalMsg)

				if success {
					break
				}
				log.Printf("[Scenario %s] Failed at Step %d", r.scenario.ScenarioID, step.Step)
				lastReceivedPacket = &model.PacketJson{}
				if err := r.conn.ReadJSON(lastReceivedPacket); err != nil {
					log.Printf("Failed to receive packet from client: %v", err)
					return
				}
			}
		}
	}

	r.safeWriteJSON(model.WSMessage{
		Event:   "info",
		Message: "すべてのシナリオステップが正常に完了しました！",
	})
}

func (r *Runner) sendError(msg string) {
	r.safeWriteJSON(model.WSMessage{
		Event:   "error",
		Message: msg,
	})
}
