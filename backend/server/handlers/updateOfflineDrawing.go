package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerUpdateOfflineDrawing(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	idStr := r.PathValue("id")
	drawingID, err := uuid.Parse(idStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid drawing id", err)
		return
	}

	// Identify the caller from the session, not the body
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
		FinishedStrokes json.RawMessage `json:"finished_strokes"`
	}
	var input params
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}
	if len(input.FinishedStrokes) == 0 {
		RespondWithError(w, http.StatusBadRequest, "finished_strokes is required", nil)
		return
	}

	err = db.UpdateOfflineDrawingUser(r.Context(), database.UpdateOfflineDrawingUserParams{
		User2ID: uuid.NullUUID{
			UUID:  user.ID,
			Valid: true,
		},
		FinishedStrokes: input.FinishedStrokes,
		ID:              drawingID,
	})
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't update drawing", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{
		"message": "drawing finished",
	})
}
