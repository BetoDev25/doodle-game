package handlers

import (
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/config"
	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerMarkNotificationsRead(w http.ResponseWriter, r *http.Request, db *database.Queries, cfg config.Config) {
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

	if err := db.MarkNotificationsRead(r.Context(), user.ID); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't mark notifications read", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{
		"message": "notifications marked read",
	})
}
