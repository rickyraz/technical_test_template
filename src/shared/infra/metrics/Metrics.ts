import { Context, Effect, Metric, MetricBoundaries, MetricRegistry } from "effect";

// export const requestLatency = Metric.timer("request_latency_ms", "HTTP request latency");
export const requestLatency = Metric.histogram(
    "request_latency_ms",
    MetricBoundaries.exponential({ start: 1, factor: 2, count: 10 })
);


export const measured = <R, E, A>(
    eff: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
    Effect.acquireUseRelease(
        Effect.sync(() => Date.now()),
        () => eff,
        // (start) =>
        //     Effect.sync(() => {
        //         Metric.update(requestLatency, Date.now() - start);
        //     })
        (start) =>
            Metric.update(requestLatency, Date.now() - start) // ← harus langsung return
    );

export const viewMetrics = Effect.gen(function* (_) {
    const latencySnapshot = yield* _(Metric.value(requestLatency));
    console.log("Request Latency Metrics:", latencySnapshot);
    return latencySnapshot;
});