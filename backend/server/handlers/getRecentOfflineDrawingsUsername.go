package handlers

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerGetRecentOfflineDrawingsUsername(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	username := r.PathValue("username")
	pageStr := r.PathValue("page")

	page, _ := strconv.Atoi(pageStr)
	if page < 1 {
		page = 1
	}

	const pageSize = 20

	// Resolve username -> user ID
	user, err := db.GetUserByUsername(r.Context(), username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			RespondWithError(w, http.StatusNotFound, "User not found", nil)
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Could not get user", err)
		return
	}

	// Get total count
	totalDrawings, err := db.GetTotalOfflineDrawingsByUserID(r.Context(), uuid.NullUUID{
		UUID:  user.ID,
		Valid: true,
	})
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

	drawings, err := db.GetRecentOfflineDrawingsByUserID(r.Context(), database.GetRecentOfflineDrawingsByUserIDParams{
		User2ID: uuid.NullUUID{
			UUID:  user.ID,
			Valid: true,
		},
		Limit:  int32(pageSize),
		Offset: int32(offset),
	})
	if err != nil {
		log.Printf("Error getting offline drawings for %s: %v", username, err)
		RespondWithError(w, http.StatusInternalServerError, "Could not get drawings", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"drawings":     drawings,
		"username":     user.Username,
		"current_page": page,
		"total_pages":  totalPages,
		"total_items":  totalDrawings,
	})
}
