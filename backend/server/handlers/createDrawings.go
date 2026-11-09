package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerCreateDrawings(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	type params struct {
		UserID        string          `json:"user_id"`
		IsOffline     bool            `json:"is_offline"`
		DoodleStrokes json.RawMessage `json:"doodle_strokes"`
	}

	var input params
	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	userUUID, err := uuid.Parse(input.UserID)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid user_id", err)
		return
	}

	matchID := uuid.NullUUID{Valid: false}
	if !input.IsOffline {
		RespondWithError(w, http.StatusBadRequest, "Online drawings not supported yet", nil)
		return
	}

	_, err = db.CreateDrawing(r.Context(), database.CreateDrawingParams{
		MatchID: matchID,
		UserID: uuid.NullUUID{
			UUID:  userUUID,
			Valid: true,
		},
		DoodleStrokes:   input.DoodleStrokes,
		FinishedStrokes: json.RawMessage(`[]`),
	})
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't create drawing", err)
		return
	}

	RespondWithJSON(w, http.StatusCreated, map[string]string{
		"message": "doodle created",
	})
}
