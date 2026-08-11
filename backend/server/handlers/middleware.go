package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/BetoDev25/doodle-game/backend/internal/cookies"
	"github.com/BetoDev25/doodle-game/backend/internal/database"
)

func Middleware(db *database.Queries, next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		//check if the user currently has a session_token (is logged in)

		//paths that don't require authentification
		publicPaths := []string{
			"/login.html",
			"/signup.html",
			"/static/",
			"/",
			"/game.html",
		}

		//check if current path is public
		for _, path := range publicPaths {
			if strings.HasPrefix(r.URL.Path, path) {
				next.ServeHTTP(w, r)
				return
			}
		}

		sessionToken, err := cookies.Read(r, "session_token")
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
