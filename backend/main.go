package main

import (
	"log"
	"os"
	"time"

	"backend/api"
	"backend/db"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// DB初期化
	// DB のポートは環境変数 DB_PORT で変えられる（別のコンテナにつなぐとき）
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}
	dsn := "host=localhost user=backuser password=backpass dbname=app_db port=" + dbPort + " sslmode=disable"
	if err := db.InitDB(dsn); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
			"http://192.168.64.4:5173",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// REST API
	r.GET("/getstages", api.GetStages)
	r.GET("/getstages/:stageID", api.GetStageByID)

	// WebSocket エンドポイント (ステージIDごとに接続を分岐)
	r.GET("/ws/:stageID", api.HandleWebSocket)

	log.Println("Server is running on http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
