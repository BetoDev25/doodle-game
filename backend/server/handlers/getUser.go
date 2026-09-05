package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerGetUserByUsername(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	type UserInfo struct {
		ID         uuid.UUID `json:"id"`
		Username   string    `json:"username"`
		IsGuest    bool      `json:"is_guest"`
		CreatedAt  time.Time `json:"created_at"`
		Bio        string    `json:"bio"`
		AvatarPath string    `json:"avatar_path"`
	}

	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		RespondWithError(w, http.StatusBadRequest, "Invalid URL", nil)
		return
	}

	username := pathParts[3]

	user, err := db.GetUserByUsername(r.Context(), username)
	if err != nil {
		RespondWithError(w, http.StatusNotFound, "User not found", err)
		return
	}

	// Get avatar path
	avatarPath := "/avatars/default.png"
	if user.AvatarPath.Valid && user.AvatarPath.String != "" {
		avatarPath = user.AvatarPath.String
	}

	RespondWithJSON(w, http.StatusOK, UserInfo{
		ID:         user.ID,
		Username:   user.Username,
		IsGuest:    user.IsGuest.Bool,
		CreatedAt:  user.CreatedAt,
		Bio:        user.Bio,
		AvatarPath: avatarPath,
	})
}
