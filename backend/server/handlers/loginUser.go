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

func HandlerLoginUser(w http.ResponseWriter, r *http.Request, db *database.Queries, cfg config.Config) {
	log.Printf("HandlerLoginUser called for path: %s", r.URL.Path)                     // DEBUG
	log.Printf("HandlerLoginUser: Called! Method: %s, Path: %s", r.Method, r.URL.Path) // DEBUG
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
	isValid, err := auth.CheckPasswordHash(input.Password, user.PasswordHash.String)
	if err != nil || !isValid {
		RespondWithError(w, http.StatusUnauthorized, "Invalid username or password", nil)
		return
	}

	token := auth.GenerateSessionToken()
	session, err := db.CreateSession(r.Context(), database.CreateSessionParams{
		Token:     token,
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(100 * 365 * 24 * time.Hour),
	})
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't create session", err)
		return
	}

	maxAge := int(time.Until(session.ExpiresAt).Seconds())
	if maxAge <= 0 {
		maxAge = 60
	}

	//Secure session cookie
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

	// Return message
	RespondWithJSON(w, http.StatusOK, map[string]string{
		"username": user.Username,
		"message":  "Login successful",
	})
}
