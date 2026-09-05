package handlers

import (
	"log"
	"net/http"
	"strings"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerGetMatch(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		RespondWithError(w, http.StatusBadRequest, "Invalid URL", nil)
		return
	}

	matchIDStr := pathParts[3] // /api/match/{id}

	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid match ID", err)
		return
	}

	match, err := db.GetMatchByID(r.Context(), matchID)
	if err != nil {
		log.Printf("Error getting match: %v", err)
		RespondWithError(w, http.StatusNotFound, "Match does not exist or was deleted", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, match)
}
