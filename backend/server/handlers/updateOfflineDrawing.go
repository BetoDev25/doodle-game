package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerUpdateOfflineDrawing(w http.ResponseWriter, r *http.Request, db *database.Queries, conn *sql.DB) {
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
	actor, err := db.GetUserByCookie(r.Context(), sessionToken)
	if err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Invalid or expired session", err)
		return
	}

	// The only client-supplied data
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

	// One transaction: finish + notify, atomically.
	tx, err := conn.BeginTx(r.Context(), nil)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't start transaction", err)
		return
	}
	defer tx.Rollback()

	qtx := db.WithTx(tx)

	// 1. Claim + finish (guarded — only succeeds if still unclaimed)
	rows, err := qtx.UpdateOfflineDrawingUser(r.Context(), database.UpdateOfflineDrawingUserParams{
		User2ID: uuid.NullUUID{
			UUID:  actor.ID,
			Valid: true,
		},
		FinishedStrokes: input.FinishedStrokes,
		ID:              drawingID,
	})
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't update drawing", err)
		return
	}
	if rows == 0 {
		RespondWithError(w, http.StatusConflict, "Drawing already finished or not available", nil)
		return
	}

	// 2. Look up the drawing to find the recipient (the doodler)
	drawing, err := qtx.GetOfflineDrawingByID(r.Context(), drawingID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't load drawing", err)
		return
	}

	// 3. Create the notification — all values server-derived
	body, err := GenerateNotificationBody("drawing_finished", actor.Username)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't create notification", err)
		return
	}
	_, err = qtx.CreateNotification(r.Context(), database.CreateNotificationParams{
		Type:        "drawing_finished",
		RecipientID: drawing.DrawingUser1ID.UUID, // the doodler (user_id)
		DrawingID:   uuid.NullUUID{UUID: drawingID, Valid: true},
		Body:        body,
	})
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't create notification", err)
		return
	}

	if err := tx.Commit(); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't commit", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{
		"message": "drawing finished",
	})
}
