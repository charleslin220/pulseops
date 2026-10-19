// Package hosting adapts the same application to local and serverless HTTP hosting.
package hosting

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"net/http"
	"os"
	"pulseops/internal/data"
	"pulseops/internal/demo"
	"pulseops/internal/httpapi"
	"sync"
	"time"
)

func Handler(db *pgxpool.Pool, origin string, secure bool) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/api/demo/", demo.Handler(db))
	mux.Handle("/", httpapi.New(data.Store{DB: db}, origin, secure))
	return mux
}

var mu sync.Mutex
var handler http.Handler

func Serverless(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	h := handler
	if h == nil {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		config, err := pgxpool.ParseConfig(os.Getenv("DATABASE_URL"))
		if err == nil && os.Getenv("DATABASE_URL") != "" {
			config.MaxConns = 3
			config.MinConns = 0
			db, e := pgxpool.NewWithConfig(ctx, config)
			if e == nil {
				origin := os.Getenv("APP_ORIGIN")
				if origin != "" {
					h = Handler(db, origin, true)
					handler = h
				} else {
					db.Close()
				}
			}
		}
	}
	mu.Unlock()
	if h == nil {
		http.Error(w, "Service configuration unavailable", 503)
		return
	}
	h.ServeHTTP(w, r)
}
