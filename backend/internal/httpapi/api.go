package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
	"pulseops/internal/data"
)

type Repository interface {
	Credentials(context.Context, string) (data.User, string, error)
	CreateSession(context.Context, string, string) error
	Session(context.Context, string) (data.User, error)
	DeleteSession(context.Context, string) error
	Events(context.Context, string) ([]data.Event, error)
}
type API struct {
	Store  Repository
	Origin string
	Secure bool
	dummy  []byte
}

func New(store Repository, origin string, secure bool) http.Handler {
	a := &API{Store: store, Origin: origin, Secure: secure}
	a.dummy, _ = bcrypt.GenerateFromPassword([]byte("dummy-timing-only-not-a-login"), 12)
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(15 * time.Second))
	r.Use(a.headers)
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) { reply(w, 200, map[string]string{"status": "ok"}) })
	r.With(middleware.Throttle(4)).Post("/api/auth/login", a.login)
	r.Post("/api/auth/logout", a.logout)
	r.Get("/api/auth/me", a.me)
	r.Get("/api/events", a.events)
	return r
}
func reply(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func fail(w http.ResponseWriter, status int, msg string) {
	reply(w, status, map[string]string{"error": msg})
}
func (a *API) headers(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		// Exact Origin + non-simple JSON requests protect login and logout against CSRF.
		if r.Method == http.MethodPost && (r.Header.Get("Origin") != a.Origin || strings.Split(r.Header.Get("Content-Type"), ";")[0] != "application/json") {
			fail(w, 403, "Request origin or content type rejected")
			return
		}
		next.ServeHTTP(w, r)
	})
}
func (a *API) cookieName() string {
	if a.Secure {
		return "__Host-pulseops_session"
	}
	return "pulseops_dev_session"
}
func (a *API) token(r *http.Request) string {
	c, err := r.Cookie(a.cookieName())
	if err != nil {
		return ""
	}
	return c.Value
}
func (a *API) cookie(w http.ResponseWriter, token string, age int) {
	http.SetCookie(w, &http.Cookie{Name: a.cookieName(), Value: token, Path: "/", HttpOnly: true, Secure: a.Secure, SameSite: http.SameSiteStrictMode, MaxAge: age})
}
func (a *API) user(w http.ResponseWriter, r *http.Request) (data.User, bool) {
	token := a.token(r)
	if token == "" {
		fail(w, 401, "Authentication required")
		return data.User{}, false
	}
	u, err := a.Store.Session(r.Context(), token)
	if errors.Is(err, pgx.ErrNoRows) {
		fail(w, 401, "Session expired")
		return u, false
	}
	if err != nil {
		fail(w, 503, "Service unavailable")
		return u, false
	}
	return u, true
}
func (a *API) login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096))
	dec.DisallowUnknownFields()
	if dec.Decode(&in) != nil || dec.Decode(&struct{}{}) != io.EOF || len(in.Password) > 72 || len(in.Password) == 0 {
		fail(w, 400, "Invalid login request")
		return
	}
	u, h, err := a.Store.Credentials(r.Context(), strings.ToLower(strings.TrimSpace(in.Email)))
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		fail(w, 503, "Service unavailable")
		return
	}
	if err != nil {
		h = string(a.dummy)
	}
	valid := bcrypt.CompareHashAndPassword([]byte(h), []byte(in.Password)) == nil
	if err != nil || !valid {
		fail(w, 401, "Invalid email or password")
		return
	}
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		fail(w, 500, "Unable to create session")
		return
	}
	token := base64.RawURLEncoding.EncodeToString(b)
	if old := a.token(r); old != "" {
		if err = a.Store.DeleteSession(r.Context(), old); err != nil {
			fail(w, 503, "Service unavailable")
			return
		}
	}
	if err = a.Store.CreateSession(r.Context(), token, u.ID); err != nil {
		fail(w, 503, "Service unavailable")
		return
	}
	a.cookie(w, token, 28800)
	reply(w, 200, u)
}
func (a *API) logout(w http.ResponseWriter, r *http.Request) {
	if token := a.token(r); token != "" {
		if err := a.Store.DeleteSession(r.Context(), token); err != nil {
			fail(w, 503, "Service unavailable")
			return
		}
	}
	a.cookie(w, "", -1)
	w.WriteHeader(204)
}
func (a *API) me(w http.ResponseWriter, r *http.Request) {
	if u, ok := a.user(w, r); ok {
		reply(w, 200, u)
	}
}
func (a *API) events(w http.ResponseWriter, r *http.Request) {
	u, ok := a.user(w, r)
	if !ok {
		return
	}
	switch u.Role {
	case "admin", "operator", "viewer":
	default:
		fail(w, 403, "Role cannot read events")
		return
	}
	events, err := a.Store.Events(r.Context(), u.OrganisationID)
	if err != nil {
		fail(w, 503, "Unable to load events")
		return
	}
	reply(w, 200, map[string]any{"events": events})
}
