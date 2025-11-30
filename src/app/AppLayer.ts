import { Layer } from 'effect';
import { UserHandlersLive } from '../user/ui/http/UserHandlers';
import { DatabaseClientLive } from '../shared/db/client';
import { DatabaseConnectionLive } from '../shared/db/connection';
import { UserRepositoryLive } from '../user/infrastructure/UserRepository';
import { UserServiceLive } from '../user/application/UserService';

const AppLayer = UserHandlersLive.pipe(
    Layer.provide(UserServiceLive),
    Layer.provide(UserRepositoryLive),
    Layer.provide(DatabaseConnectionLive),
    Layer.provide(DatabaseClientLive),
);

export { AppLayer };