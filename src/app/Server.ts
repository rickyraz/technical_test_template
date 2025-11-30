import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from '@effect/platform';
import { AppLayer } from './app.layer';
import { BunRuntime, BunHttpServer } from "@effect/platform-bun"
import { UserApi } from '../user/ui/http/user.api';


const ServerLive = BunHttpServer.layer({ port: 3000 });

const ApiLayer = HttpApiBuilder.api(UserApi).pipe(
    Layer.provide(AppLayer)
);

const HttpLive = HttpApiBuilder.serve().pipe(
    Layer.provide(ApiLayer),
    Layer.provide(ServerLive)
);

const program = Effect.never.pipe(
    Effect.provide(HttpLive)
);

BunRuntime.runMain(program);

// Api ✓ (dari ApiLayer)
// AuthContextService ✓ (disediakan oleh withAuth per request)
// UserService, UserRepository, dll ✓ (dari AppLayer)
// HttpServer ✓ (dari ServerLive)