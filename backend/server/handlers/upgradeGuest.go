package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/BetoDev25/doodle-game/backend/internal/auth"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/google/uuid"
)

func HandlerUpgradeGuest(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	type params struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	var input params
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Get the current user from context (the guest)
	userID, ok := r.Context().Value("user_id").(uuid.UUID)
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Not authenticated", nil)
		return
	}

	// Check if user is a guest
	user, err := db.GetUserByID(r.Context(), userID)
	if err != nil || !user.IsGuest.Bool {
		RespondWithError(w, http.StatusBadRequest, "User is not a guest", nil)
		return
	}

	// Hash the password
	hashedPassword, err := auth.HashPassword(input.Password)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Could not hash password", err)
		return
	}

	// Upgrade guest to user
	err = db.UpgradeGuestToUser(r.Context(), database.UpgradeGuestToUserParams{
		Username: input.Username,
		PasswordHash: sql.NullString{
			String: hashedPassword,
			Valid:  true,
		},
		ID: userID,
	})
	if err != nil {
		log.Printf("Error upgrading guest: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Could not upgrade account", err)
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message":  "Account upgraded successfully",
		"username": input.Username,
	})
}
