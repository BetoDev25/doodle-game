package handlers

import (
	"net/http"
	"strconv"

	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerGetDrawings(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	offsetStr := r.URL.Query().Get("offset")
	offset := 0
	if offsetStr != "" {
		var err error
		offset, err = strconv.Atoi(offsetStr)
		if err != nil || offset < 0 {
			offset = 0
		}
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

	drawings, err := db.GetDrawingsByUserID(r.Context(), database.GetDrawingsByUserIDParams{
		UserID: uuid.NullUUID{
			UUID:  user.ID,
			Valid: true,
		},
		Offset: int32(offset),
	})
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't get drawings", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, drawings)
}
