package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	
	// モジュール名が "backend" の場合のインポートパス
	"backend/db"
)

// GetStages はステージの概要一覧を取得します (GET /getstages)
func GetStages(c *gin.Context) {
	query := `SELECT id, title, description FROM stages;`

	result, err := db.ExecuteQuery(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetStageByID は指定されたステージIDの詳細情報(topologyを含む)を取得します (GET /getstages/:stageID)
func GetStageByID(c *gin.Context) {
	// URLパラメータから stageID を取得
	stageID := c.Param("stageID")

	// プレースホルダー ($1) を使用してSQLインジェクションを防ぐ
	query := `SELECT id, title, description, topology FROM stages WHERE id = $1;`

	result, err := db.ExecuteQuery(query, stageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// レコードが存在しない場合
	if len(result) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stage not found"})
		return
	}

	// ID指定による取得なので、配列の1つ目だけを返す
	c.JSON(http.StatusOK, result[0])
}
