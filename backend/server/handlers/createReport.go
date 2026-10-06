package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerCreateReport(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	userID, ok := GetUserIDFromContext(r)
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Not authenticated", nil)
		return
	}

	var req struct {
		MatchID string `json:"match_id"`
		URL     string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	matchID, err := uuid.Parse(req.MatchID)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid match ID", err)
		return
	}

	report, err := db.CreateReport(r.Context(), database.CreateReportParams{
		ReporterID: userID,
		MatchID:    matchID,
		Url:        req.URL,
		ReportedAt: time.Now(),
	})
	if err != nil {
		log.Printf("Error creating report: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to create report", err)
		return
	}

	RespondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"message":     "Report submitted",
		"reported_at": report.ReportedAt,
	})
}
