package api

import (
	"encoding/json"
	"log"
	"net/http"

	"backend/db"
	"backend/model"
	"backend/scenario"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // CORS許可 (開発用)
	},
}

func HandleWebSocket(c *gin.Context) {
	stageID := c.Param("stageID")

	// DBから指定ステージのシナリオJSONを取得
	var scenarioRaw []byte
	err := db.DB.QueryRow("SELECT scenario FROM stages WHERE id = $1", stageID).Scan(&scenarioRaw)
	if err != nil || len(scenarioRaw) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stage or scenario not found"})
		return
	}

	var sc model.Scenario
	if err := json.Unmarshal(scenarioRaw, &sc); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse scenario JSON"})
		return
	}

	// HTTP接続をWebSocket接続にアップグレード
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket: %v", err)
		return
	}
	defer conn.Close()

	// シナリオ実行エンジンを初期化してスタート
	runner := scenario.NewRunner(conn, sc)
	runner.Run()
}
