package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerViewDrawings(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		RespondWithError(w, http.StatusBadRequest, "Invalid URL", nil)
		return
	}

	matchIDStr := pathParts[3]
	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid match ID", err)
		return
	}

	// Get all drawings for this match
	drawings, err := db.GetDrawingsByMatchID(r.Context(), matchID)
	if err != nil {
		RespondWithError(w, http.StatusNotFound, "Drawings not found", err)
		return
	}

	// Build response
	type DrawingResponse struct {
		UserID          string          `json:"user_id"`
		Username        string          `json:"username"`
		DoodleStrokes   json.RawMessage `json:"doodle_strokes"`
		FinishedStrokes json.RawMessage `json:"finished_strokes"`
	}

	var result []DrawingResponse
	for _, d := range drawings {
		username := "Deleted User"
		if d.UserID.Valid {
			user, err := db.GetUserByID(r.Context(), d.UserID.UUID)
			if err == nil {
				username = user.Username
			}
		}

		result = append(result, DrawingResponse{
			UserID:          d.UserID.UUID.String(),
			Username:        username,
			DoodleStrokes:   d.DoodleStrokes,
			FinishedStrokes: d.FinishedStrokes,
		})
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"match_id": matchID,
		"drawings": result,
	})
}
