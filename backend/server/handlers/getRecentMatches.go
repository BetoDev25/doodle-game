package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerGetRecentMatches(w http.ResponseWriter, r *http.Request, db *database.Queries) {
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
	totalMatches, err := db.GetTotalMatches(r.Context())
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Could not get count", err)
		return
	}

	totalPages := int((totalMatches + int64(pageSize) - 1) / int64(pageSize))

	if page > totalPages && totalPages > 0 {
		page = totalPages
	}
	if page < 1 {
		page = 1
	}

	offset := (page - 1) * pageSize

	matches, err := db.GetMostRecentMatches(r.Context(), database.GetMostRecentMatchesParams{
		Limit:  int32(pageSize),
		Offset: int32(offset),
	})
	if err != nil {
		log.Printf("Error getting matches: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Could not get matches", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"matches":      matches,
		"current_page": page,
		"total_pages":  totalPages,
		"total_items":  totalMatches,
	})
}
