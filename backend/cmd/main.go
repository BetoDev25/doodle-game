package main

import (
	"log"
	"net/http"

	_ "github.com/lib/pq"

	"github.com/BetoDev25/doodle-game/backend/config"
	"github.com/BetoDev25/doodle-game/backend/server/handlers"
)

func main() {
	apiCfg := handlers.SetupAPIConfig()
	mux, server := config.SetupServer()
	// Serve static files from the "static" directory
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))
	db := apiCfg.DB

	// API routes
	mux.HandleFunc("POST /api/users", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerCreateUser(w, r, db)
	})
	mux.HandleFunc("POST /api/login", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandlerLoginUser(w, r, db)
	})

	log.Println("Server starting on http://localhost:8080")
	log.Fatal(server.ListenAndServe())
}
