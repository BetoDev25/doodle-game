package handlers

import (
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerLogoutUser(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	sessionToken, err := cookies.Read(r, "session_token")
	if err != nil {
		RespondWithError(w, http.StatusUnauthorized, "no active session", err)
		return
	}

	err = db.DeleteSessionByToken(r.Context(), sessionToken)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "could not delete session token", err)
		return
	}

	nullCookie := cookies.DeleteCookie("session_token")
	err = cookies.Write(w, *nullCookie)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "could not delete cookie", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Session deleted",
	})
}
