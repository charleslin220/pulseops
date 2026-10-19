package httpapi

import (
	"context"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"net/http/httptest"
	"pulseops/internal/data"
	"strings"
	"testing"
)

type fake struct {
	u       data.User
	hash    string
	org     string
	deleted bool
	expired bool
}

func (f *fake) Credentials(context.Context, string) (data.User, string, error) {
	return f.u, f.hash, nil
}
func (f *fake) CreateSession(context.Context, string, string) error { return nil }
func (f *fake) Session(context.Context, string) (data.User, error) {
	if f.expired {
		return data.User{}, pgx.ErrNoRows
	}
	return f.u, nil
}
func (f *fake) DeleteSession(context.Context, string) error { f.deleted = true; return nil }
func (f *fake) Events(_ context.Context, org string) ([]data.Event, error) {
	f.org = org
	return []data.Event{}, nil
}
func TestSecurity(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("testing-password"), bcrypt.MinCost)
	f := &fake{u: data.User{ID: "user", OrganisationID: "tenant-a", Role: "viewer"}, hash: string(hash)}
	h := New(f, "https://pulseops.example", true)
	call := func(method, path, body, origin string, cookie bool) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("Origin", origin)
		r.Header.Set("Content-Type", "application/json")
		if cookie {
			r.AddCookie(&http.Cookie{Name: "__Host-pulseops_session", Value: "random-token"})
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w
	}
	t.Run("anonymous rejected", func(t *testing.T) {
		if w := call("GET", "/api/events", "", "", false); w.Code != 401 {
			t.Fatal(w.Code)
		}
	})
	t.Run("tenant query cannot override session", func(t *testing.T) {
		w := call("GET", "/api/events?organisationId=tenant-b", "", "", true)
		if w.Code != 200 || f.org != "tenant-a" {
			t.Fatal(w.Code, f.org)
		}
	})
	t.Run("unknown role denied", func(t *testing.T) {
		f.u.Role = "unknown"
		defer func() { f.u.Role = "viewer" }()
		if w := call("GET", "/api/events", "", "", true); w.Code != 403 {
			t.Fatal(w.Code)
		}
	})
	t.Run("expired session denied", func(t *testing.T) {
		f.expired = true
		defer func() { f.expired = false }()
		if w := call("GET", "/api/auth/me", "", "", true); w.Code != 401 {
			t.Fatal(w.Code)
		}
	})
	t.Run("cross site login denied", func(t *testing.T) {
		if w := call("POST", "/api/auth/login", `{}`, "https://evil.example", false); w.Code != 403 {
			t.Fatal(w.Code)
		}
	})
	t.Run("missing origin denied", func(t *testing.T) {
		if w := call("POST", "/api/auth/logout", `{}`, "", true); w.Code != 403 {
			t.Fatal(w.Code)
		}
	})
	t.Run("bad password rejected", func(t *testing.T) {
		if w := call("POST", "/api/auth/login", `{"email":"test@example.test","password":"bad"}`, "https://pulseops.example", false); w.Code != 401 {
			t.Fatal(w.Code)
		}
	})
	t.Run("secure session issued", func(t *testing.T) {
		w := call("POST", "/api/auth/login", `{"email":"test@example.test","password":"testing-password"}`, "https://pulseops.example", false)
		if w.Code != 200 {
			t.Fatal(w.Code)
		}
		cookies := w.Result().Cookies()
		if len(cookies) != 1 {
			t.Fatal("missing cookie")
		}
		c := cookies[0]
		if !c.Secure || !c.HttpOnly || c.SameSite != http.SameSiteStrictMode || c.Path != "/" || len(c.Value) < 40 {
			t.Fatal("unsafe session cookie")
		}
	})
	t.Run("logout revokes session", func(t *testing.T) {
		w := call("POST", "/api/auth/logout", `{}`, "https://pulseops.example", true)
		if w.Code != 204 || !f.deleted || w.Result().Cookies()[0].MaxAge != -1 {
			t.Fatal("logout failed")
		}
	})
}
