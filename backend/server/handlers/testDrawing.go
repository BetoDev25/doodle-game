package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

type TestDrawingRequest struct {
	Strokes json.RawMessage `json:"strokes"`
}

func HandlerGetTestDrawing(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	// Get match ID from URL
	matchIDStr := strings.TrimPrefix(r.URL.Path, "/api/test-drawing/")
	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid match ID", err)
		return
	}

	// Query the drawing
	drawing, err := db.GetDrawingByMatchID(r.Context(), matchID)
	if err != nil {
		RespondWithError(w, http.StatusNotFound, "Drawing not found", err)
		return
	}

	// Parse the strokes
	var strokes []map[string]interface{}
	if err := json.Unmarshal(drawing.DoodleStrokes, &strokes); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to parse strokes", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"id":           drawing.ID,
		"match_id":     drawing.MatchID,
		"strokes":      strokes,
		"stroke_count": len(strokes),
	})
}
