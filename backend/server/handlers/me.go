package handlers

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerMe(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	type UserInfo struct {
		ID       uuid.UUID `json:"id"`
		Username string    `json:"username"`
		IsGuest  bool      `json:"is_guest"`
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

	RespondWithJSON(w, http.StatusOK, UserInfo{
		ID:       user.ID,
		Username: user.Username,
		IsGuest:  user.IsGuest.Bool,
	})
}
