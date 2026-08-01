package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/BetoDev25/doodle-game/backend/internal/auth"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerLoginUser(w http.ResponseWriter, r *http.Request, db *database.Queries) {
	type params struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	var input params
	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Get user from database
	user, err := db.GetUserByUsername(r.Context(), input.Username)
	if err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Invalid username or password", nil)
		return
	}

	// Check password
	match, err := auth.CheckPasswordHash(input.Password, user.PasswordHash)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error checking password", err)
		return
	}
	if !match {
		RespondWithError(w, http.StatusUnauthorized, "Invalid username or password", nil)
		return
	}

	// Generate JWT
	secret := os.Getenv("JWT_SECRET")
	token, err := auth.MakeJWT(user.ID, secret, 24*time.Hour)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error creating session", err)
		return
	}

	// Return token
	RespondWithJSON(w, http.StatusOK, map[string]string{
		"token": token,
	})
}
