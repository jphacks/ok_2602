package model

// シナリオ全体の構造
type Scenario struct {
	ScenarioID  string `json:"scenario_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Steps       []Step `json:"steps"`
}

// ステップの定義
type Step struct {
	Step             int                    `json:"step"`
	Type             string                 `json:"type"` // "send", "receive", "evaluate"
	Description      string                 `json:"description"`
	Packet           *PacketJson            `json:"packet,omitempty"`
	Expected         map[string]interface{} `json:"expected,omitempty"`
	Unexpected       map[string]interface{} `json:"unexpected,omitempty"` // 配列の項目で「含まれてはいけない」要素
	CheckFields      []string               `json:"check_fields,omitempty"`
	OnFailureMessage string                 `json:"on_failure_message,omitempty"`
}

// WebSocket通信用の共通メッセージラップ構造体
type WSMessage struct {
	Event   string      `json:"event"`             // "packet", "eval_result", "info", "error"
	Step    int         `json:"step,omitempty"`    // 現在のステップ番号
	Packet  *PacketJson `json:"packet,omitempty"`  // パケットデータ
	Message string      `json:"message,omitempty"` // 補助メッセージ・エラー理由
	Success bool        `json:"success,omitempty"` // 評価イベント時の合否
}
