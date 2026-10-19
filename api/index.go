package handler

import (
	"net/http"
	"pulseops/hosting"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	// Vercel adds the named rewrite capture to the query. It is transport
	// metadata, never an application filter or tenant selector.
	query := r.URL.Query()
	query.Del("path")
	r.URL.RawQuery = query.Encode()
	hosting.Serverless(w, r)
}
