package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerGetRecentOfflineDrawings(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		RespondWithError(w, http.StatusBadRequest, "Invalid URL", nil)
		return
	}

	pageStr := pathParts[3]

	page, _ := strconv.Atoi(pageStr)
	if page < 1 {
		page = 1
	}

	const pageSize = 20

	// Get total count
	totalDrawings, err := db.GetTotalOfflineDrawings(r.Context())
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Could not get count", err)
		return
	}

	totalPages := int((totalDrawings + int64(pageSize) - 1) / int64(pageSize))

	if page > totalPages && totalPages > 0 {
		page = totalPages
	}
	if page < 1 {
		page = 1
	}

	offset := (page - 1) * pageSize

	drawings, err := db.GetRecentOfflineDrawings(r.Context(), database.GetRecentOfflineDrawingsParams{
		Limit:  int32(pageSize),
		Offset: int32(offset),
	})
	if err != nil {
		log.Printf("Error getting offline drawings: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Could not get drawings", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"drawings":     drawings,
		"current_page": page,
		"total_pages":  totalPages,
		"total_items":  totalDrawings,
	})
}
