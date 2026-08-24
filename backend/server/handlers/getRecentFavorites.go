package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerGetRecentFavorites(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 5 {
		RespondWithError(w, http.StatusBadRequest, "Invalid URL", nil)
		return
	}

	username := pathParts[3]
	pageStr := pathParts[5]

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	const pageSize = 20
	offset := (page - 1) * pageSize

	// Get favorites with drawings by username
	favorites, err := db.GetMostRecentFavoritesByUsername(r.Context(), database.GetMostRecentFavoritesByUsernameParams{
		Username: username,
		Limit:    int32(pageSize),
		Offset:   int32(offset),
	})
	if err != nil {
		RespondWithError(w, http.StatusNotFound, "User not found or no favorites", err)
		return
	}

	// Get total count for pagination
	totalFavorites, err := db.GetTotalFavoritesByUsername(r.Context(), username)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Could not get count", err)
		return
	}

	totalPages := int((totalFavorites + int64(pageSize) - 1) / int64(pageSize))

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"username":     username,
		"favorites":    favorites,
		"current_page": page,
		"total_pages":  totalPages,
		"total_items":  totalFavorites,
	})
}
