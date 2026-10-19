package data

import (
	"context"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

//go:embed migrations/*.sql
var migrations embed.FS

type User struct {
	ID             string `json:"id"`
	OrganisationID string `json:"organisationId"`
	Email          string `json:"email"`
	Role           string `json:"role"`
}
type Event struct {
	ID         string    `json:"id"`
	Source     string    `json:"source"`
	Severity   string    `json:"severity"`
	Message    string    `json:"message"`
	OccurredAt time.Time `json:"occurredAt"`
}
type Store struct{ DB *pgxpool.Pool }

func Hash(token string) string { h := sha256.Sum256([]byte(token)); return hex.EncodeToString(h[:]) }

func (s Store) Migrate(ctx context.Context) error {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(71001)`); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY)`); err != nil {
		return err
	}
	var exists bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version='001')`).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		sql, e := migrations.ReadFile("migrations/001_initial.sql")
		if e != nil {
			return e
		}
		if _, err = tx.Exec(ctx, string(sql)); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `INSERT INTO schema_migrations VALUES ('001')`); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s Store) Seed(ctx context.Context, password string) error {
	if len(password) < 12 || len(password) > 72 {
		return fmt.Errorf("SEED_PASSWORD must be 12–72 bytes")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return err
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for i, org := range []string{"11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"} {
		email := []string{"alex@aurora.example", "sam@harbour.example"}[i]
		role := []string{"admin", "viewer"}[i]
		if _, err = tx.Exec(ctx, `INSERT INTO organisations VALUES ($1,$2) ON CONFLICT DO NOTHING`, org, []string{"Aurora Demo", "Harbour Demo"}[i]); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `INSERT INTO users VALUES ($1,$1,$2,$3,$4) ON CONFLICT DO NOTHING`, org, email, string(hash), role); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `INSERT INTO events(id,organisation_id,source,severity,message) VALUES ($1,$1,'synthetic-seed','info',$2) ON CONFLICT DO NOTHING`, org, []string{"Aurora synthetic service check completed", "Harbour synthetic queue check completed"}[i]); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
func (s Store) Credentials(ctx context.Context, email string) (User, string, error) {
	var u User
	var h string
	err := s.DB.QueryRow(ctx, `SELECT id,organisation_id,email,role,password_hash FROM users WHERE email=$1`, email).Scan(&u.ID, &u.OrganisationID, &u.Email, &u.Role, &h)
	return u, h, err
}
func (s Store) CreateSession(ctx context.Context, token, user string) error {
	_, err := s.DB.Exec(ctx, `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')`, Hash(token), user)
	return err
}
func (s Store) Session(ctx context.Context, token string) (User, error) {
	var u User
	err := s.DB.QueryRow(ctx, `SELECT u.id,u.organisation_id,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`, Hash(token)).Scan(&u.ID, &u.OrganisationID, &u.Email, &u.Role)
	return u, err
}
func (s Store) DeleteSession(ctx context.Context, token string) error {
	_, err := s.DB.Exec(ctx, `DELETE FROM sessions WHERE token_hash=$1`, Hash(token))
	return err
}
func (s Store) Events(ctx context.Context, org string) ([]Event, error) {
	rows, err := s.DB.Query(ctx, `SELECT id,source,severity,message,occurred_at FROM events WHERE organisation_id=$1 ORDER BY occurred_at DESC,id DESC LIMIT 100`, org)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []Event{}
	for rows.Next() {
		var e Event
		if err = rows.Scan(&e.ID, &e.Source, &e.Severity, &e.Message, &e.OccurredAt); err != nil {
			return nil, err
		}
		result = append(result, e)
	}
	return result, rows.Err()
}
