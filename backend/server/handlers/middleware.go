package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/BetoDev25/doodle-game/backend/config"
	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func Middleware(cfg config.Config, db *database.Queries, next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sessionToken, _ := cookies.Read(r, "session_token")

		if !cfg.RateLimiter.Allow(sessionToken, r.URL.Path) {
			http.Error(w, "Too many requests. Please slow down.", http.StatusTooManyRequests)
			return
		}

		//paths that don't require authentification
		publicPaths := []string{
			"/login.html",
			"/signup.html",
			"/static/",
			"/game.html",
			"/api/guests",
			"/api/login",
			"/api/users",
		}

		if r.URL.Path == "/" {
			next.ServeHTTP(w, r)
			return
		}

		//check if current path is public
		for _, path := range publicPaths {
			if strings.HasPrefix(r.URL.Path, path) {
				next.ServeHTTP(w, r)
				return
			}
		}

		/*
			if err != nil || sessionToken == "" {
				http.Redirect(w, r, "/login.html", http.StatusSeeOther)
				return
			}
		*/

		//Get user_id
		user, err := db.GetUserByCookie(r.Context(), sessionToken)
		if err != nil {
			http.Redirect(w, r, "/login.html", http.StatusSeeOther)
			return
		}

		//Add user info to context
		ctx := context.WithValue(r.Context(), "user_id", user.ID)
		ctx = context.WithValue(ctx, "username", user.Username)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
