package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerGetRecentMatchesByUsername(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 6 {
		RespondWithError(w, http.StatusBadRequest, "Invalid URL", nil)
		return
	}

	username := pathParts[3]
	pageStr := pathParts[5]

	page, _ := strconv.Atoi(pageStr)
	if page < 1 {
		page = 1
	}

	const pageSize = 20

	// Get the user ID from the username
	user, err := db.GetUserByUsername(r.Context(), username)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Could not get user", err)
		return
	}

	userID := uuid.NullUUID{
		UUID:  user.ID,
		Valid: true,
	}

	// Get total count for this user
	totalMatches, err := db.GetTotalMatchesByUsername(r.Context(), userID)
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

	matches, err := db.GetMostRecentMatchesByUsername(r.Context(), database.GetMostRecentMatchesByUsernameParams{
		Player1ID: userID,
		Limit:     int32(pageSize),
		Offset:    int32(offset),
	})
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Could not get matches", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"username":     username,
		"matches":      matches,
		"current_page": page,
		"total_pages":  totalPages,
		"total_items":  totalMatches,
	})
}
