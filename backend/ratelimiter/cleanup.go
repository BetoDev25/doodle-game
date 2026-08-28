package ratelimiter

import "time"

func (l *Limiter) StartCleanup(interval, maxAge time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			l.cleanup(maxAge)
		}
	}()
}

func (l *Limiter) cleanup(maxAge time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	threshold := now.Add(-maxAge)

	for key, counter := range l.counters {
		if counter.Reset.Before(threshold) {
			delete(l.counters, key)
		}
	}
}

func (l *Limiter) Clear() {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.counters = make(map[string]*Counter)
}
