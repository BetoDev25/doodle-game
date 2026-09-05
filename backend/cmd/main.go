package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"strings"

	_ "github.com/lib/pq"

	"github.com/BetoDev25/doodle-game/backend/config"
	"github.com/BetoDev25/doodle-game/backend/server/handlers"
)

func main() {
	env := flag.String("env", "production", "Environment: development or production")
	flag.Parse()
	apiCfg := handlers.SetupAPIConfig(*env)
	mux, server := config.SetupServer(*env)
	cfg := config.SetupConfig(*env)
	db := apiCfg.DB
	if db == nil {
		log.Fatal("Database connection is nil")
	}
	log.Println("Database connection established successfully")
	hub := handlers.SetupWebSocket(db)

	// Serve static files from the "static" directory
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))

	// TEST - TEMPORARY
	mux.HandleFunc("/view-drawings", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/view_drawings.html")
	})
	mux.HandleFunc("GET /api/view-drawings/{id}", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerViewDrawings(w, r, db)
	})

	// END OF TEST - TEMPORARY

	// Main page - after logging in
	mux.HandleFunc("/main/", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/main.html")
	}))

	// Matches page
	mux.HandleFunc("/matches/{page}", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/matches.html")
	}))

	// Game Page
	mux.HandleFunc("/play/", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/game.html")
	}))

	// Profile Sections
	mux.HandleFunc("/profile/{username}/{section}/{page}", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/profile.html")
	})

	// Redirect /profile/{username} to /profile/{username}/matches/1
	mux.HandleFunc("/profile/{username}", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		pathParts := strings.Split(r.URL.Path, "/")
		if len(pathParts) >= 3 {
			username := pathParts[2]
			http.Redirect(w, r, fmt.Sprintf("/profile/%s/matches/1", username), http.StatusFound)
			return
		}
		http.Redirect(w, r, "/", http.StatusFound)
	}))

	// View Favorites
	mux.HandleFunc("GET /api/profile/{username}/favorites/{page}", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerGetRecentFavorites(w, r, db)
	}))
	// View Matches by Username
	mux.HandleFunc("GET /api/profile/{username}/matches/{page}", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerGetRecentMatchesByUsername(w, r, db)
	}))

	// View Matches
	mux.HandleFunc("GET /api/matches/{page}", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerGetRecentMatches(w, r, db)
	}))

	// View single match
	mux.HandleFunc("/match/{id}", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/match.html")
	}))

	mux.HandleFunc("/profile", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/profile.html")
	}))

	// Login/Signup pages
	mux.HandleFunc("/login/", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/login.html")
	}))

	mux.HandleFunc("/signup/", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/signup.html")
	}))

	// Error page
	mux.HandleFunc("/error", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/error.html")
	}))

	// Websocket
	mux.HandleFunc("/ws", handlers.ServeWebSocket(hub, db))

	// API routes
	mux.HandleFunc("POST /api/users", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerCreateUser(w, r, db, cfg)
	}))
	mux.HandleFunc("GET /api/users/{username}", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerGetUserByUsername(w, r, db)
	}))
	mux.HandleFunc("POST /api/login", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerLoginUser(w, r, db, cfg)
	}))
	mux.HandleFunc("GET /api/me", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerMe(w, r, db)
	}))
	mux.HandleFunc("GET /api/drawings", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerGetDrawings(w, r, db)
	}))
	mux.HandleFunc("POST /api/guests", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerCreateGuest(w, r, db, cfg)
	}))
	mux.HandleFunc("POST /api/avatar/update", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerUpdateAvatar(w, r, db, cfg)
	}))
	mux.HandleFunc("GET /api/avatar", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerGetAvatar(w, r, db, cfg)
	}))
	mux.HandleFunc("POST /api/favorites/", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerUpdateFavorite(w, r, db)
	}))
	mux.HandleFunc("GET /api/favorites", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerGetFavorites(w, r, db)
	}))
	mux.HandleFunc("POST /api/upgrade-guest", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerUpgradeGuest(w, r, db)
	}))
	mux.HandleFunc("GET /api/match/{id}", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerGetMatch(w, r, db)
	}))

	/*
		// TEST - TEMPORARY
		mux.HandleFunc("GET /api/test-drawing/{id}", func(w http.ResponseWriter, r *http.Request) {
			handlers.HandlerGetTestDrawing(w, r, db)
		})

		mux.HandleFunc("POST /api/test-drawing", func(w http.ResponseWriter, r *http.Request) {
			handlers.HandlerTestSaveDrawing(w, r, db)
		})
	*/

	// End of Test

	mux.HandleFunc("POST /api/logout", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerLogoutUser(w, r, db)
	}))

	mux.HandleFunc("/", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			http.ServeFile(w, r, "./static/index.html")
			return
		}
		// For all other paths, return 404
		http.FileServer(http.Dir("./static")).ServeHTTP(w, r)
	}))

	log.Println("Server starting on http://localhost:8080")
	log.Fatal(server.ListenAndServe())
}
