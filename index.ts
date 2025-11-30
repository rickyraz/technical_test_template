import { Effect } from "effect";
import { measured, viewMetrics } from "./src/shared/infra/metrics/Metrics";

console.log("Hello via Bun!");

// const myEffect = Effect.succeed(42);
const myEffect = Effect.gen(function* (_) {
    yield* _(Effect.sleep(10))
    return 42
});
const measuredEffect = measured(myEffect);

Effect.runPromise(measuredEffect).then(result => {
    console.log("Result:", result); // 42
});
// viewMetrics mungkin effect synchronous yang langsung mengembalikan object HistogramState.
Effect.runPromise(viewMetrics);


// const program = Effect.gen(function* (_) {
//     const result = yield* _(measured(myEffect));
//     console.log("Result:", result);

//     const metrics = yield* _(viewMetrics);
//     return metrics;
// });


// Effect.runPromise(
//     measuredEffect.pipe(
//         Effect.provide(MetricRegistry.layer)
//     )
// )

const hello: Effect.Effect<string> = Effect.succeed("Hello ini effect");
console.log(hello)
Effect.runPromise(hello).then(console.log); // Output: Hello World



// --  2. Synchronous vs Asynchronous

// Langsung menghasilkan nilai, tidak perlu callback atau promise.
const syncEffect = Effect.succeed(42);

Effect.runPromise(syncEffect).then(console.log); // 42

const asyncEffect = Effect.async<number, never>((resume) => {
    setTimeout(() => {
        resume(Effect.succeed(100));
    }, 1000);
});

Effect.runPromise(asyncEffect).then(console.log); // 100 (setelah 1 detik)

// Effect.sync adalah cara membuat effect yang synchronous, yang bisa melakukan side effect(misal: logging, membaca value dari variable, kalkulasi), tapi tetap dibungkus dalam Effect sehingga bisa di - compose dengan effect lain.
const effect = Effect.sync(() => {
    console.log("Ini side effect sync");
    return 400;
});

Effect.runPromise(effect).then(console.log);
// Output:
// "Ini side effect sync"
// 400