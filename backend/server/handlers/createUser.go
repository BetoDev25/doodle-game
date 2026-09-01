package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/BetoDev25/doodle-game/backend/config"
	"github.com/BetoDev25/doodle-game/backend/internal/auth"
	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func HandlerCreateUser(w http.ResponseWriter, r *http.Request, db *database.Queries, cfg config.Config) {
	type params struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	decoder := json.NewDecoder(r.Body)
	input := params{}
	err := decoder.Decode(&input)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Couldn't decode input", err)
		return
	}

	hashedPassword, err := auth.HashPassword(input.Password)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "could not hash password", err)
		return
	}

	user, err := db.CreateUser(r.Context(), database.CreateUserParams{
		Username: input.Username,
		PasswordHash: sql.NullString{
			String: hashedPassword,
			Valid:  true,
		},
		AvatarPath: sql.NullString{
			String: "/avatars/default.png",
			Valid:  true,
		},
	})
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "23505") {
			RespondWithError(w, http.StatusConflict, "Username is already taken", err)
			return
		}
		fmt.Println("CreateUser error:", err)
		RespondWithError(w, http.StatusInternalServerError, "Couldn't create user", err)
		return
	}

	// Create session for the new user
	token := auth.GenerateSessionToken()
	session, err := db.CreateSession(r.Context(), database.CreateSessionParams{
		Token:     token,
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(8 * time.Hour),
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

	log.Printf("Session cookie set for user: %s, token: %s", user.Username, token)

	RespondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"id":          user.ID,
		"username":    user.Username,
		"created_at":  user.CreatedAt,
		"avatar_path": user.AvatarPath.String,
		"message":     "User created and logged in successfully",
	})
}
