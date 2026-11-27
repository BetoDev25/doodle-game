package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerGetRandomOfflineDrawing(w http.ResponseWriter, r *http.Request, db *database.Queries) {
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

	drawing, err := db.GetRandomUnfinishedOfflineDrawing(r.Context(), uuid.NullUUID{UUID: user.ID, Valid: true})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			RespondWithError(w, http.StatusNotFound, "No unfinished drawings available", nil)
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Couldn't get drawing", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"id":             drawing.DrawingID,
		"doodle_strokes": json.RawMessage(drawing.DrawingDoodle),
		"created_at":     drawing.DrawingCreatedAt,
		"username":       drawing.Username,
		"avatar_path":    drawing.UserAvatarPath,
	})
}
