package demo

import (
	"context"
	"encoding/json"
	"github.com/jackc/pgx/v5/pgxpool"
	"net/http/httptest"
	"os"
	"reflect"
	"testing"
)

func TestDeterministicFixture(t *testing.T) {
	a, b := Generate(), Generate()
	if !reflect.DeepEqual(a, b) || len(a.Events) != 1728 || len(a.Points) != 1728 {
		t.Fatal("unstable fixture")
	}
	for i, p := range a.Points {
		if p.Errors > p.Requests || p.Latency < 0 || p.ServiceID != a.Events[i].ServiceID || p.Time != a.Events[i].Time {
			t.Fatal("inconsistent metric/event")
		}
	}
}
func TestFilterValidation(t *testing.T) {
	for _, query := range []string{"organisationId=private", "page=-1", "sort=DROP", "severity=admin", "from=invalid", "from=2026-10-20T00:00:00Z"} {
		if _, err := Parse(httptest.NewRequest("GET", "/api/demo/events?"+query, nil)); err == nil {
			t.Fatalf("accepted %s", query)
		}
	}
}
func TestFilteredPagination(t *testing.T) {
	r := httptest.NewRequest("GET", "/api/demo/events?service=checkout&severity=critical", nil)
	f, _ := Parse(r)
	w := httptest.NewRecorder()
	serve(w, r, Generate(), f)
	var body struct {
		Events []Event
		Total  int
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Total != 31 {
		t.Fatalf("critical total %d", body.Total)
	}
	for _, e := range body.Events {
		if e.ServiceID != "checkout" || e.Severity != "critical" {
			t.Fatal("filter leak")
		}
	}
}
func TestPublicReadOnly(t *testing.T) {
	for _, method := range []string{"POST", "PUT", "DELETE", "PATCH"} {
		w := httptest.NewRecorder()
		Handler(nil).ServeHTTP(w, httptest.NewRequest(method, "/api/demo/events", nil))
		if w.Code != 405 {
			t.Fatal(method, w.Code)
		}
	}
}
func TestDemoPostgres(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("dedicated PostgreSQL required")
	}
	ctx := context.Background()
	db, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err = Seed(ctx, db); err != nil {
		t.Fatal(err)
	}
	if err = Seed(ctx, db); err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/api/demo/dashboard", "/api/demo/events?service=checkout&severity=critical"} {
		w := httptest.NewRecorder()
		Handler(db).ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 200 {
			t.Fatal(w.Code, w.Body.String())
		}
	}
	w := httptest.NewRecorder()
	Handler(db).ServeHTTP(w, httptest.NewRequest("GET", "/api/demo/events?organisationId=11111111-1111-4111-8111-111111111111", nil))
	if w.Code != 400 {
		t.Fatal("tenant override accepted")
	}
}
