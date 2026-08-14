package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/BetoDev25/doodle-game/backend/config"
	"github.com/BetoDev25/doodle-game/backend/internal/auth"
	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerCreateGuest(w http.ResponseWriter, r *http.Request, db *database.Queries, cfg config.Config) {
	var req struct {
		Username string `json:"username"`
	}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	username := req.Username
	log.Printf("Creating guest with username: %s", username)

	if username == "" {
		RespondWithError(w, http.StatusBadRequest, "Username is required", nil)
		return
	}

	guest, err := db.CreateGuest(r.Context(), username)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't create guest", err)
		return
	}

	token := auth.GenerateSessionToken()
	session, err := db.CreateSession(r.Context(), database.CreateSessionParams{
		Token:     token,
		UserID:    guest.ID,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})
	if err != nil {
		log.Printf("CreateSession error: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Couldn't create session", err)
		return
	}

	maxAge := int(time.Until(session.ExpiresAt).Seconds())
	if maxAge <= 0 {
		maxAge = 60
	}

	// Set session cookie
	sessionCookie := &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		Expires:  session.ExpiresAt,
		MaxAge:   maxAge,
		HttpOnly: true,
		Domain:   cfg.CookieDomain,
		Secure:   cfg.CookieSecure,
		SameSite: cfg.CookieSameSite,
	}
	err = cookies.Write(w, *sessionCookie)
	if err != nil {
		log.Printf("Error setting cookie: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "server error", err)
		return
	}

	RespondWithJSON(w, http.StatusCreated, database.User{
		ID:       guest.ID,
		Username: guest.Username,
	})
}
