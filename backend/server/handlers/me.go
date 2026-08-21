package handlers

import (
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerMe(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	type UserInfo struct {
		ID         uuid.UUID `json:"id"`
		Username   string    `json:"username"`
		IsGuest    bool      `json:"is_guest"`
		CreatedAt  time.Time `json:"created_at"`
		Bio        string    `json:"bio"`
		AvatarPath string    `json:"avatar_path"`
	}

	sessionToken, err := cookies.Read(r, "session_token")
	if err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Not authenticated", err)
		return
	}

	user, err := db.GetUserByCookie(r.Context(), sessionToken)
	if err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Invalid or expired session", err)
		return
	}

	avatarPath := ""
	if user.AvatarPath.Valid {
		avatarPath = user.AvatarPath.String
	}

	RespondWithJSON(w, http.StatusOK, UserInfo{
		ID:         user.ID,
		Username:   user.Username,
		IsGuest:    user.IsGuest.Bool,
		CreatedAt:  user.CreatedAt.Time,
		Bio:        user.Bio,
		AvatarPath: avatarPath,
	})
}
