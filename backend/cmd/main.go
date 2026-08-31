package main

import (
	"flag"
	"log"
	"net/http"

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

	// Main page
	mux.HandleFunc("/main/", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/index.html")
	}))

	// Matches page
	mux.HandleFunc("/matches/{page}", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/matches.html")
	}))

	// Profile Sections
	mux.HandleFunc("/profile/{username}/{section}/{page}", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/profile.html")
	})

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

	mux.HandleFunc("/profile", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/profile.html")
	}))

	// Websocket
	mux.HandleFunc("/ws", handlers.ServeWebSocket(hub, db))

	// API routes
	mux.HandleFunc("POST /api/users", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerCreateUser(w, r, db)
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

	// Root route - index.html
	mux.HandleFunc("/", handlers.Middleware(cfg, db, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			http.Redirect(w, r, "/main/", http.StatusFound)
			return
		}
		// For all other paths, serve static files
		http.FileServer(http.Dir("./static")).ServeHTTP(w, r)
	}))

	log.Println("Server starting on http://localhost:8080")
	log.Fatal(server.ListenAndServe())
}
