package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerGetRandomDrawing(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	drawing, err := db.GetRandomUnfinishedOfflineDrawing(r.Context())
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
