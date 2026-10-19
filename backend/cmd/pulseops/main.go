package main

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"pulseops/hosting"
	"pulseops/internal/data"
	"pulseops/internal/demo"
	"syscall"
	"time"
)

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	database := os.Getenv("DATABASE_URL")
	if database == "" {
		return fmt.Errorf("DATABASE_URL required")
	}
	db, err := pgxpool.New(ctx, database)
	if err != nil {
		return fmt.Errorf("invalid database configuration")
	}
	defer db.Close()
	if err = db.Ping(ctx); err != nil {
		return fmt.Errorf("database unavailable")
	}
	store := data.Store{DB: db}
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "migrate":
			return store.Migrate(ctx)
		case "seed":
			return store.Seed(ctx, os.Getenv("SEED_PASSWORD"))
		case "seed-demo":
			return demo.Seed(ctx, db)
		default:
			return fmt.Errorf("unknown command")
		}
	}
	origin := os.Getenv("APP_ORIGIN")
	u, err := url.Parse(origin)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") || u.Path != "" || u.RawQuery != "" || u.Fragment != "" || u.User != nil {
		return fmt.Errorf("APP_ORIGIN must be a bare HTTP(S) origin")
	}
	secure := os.Getenv("COOKIE_SECURE") != "false"
	if !secure && !(u.Scheme == "http" && (u.Hostname() == "localhost" || u.Hostname() == "127.0.0.1")) {
		return fmt.Errorf("insecure cookies allowed only on HTTP loopback")
	}
	if secure && u.Scheme != "https" {
		return fmt.Errorf("secure cookies require HTTPS APP_ORIGIN")
	}
	server := &http.Server{Addr: ":8080", Handler: hosting.Handler(db, origin, secure), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 20 * time.Second, WriteTimeout: 20 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16384}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdown)
	}()
	log.Print("PulseOps listening on :8080")
	if err = server.ListenAndServe(); err != http.ErrServerClosed {
		return err
	}
	return nil
}
func main() {
	if err := run(); err != nil {
		log.Print(err)
		os.Exit(1)
	}
}
