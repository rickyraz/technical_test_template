import { Layer } from 'effect';
import { UserHandlersLive } from '../user/ui/http/user.handlers';
import { DatabaseClientLive } from '../shared/db/client';
import { DatabaseConnectionLive } from '../shared/db/connection';
import { UserRepositoryLive } from '../user/infrastructure/user.repository';
import { UserServiceLive } from '../user/application/user.service';

const AppLayer = UserHandlersLive.pipe(
    Layer.provide(UserServiceLive),
    Layer.provide(UserRepositoryLive),
    Layer.provide(DatabaseConnectionLive),
    Layer.provide(DatabaseClientLive),
);

export { AppLayer };