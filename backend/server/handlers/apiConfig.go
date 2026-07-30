package handlers

import (
	"database/sql"
	"flag"
	"log"
	"os"

	"github.com/BetoDev25/doodle-game/backend/internal/database"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type APIConfig struct {
	DB     *database.Queries
	APIKey string
}

func SetupAPIConfig() *APIConfig {
	env := flag.String("env", "production", "Environment: development or production")
	flag.Parse()
	var envFile string
	if *env == "production" {
		envFile = ".env.prod"
	} else {
		envFile = ".env.dev"
	}
	log.Printf("Loading env file: %s", envFile)

	err := godotenv.Load(envFile)
	if err != nil {
		log.Printf("Warning: %s file not found, using system environment variables", envFile)
	}

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		log.Fatal("DB_URL environment variable is not set")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Error opening database: ", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal("Error connecting to database: ", err)
	}
	dbQueries := database.New(db)

	apiCfg := &APIConfig{
		DB:     dbQueries,
		APIKey: os.Getenv("API_KEY"),
	}

	return apiCfg
}
