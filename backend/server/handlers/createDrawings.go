package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerCreateDrawings(w http.ResponseWriter, r *http.Request, db *database.Queries) {
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

	type params struct {
		DoodleStrokes json.RawMessage `json:"doodle_strokes"`
		IsOffline     bool            `json:"is_offline"`
	}
	var input params
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}
	if len(input.DoodleStrokes) == 0 {
		RespondWithError(w, http.StatusBadRequest, "doodle_strokes is required", nil)
		return
	}

	_, err = db.CreateDrawing(r.Context(), database.CreateDrawingParams{
		MatchID: uuid.NullUUID{Valid: false}, // offline: no match
		UserID: uuid.NullUUID{
			UUID:  user.ID,
			Valid: true,
		},
		DoodleStrokes:   input.DoodleStrokes,
		FinishedStrokes: json.RawMessage(`[]`),
		Isoffline:       input.IsOffline,
	})
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't create drawing", err)
		return
	}

	RespondWithJSON(w, http.StatusCreated, map[string]string{
		"message": "doodle created",
	})
}
