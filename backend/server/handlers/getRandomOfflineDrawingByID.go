package handlers

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerGetRandomDrawingByID(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	idStr := r.PathValue("id")
	drawingID, err := uuid.Parse(idStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid drawing id", err)
		return
	}

	drawing, err := db.GetOfflineDrawingByID(r.Context(), drawingID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			RespondWithError(w, http.StatusNotFound, "Drawing not found", nil)
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Couldn't get drawing", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, drawing)
}
