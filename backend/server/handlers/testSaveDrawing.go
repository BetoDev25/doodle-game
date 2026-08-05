package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerTestSaveDrawing(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	type TestDrawingRequest struct {
		Strokes json.RawMessage `json:"strokes"`
	}
	var req TestDrawingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request: %v", err)
		RespondWithError(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Use existing user IDs from your database
	starterID := uuid.MustParse("9e30ba0f-a389-4c9e-92ca-8dbd8f5d04cf")
	finisherID := uuid.MustParse("21ffef68-ef72-4f47-af5b-8f3dcb913a7b")

	matchID := uuid.New()

	// Create the match
	_, err := db.CreateMatch(r.Context(), database.CreateMatchParams{
		ID:         matchID,
		StarterID:  starterID,
		FinisherID: finisherID,
	})
	if err != nil {
		log.Printf("Error creating match: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to create match", err)
		return
	}

	// Save the drawing
	drawing, err := db.CreateDrawing(r.Context(), database.CreateDrawingParams{
		MatchID:         matchID,
		StarterID:       starterID,
		FinisherID:      finisherID,
		DoodleStrokes:   req.Strokes,
		FinishedStrokes: json.RawMessage(`[]`),
	})
	if err != nil {
		log.Printf("Error saving drawing: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to save drawing", err)
		return
	}

	RespondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"id":           drawing.ID,
		"match_id":     drawing.MatchID,
		"stroke_count": len(req.Strokes),
		"message":      "Drawing saved successfully",
	})
}
