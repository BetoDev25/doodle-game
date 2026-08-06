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
	config := config.SetupConfig(*env)
	db := apiCfg.DB
	hub := handlers.SetupWebSocket(db)

	// Serve static files from the "static" directory
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))

	// Websocket
	mux.HandleFunc("/ws", handlers.ServeWebSocket(hub, db))

	// Root route - index.html
	mux.HandleFunc("/", handlers.Middleware(db, func(w http.ResponseWriter, r *http.Request) {
		http.FileServer(http.Dir("./static")).ServeHTTP(w, r)
	}))

	// API routes
	mux.HandleFunc("POST /api/users", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerCreateUser(w, r, db)
	})
	mux.HandleFunc("POST /api/login", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerLoginUser(w, r, db, config)
	})
	mux.HandleFunc("GET /api/me", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerMe(w, r, db)
	})

	// TEST - TEMPORARY
	mux.HandleFunc("GET /api/test-drawing/{id}", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerGetTestDrawing(w, r, db)
	})

	mux.HandleFunc("POST /api/test-drawing", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerTestSaveDrawing(w, r, db)
	})

	// End of Tesst

	mux.HandleFunc("POST /api/logout", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerLogoutUser(w, r, db)
	})

	log.Println("Server starting on http://localhost:8080")
	log.Fatal(server.ListenAndServe())
}
