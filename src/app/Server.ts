import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from '@effect/platform';
import { AppLayer } from './AppLayer';
import { BunRuntime, BunHttpServer } from "@effect/platform-bun"
import { UserApi } from '../user/ui/http/UserApi';


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