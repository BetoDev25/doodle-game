package handlers

import (
	"log"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerDeleteMatchByID(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	role, ok := GetUserRoleFromContext(r)
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Not authenticated", nil)
		return
	}

	if role != "admin" && role != "superadmin" {
		RespondWithError(w, http.StatusForbidden, "Forbidden", nil)
		return
	}

	matchID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid match ID", err)
		return
	}

	if err := db.DeleteDrawingByMatchID(r.Context(), matchID); err != nil {
		log.Printf("Error deleting drawings: %v", err)
	}

	if err := db.DeleteMatchByID(r.Context(), matchID); err != nil {
		log.Printf("Error deleting match: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to delete match", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
