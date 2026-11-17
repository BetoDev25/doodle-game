package handlers

import (
	"net/http"
	"time"

	"github.com/BetoDev25/doodle-game/backend/config"
	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

type NotificationResponse struct {
	ID          uuid.UUID  `json:"id"`
	Type        string     `json:"type"`
	RecipientID uuid.UUID  `json:"recipient_id"`
	DrawingID   *uuid.UUID `json:"drawing_id"` // nullable
	Body        string     `json:"body"`
	IsRead      bool       `json:"is_read"`
	CreatedAt   time.Time  `json:"created_at"`
}

func HandlerGetNotificationsByUser(w http.ResponseWriter, r *http.Request, db *database.Queries, cfg config.Config) {
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

	rows, err := db.GetNotificationsByUserID(r.Context(), user.ID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't get notifications", err)
		return
	}

	// Unread count for the bell badge
	out := make([]NotificationResponse, 0, len(rows))
	unread := 0
	for _, n := range rows {
		var drawingID *uuid.UUID
		if n.DrawingID.Valid {
			id := n.DrawingID.UUID
			drawingID = &id
		}
		out = append(out, NotificationResponse{
			ID:          n.ID,
			Type:        n.Type,
			RecipientID: n.RecipientID,
			DrawingID:   drawingID,
			Body:        n.Body,
			IsRead:      n.IsRead,
			CreatedAt:   n.CreatedAt,
		})
		if !n.IsRead {
			unread++
		}
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"notifications": out,
		"unread_count":  unread,
	})
}
