package demo

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"
)

func TestComparisonWindowsDoNotOverlap(t *testing.T) {
	from := End.Add(-time.Hour)
	points := []Point{{Time: from, Requests: 100, Errors: 10, Latency: 10}, {Time: from.Add(5 * time.Minute), Requests: 300, Errors: 3, Latency: 50}}
	current := summarize(points, from, End)
	previous := summarize(points, from.Add(-time.Hour), from)
	if current.Requests != 300 || previous.Requests != 100 || current.ErrorRate != 1 || previous.ErrorRate != 10 {
		t.Fatal("window boundary double-counted", current, previous)
	}
	all := summarize(points, from.Add(-time.Hour), End)
	if all.MeanLatency != 40 {
		t.Fatal("mean latency is not weighted", all.MeanLatency)
	}
}

func TestServiceComparisonAndMissingBaseline(t *testing.T) {
	for _, hours := range []int{6, 24} {
		r := httptest.NewRequest("GET", "/api/demo/services/checkout", nil)
		f := Filters{From: End.Add(-time.Duration(hours) * time.Hour), To: End}
		w := httptest.NewRecorder()
		serveService(w, r, Generate(), f)
		var result struct {
			Current  WindowSummary
			Previous *WindowSummary
			Points   []Point
		}
		if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &result) != nil {
			t.Fatal(w.Code, w.Body.String())
		}
		if result.Current.Samples != hours*12 || len(result.Points) != 288 {
			t.Fatal("unexpected coverage", result.Current)
		}
		if (hours == 24) != (result.Previous == nil) {
			t.Fatal("missing baseline presented as valid")
		}
	}
}

func TestServiceValidation(t *testing.T) {
	for _, c := range []struct {
		path   string
		from   time.Time
		status int
	}{
		{"/api/demo/services/not-real", End.Add(-time.Hour), 404},
		{"/api/demo/services/checkout", End, 400},
		{"/api/demo/services/checkout", End.Add(-25 * time.Hour), 400},
		{"/api/demo/services/checkout", End.Add(-61 * time.Minute), 400},
		{"/api/demo/services/checkout?service=identity", End.Add(-time.Hour), 400},
	} {
		r := httptest.NewRequest("GET", c.path, nil)
		w := httptest.NewRecorder()
		serveService(w, r, Generate(), Filters{From: c.from, To: End})
		if w.Code != c.status {
			t.Fatal(c.path, w.Code)
		}
	}
	for _, q := range []string{"from=a&from=b", "correlation=x&correlation=y", "organisationId=x"} {
		if _, err := Parse(httptest.NewRequest("GET", "/api/demo/events?"+q, nil)); err == nil {
			t.Fatal("accepted ambiguous/tenant filter", q)
		}
	}
}

func TestRegionalCorrelationAndRecovery(t *testing.T) {
	d := Generate()
	critical, recovered := 0, 0
	for _, e := range d.Events {
		if e.Correlation != "scenario-us-east-outage" {
			continue
		}
		if e.Region != "us-east" {
			t.Fatal("wrong scenario region")
		}
		if e.Severity == "critical" {
			critical++
		}
		if e.Type == "recovery" {
			recovered++
		}
	}
	if critical != 24 || recovered != 2 {
		t.Fatal(critical, recovered)
	}
	r := httptest.NewRequest("GET", "/api/demo/events?correlation=scenario-us-east-outage", nil)
	f, err := Parse(r)
	if err != nil {
		t.Fatal(err)
	}
	w := httptest.NewRecorder()
	serve(w, r, d, f)
	var body struct {
		Total  int
		Events []Event
	}
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body.Total != 26 {
		t.Fatal("correlation not exact", body.Total)
	}
	f.Correlation = "scenario-us-east"
	w = httptest.NewRecorder()
	serve(w, r, d, f)
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body.Total != 0 {
		t.Fatal("substring matched as exact correlation")
	}
}
